// src/app/services/shareService.ts
// import crypto from "crypto";
import { ShareType } from "@prisma/client";
import { intervalToDuration } from "date-fns";
import { presignR2Get } from "./r2Service";
import { ShareLinkRepository } from "../repositories/shareRepository";
import type { TokenOrUsername } from "../schemas/shareSchema";

const WEB_BASE_URL = (process.env.WEB_BASE_URL ?? "http://localhost:3001").replace(/\/+$/, "");

type NotFound = { status: 404; body: { error: string } };
type Ok<T> = { status: 200; body: T };
type ResolveResult<T> = Ok<T> | NotFound;

type SubjectKind = "public" | "token";

type ImageOut = { position: number; url: string };

type PublicUserOut = { name: string | null; username: string | null; avatarUrl?: string | null };

type EvolutionCore = {
  date: Date;
  goal: string;
  height: number;
  weight: number;
  rightBiceps: number | null;
  leftBiceps: number | null;
  rightThigh: number | null;
  leftThigh: number | null;
  waist: number | null;
  hips: number | null;
  chest: number | null;
  message: string | null;
};

type PublicEvolutionOut = EvolutionCore & { images: ImageOut[] };

type ProfilePayloadOut = {
  kind: SubjectKind;
  expiresAt: Date | null;
  user: { name: string | null; username: string | null; avatarUrl: string | null };
  latestEvolution: (Omit<EvolutionCore, "message"> & { message: string | null; images: ImageOut[] }) | null;
};

type EvolutionSharePayloadOut = {
  expiresAt: Date | null;
  user: PublicUserOut;
  evolution: PublicEvolutionOut;
};



type ShareLinkListItem = {
  id: number;
  type: ShareType;
  includeImages: boolean;
  status: "active" | "expired" | "revoked" | "inactive";
  expiresAt: Date | null;
  revokedAt: Date | null;
  viewsCount: number;
  createdAt: Date;
  updatedAt: Date;
  target: { evolutionId?: number | null; evolutionAId?: number | null; evolutionBId?: number | null };
};

// function sha256(input: string) {
//   return crypto.createHash("sha256").update(input).digest("hex");
// }

function isExpired(expiresAt: Date | null | undefined) {
  return !!expiresAt && expiresAt.getTime() <= Date.now();
}

function extractImages(rows: unknown): Array<{ position: number; path: string }> {
  if (!rows || typeof rows !== "object") return [];
  const raw = (rows as Record<string, unknown>)["EvolutionImages"];
  if (!Array.isArray(raw)) return [];

  const out: Array<{ position: number; path: string }> = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const position = r["position"];
    const path = r["path"];
    if (typeof position === "number" && typeof path === "string") out.push({ position, path });
  }
  return out;
}

async function presignImages(rows: Array<{ position: number; path: string }>, ttl = 900): Promise<ImageOut[]> {
  return Promise.all(
    rows.map(async (img) => ({
      position: img.position,
      url: await presignR2Get(img.path, ttl),
    }))
  );
}

export class ShareLinkService {
  constructor(private readonly shareRepo = new ShareLinkRepository()) { }

  /* ------------------------- PROFILE (token or /u/:username) ------------------------- */

  async createProfileShareLink(opts: { ownerId: number; ttlMinutes: number; includeImages: boolean }) {
    const { ownerId, ttlMinutes, includeImages } = opts;

    const cfg = await this.shareRepo.getProfileShareConfig(ownerId);
    if (!cfg) throw new Error("Usuário não encontrado");

    const username = cfg.username?.trim().toLowerCase() ?? null;

    // ✅ perfil público => link amigável /u/:username (sem token)
    if (cfg.isProfilePublic && username) {
      // se quiser sempre retornar /u mesmo assim, remova esse if e retorne direto
      return { url: `${WEB_BASE_URL}/u/${username}`, expiresAt: null };
      // caso contrário: cai pro token para respeitar includeImages por-link
    }

    // ✅ privado (ou sem username, ou config diferente) => token
    const { hash, expiresAt } = await this.shareRepo.createProfileShareToken({
      ownerId,
      ttlMinutes,
      includeImages,
    });

    return { url: `${WEB_BASE_URL}/u/${hash}`, expiresAt };
  }

  async resolveProfileShare(params: TokenOrUsername): Promise<ResolveResult<ProfilePayloadOut>> {
    if ("token" in params) return this.resolveTokenProfile(params.token);
    return this.resolveUsernameProfile(params.username);
  }

