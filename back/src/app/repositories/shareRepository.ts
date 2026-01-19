// src/app/repositories/shareRepository.ts
import { Prisma, PrismaClient, ShareType } from "@prisma/client";
import crypto from "crypto";
import { prisma as defaultPrisma } from "../lib/prismaClient";

export class ShareLinkRepository {
  constructor(private readonly db: PrismaClient = defaultPrisma) { }

  /* -------------------- helpers -------------------- */

  private client(tx?: Prisma.TransactionClient) {
    return tx ?? this.db;
  }

  private normalizePair(a: number, b: number) {
    return a < b ? ([a, b] as const) : ([b, a] as const);
  }

  private ttlToExpiresAt(ttlMinutes: number) {
    return ttlMinutes > 0 ? new Date(Date.now() + ttlMinutes * 60_000) : null;
  }

  static generateToken(): { token: string; hash: string } {
    const token = crypto.randomBytes(24).toString("hex"); // 48 chars
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    return { token, hash };
  }

  /* -------------------- common -------------------- */

  async findShareLinkByTokenHash(tokenHash: string, tx?: Prisma.TransactionClient) {
    console.log(tokenHash);
    
    const client = this.client(tx);
    return client.shareLink.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        type: true,
        ownerId: true,

        includeImages: true,
        isActive: true,
        revokedAt: true,
        expiresAt: true,
        viewsCount: true,

        // targets (todos num lugar só)
        evolutionId: true,
        evolutionAId: true,
        evolutionBId: true,
      },
    });
  }

  async incrementViews(id: number, tx?: Prisma.TransactionClient) {
    const client = this.client(tx);
    return client.shareLink.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
      select: { id: true },
    });
  }

  async listOwnerShareLinks(ownerId: number, tx?: Prisma.TransactionClient) {
    const client = this.client(tx);
    return client.shareLink.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        includeImages: true,
        isActive: true,
        revokedAt: true,
        expiresAt: true,
        viewsCount: true,
        createdAt: true,
        updatedAt: true,
        tokenHash: true,
        evolutionId: true,
        evolutionAId: true,
        evolutionBId: true,
      },
    });
  }

  async deleteOwnerShareLink(ownerId: number, shareId: number, tx?: Prisma.TransactionClient) {
    const client = this.client(tx);
    const res = await client.shareLink.deleteMany({
      where: { id: shareId, ownerId },
    });
    return res.count; // 0 ou 1
  }

  /* -------------------- user/evolution fetchers (para resolve) -------------------- */

  async getUserPublicBasic(ownerId: number, tx?: Prisma.TransactionClient) {
    const client = this.client(tx);
    return client.user.findUnique({
      where: { id: ownerId },
      select: { name: true, username: true, profilePicture: true},
    });
  }

  async getEvolutionForShare(
    ownerId: number,
    evolutionId: number,
    includeImages: boolean,
    tx?: Prisma.TransactionClient
  ) {
    const client = this.client(tx);

    return client.evolution.findFirst({
      where: { id: evolutionId, idUser: ownerId },
      select: {
        // (use id internamente se precisar; no payload você pode omitir)
        id: true,
        date: true,
        goal: true,
        height: true,
        weight: true,
        rightBiceps: true,
        leftBiceps: true,
        rightThigh: true,
        leftThigh: true,
        waist: true,
        hips: true,
        chest: true,
        shoulder: true,
        calf: true,
        forearm: true,

        EvolutionImages: includeImages
          ? { select: { id: true, position: true, path: true } }
          : false as const,
      },
    });
  }

  /* -------------------- PROFILE share -------------------- */

  async findPublicProfileByUsername(username: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.db;
    return client.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" }, isProfilePublic: true },
      select: { id: true, name: true, username: true, profilePicture: true, isProfileImagesPublic: true },
    });
  }

  async deleteProfileLinksForOwner(ownerId: number, tx?: Prisma.TransactionClient) {
    const client = this.client(tx);
    await client.shareLink.deleteMany({
      where: { ownerId, type: ShareType.PROFILE },
    });
  }

  async createProfileShareToken(opts: {
    ownerId: number;
    ttlMinutes: number;
    includeImages: boolean;
  }) {
    const { ownerId, ttlMinutes, includeImages } = opts;
    const { hash } = ShareLinkRepository.generateToken();
    const expiresAt = this.ttlToExpiresAt(ttlMinutes);

    await this.db.$transaction(async (tx) => {
      await this.deleteProfileLinksForOwner(ownerId, tx);
      await this.client(tx).shareLink.create({
        data: {
          type: ShareType.PROFILE,
          ownerId,
          tokenHash: hash,
          expiresAt,
          includeImages,
          isActive: true,
        },
        select: { id: true },
      });
    });

    return { hash, expiresAt };
  }

  async getProfileShareConfig(ownerId: number, tx?: Prisma.TransactionClient) {
  const client = tx ?? this.db;
  return client.user.findUnique({
    where: { id: ownerId },
    select: {
      username: true,
      isProfilePublic: true,
      isProfileImagesPublic: true, // se existir no model
    },
  });
}

  /* -------------------- EVOLUTION share -------------------- */

  async deleteExistingEvolutionLinks(ownerId: number, evolutionId: number, tx?: Prisma.TransactionClient) {
    const client = this.client(tx);
    await client.shareLink.deleteMany({
      where: { ownerId, type: ShareType.EVOLUTION, evolutionId },
    });
  }

  async createEvolutionShareToken(opts: {
    ownerId: number;
    evolutionId: number;
    ttlMinutes: number;
    includeImages: boolean;
  }) {
    const { ownerId, evolutionId, ttlMinutes, includeImages } = opts;

    // valida ownership aqui (repository é o único que toca no DB)
    const exists = await this.db.evolution.findFirst({
      where: { id: evolutionId, idUser: ownerId },
      select: { id: true },
    });
    if (!exists) throw new Error("Evolução não encontrada");

    const { hash } = ShareLinkRepository.generateToken();
    const expiresAt = this.ttlToExpiresAt(ttlMinutes);

    await this.db.$transaction(async (tx) => {
      await this.deleteExistingEvolutionLinks(ownerId, evolutionId, tx);
      await this.client(tx).shareLink.create({
        data: {
          type: ShareType.EVOLUTION,
          ownerId,
          evolutionId,
          tokenHash: hash,
          expiresAt,
          includeImages,
          isActive: true,
        },
        select: { id: true },
      });
    });

    return { hash, expiresAt };
  }

  async getLatestEvolutionWithImages(
  userId: number,
  includeImages: boolean,
  tx?: Prisma.TransactionClient
) {
  const client = tx ?? this.db;

  return client.evolution.findFirst({
    where: { idUser: userId },
    orderBy: [{ date: "desc" }, { id: "desc" }],
    select: {
      date: true,
      goal: true,
      height: true,
      weight: true,
      rightBiceps: true,
      leftBiceps: true,
      rightThigh: true,
      leftThigh: true,
      waist: true,
      hips: true,
      chest: true,
      createdAt: true,
      updatedAt: true,

      EvolutionImages: includeImages
        ? { select: { position: true, path: true } }
        : false,
    },
  });
}

  /* -------------------- COMPARISON share -------------------- */

  async deleteExistingComparisonLinks(
    ownerId: number,
    evoAId: number,
    evoBId: number,
    tx?: Prisma.TransactionClient
  ) {
    const client = this.client(tx);
    const [a, b] = this.normalizePair(evoAId, evoBId);

    await client.shareLink.deleteMany({
      where: {
        ownerId,
        type: ShareType.COMPARISON,
        OR: [
          { evolutionAId: a, evolutionBId: b },
          { evolutionAId: b, evolutionBId: a },
        ],
      },
    });
  }

  async createComparisonShareToken(opts: {
    ownerId: number;
    evolutionAId: number;
    evolutionBId: number;
    ttlMinutes: number;
    includeImages: boolean;
  }) {
    const { ownerId, evolutionAId, evolutionBId, ttlMinutes, includeImages } = opts;

    // valida ownership das duas (repository)
    const [e1, e2] = await Promise.all([
      this.db.evolution.findFirst({ where: { id: evolutionAId, idUser: ownerId }, select: { id: true } }),
      this.db.evolution.findFirst({ where: { id: evolutionBId, idUser: ownerId }, select: { id: true } }),
    ]);
    if (!e1 || !e2) throw new Error("Evolution não encontrada ou não pertence ao usuário");

    const { hash } = ShareLinkRepository.generateToken();
    const expiresAt = this.ttlToExpiresAt(ttlMinutes);
    const [a, b] = this.normalizePair(evolutionAId, evolutionBId);

    await this.db.$transaction(async (tx) => {
      await this.deleteExistingComparisonLinks(ownerId, a, b, tx);
      await this.client(tx).shareLink.create({
        data: {
          type: ShareType.COMPARISON,
          ownerId,
          evolutionAId: a,
          evolutionBId: b,
          tokenHash: hash,
          expiresAt,
          includeImages,
          isActive: true,
        },
        select: { id: true },
      });
    });

    return { hash, expiresAt, evolutionAId: a, evolutionBId: b };
  }
}