  private async resolveTokenProfile(token: string): Promise<ResolveResult<ProfilePayloadOut>> {
    const link = await this.shareRepo.findShareLinkByTokenHash(token);

    if (!link || link.type !== ShareType.PROFILE) return { status: 404, body: { error: "Link inválido ou expirado" } };
    if (!link.isActive || link.revokedAt || isExpired(link.expiresAt)) return { status: 404, body: { error: "Link inválido ou expirado" } };

    void this.shareRepo.incrementViews(link.id).catch(() => { });
    const payload = await this.composeProfilePayload(link.ownerId, "token", link.expiresAt ?? null, !!link.includeImages);

    return { status: 200, body: payload };
  }

  private async resolveUsernameProfile(username: string): Promise<ResolveResult<ProfilePayloadOut>> {
    // precisa do método findPublicProfileByUsername no repository (snippet acima)
    const user = await this.shareRepo.findPublicProfileByUsername(username);
    if (!user) return { status: 404, body: { error: "Perfil não público" } };

    const payload = await this.composeProfilePayload(
      user.id,
      "public",
      null,
      !!user.isProfileImagesPublic,
      { id: user.id, name: user.name, username: user.username, profilePicture: user.profilePicture }
    );

    return { status: 200, body: payload };
  }

  private async composeProfilePayload(
    userId: number,
    kind: SubjectKind,
    expiresAt: Date | null,
    includeImages: boolean,
    userPrefetch?: { id: number; name: string | null; username: string | null; profilePicture: string | null }
  ): Promise<ProfilePayloadOut> {
    const [user, latest] = await Promise.all([
      userPrefetch ?? this.shareRepo.getUserPublicBasic(userId),
      this.shareRepo.getLatestEvolutionWithImages(userId, includeImages),
    ]);

    if (!user) throw new Error("Usuário não encontrado");

    const avatarUrl = user.profilePicture ? await presignR2Get(user.profilePicture, 900) : null;

    if (!latest) {
      return {
        kind,
        expiresAt,
        user: { name: user.name, username: user.username, avatarUrl },
        latestEvolution: null,
      };
    }

    const imgs = includeImages ? extractImages(latest) : [];
    const images = includeImages ? await presignImages(imgs, 900) : [];

    const { EvolutionImages: _EvolutionImages, ...rest } = latest as Record<string, unknown>;
    // “rest” já tem date/goal/height/.../message (sem id)
    return {
      kind,
      expiresAt,
      user: { name: user.name, username: user.username, avatarUrl },
      latestEvolution: { ...(rest as EvolutionCore), images },
    };
  }

  /* ------------------------- EVOLUTION ------------------------- */

  async createEvolutionShareLink(opts: {
    ownerId: number;
    evolutionId: number;
    ttlMinutes: number;
    includeImages: boolean;
  }) {
    const { hash, expiresAt } = await this.shareRepo.createEvolutionShareToken(opts);
    return { url: `${WEB_BASE_URL}/s/e/${hash}`, expiresAt };
  }

  async resolveEvolutionShare(token: string): Promise<ResolveResult<EvolutionSharePayloadOut>> {

    const link = await this.shareRepo.findShareLinkByTokenHash(token);

    if (!link || link.type !== ShareType.EVOLUTION) return { status: 404, body: { error: "Link inválido ou expirado" } };
    if (!link.isActive || link.revokedAt || isExpired(link.expiresAt)) return { status: 404, body: { error: "Link inválido ou expirado" } };
    if (!link.evolutionId) return { status: 404, body: { error: "Destino inválido" } };

    void this.shareRepo.incrementViews(link.id).catch(() => { });
    const includeImages = !!link.includeImages;

    const [user, evo] = await Promise.all([
      this.shareRepo.getUserPublicBasic(link.ownerId),
      this.shareRepo.getEvolutionForShare(link.ownerId, link.evolutionId, includeImages),
    ]);

    if (!evo) return { status: 404, body: { error: "Evolução não encontrada" } };

    const images = includeImages ? await presignImages(extractImages(evo), 900) : [];
    const { id: _id, idUser: _idUser, createdAt: _c, updatedAt: _u, EvolutionImages: _ei, ...rest } =
      evo as unknown as Record<string, unknown>;

    return {
      status: 200,
      body: {
        expiresAt: link.expiresAt ?? null,
        user: { name: user?.name ?? null, username: user?.username ?? null },
        evolution: {
          ...(rest as EvolutionCore),
          images,
        },
      },
    };
  }

  /* ------------------------- COMPARISON ------------------------- */

  async createCompareShareLink(opts: {
    ownerId: number;
    evolutionAId: number;
    evolutionBId: number;
    ttlMinutes: number;
    includeImages: boolean;
  }) {
    const { hash, expiresAt } = await this.shareRepo.createComparisonShareToken(opts);
    return { url: `${WEB_BASE_URL}/s/c/${hash}`, expiresAt };
  }

  async resolveCompareShare(token: string) {
    const link = await this.shareRepo.findShareLinkByTokenHash(token);

    if (!link || link.type !== ShareType.COMPARISON) return { status: 404, body: { error: "Link inválido ou expirado" } };
    if (!link.isActive || link.revokedAt || isExpired(link.expiresAt)) return { status: 404, body: { error: "Link inválido ou expirado" } };
    if (!link.evolutionAId || !link.evolutionBId) return { status: 404, body: { error: "Destino inválido" } };

    void this.shareRepo.incrementViews(link.id).catch(() => { });
    const includeImages = !!link.includeImages;

    const [user, e1, e2] = await Promise.all([
      this.shareRepo.getUserPublicBasic(link.ownerId),
      this.shareRepo.getEvolutionForShare(link.ownerId, link.evolutionAId, includeImages),
      this.shareRepo.getEvolutionForShare(link.ownerId, link.evolutionBId, includeImages),
    ]);

    if (!e1 || !e2) return { status: 404, body: { error: "Evolution não encontrada" } };

    // imagens
    const [images1, images2] = includeImages
      ? await Promise.all([presignImages(extractImages(e1), 900), presignImages(extractImages(e2), 900)])
      : [[], []];

    // tira campos internos + tira id da evolution na saída
    const toPublic = (e: unknown, images: ImageOut[]): PublicEvolutionOut => {
      const obj = e as Record<string, unknown>;
      const { id: _id, idUser: _idUser, createdAt: _c, updatedAt: _u, EvolutionImages: _ei, ...rest } = obj;
      return { ...(rest as EvolutionCore), images };
    };

    const evo1 = toPublic(e1, images1);
    const evo2 = toPublic(e2, images2);

    // differences (sem index signature error)
    const fields = ["height", "weight", "rightBiceps", "leftBiceps", "rightThigh", "leftThigh", "waist", "hips", "chest"] as const;
    type DiffField = (typeof fields)[number];
    type DateDiff = { years: number; months: number; days: number };

    const diffs = {} as Record<DiffField, number | null> & { dateDifference: DateDiff };
    for (const f of fields) {
      const v1 = evo1[f];
      const v2 = evo2[f];
      diffs[f] = typeof v1 === "number" && typeof v2 === "number" ? v2 - v1 : null;
    }

    const start = evo1.date <= evo2.date ? evo1.date : evo2.date;
    const end = evo1.date <= evo2.date ? evo2.date : evo1.date;
    const dur = intervalToDuration({ start, end });

    const differences = {
      ...diffs,
      dateDifference: { years: dur.years ?? 0, months: dur.months ?? 0, days: dur.days ?? 0 },
    };

    return {
      status: 200,
      body: {
        expiresAt: link.expiresAt ?? null,
        user: { name: user?.name ?? null, username: user?.username ?? null },
        evolution1: evo1,
        evolution2: evo2,
        differences,
      },
    };
  }

  /* ------------------------- LIST / DELETE ------------------------- */

  async listMyShareLinks(ownerId: number): Promise<ShareLinkListItem[]> {
    const rows = await this.shareRepo.listOwnerShareLinks(ownerId);
    const now = Date.now();

    return rows.map((r) => {
      let status: ShareLinkListItem["status"] = "inactive";
      if (r.revokedAt) status = "revoked";
      else if (!r.isActive) status = "inactive";
      else if (r.expiresAt && r.expiresAt.getTime() <= now) status = "expired";
      else status = "active";

      return {
        id: r.id,
        tokenHash: r.tokenHash,
        type: r.type,
        includeImages: r.includeImages,
        status,
        expiresAt: r.expiresAt,
        revokedAt: r.revokedAt,
        viewsCount: r.viewsCount,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        target: { evolutionId: r.evolutionId, evolutionAId: r.evolutionAId, evolutionBId: r.evolutionBId },
      };
    });
  }

  async deleteMyShareLink(ownerId: number, shareId: number): Promise<ResolveResult<{ ok: true }>> {
    const count = await this.shareRepo.deleteOwnerShareLink(ownerId, shareId);
    if (count === 0) return { status: 404, body: { error: "Compartilhamento não encontrado" } };
    return { status: 200, body: { ok: true } };
  }
}
