import { Prisma, AuthSubjectType, PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prismaClient";
import { timingSafeEqual } from "crypto";
// import { hashToken } from "../utils/tokenUtils";


type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];
export type SubjectType = "user" | "professional" | "admin";

// mapeia subjectType/id para o where correto
function whereBySubject(subjectType: SubjectType, subjectId: number): Prisma.AuthenticationWhereInput {
  if (subjectType === "user")          return { idUser: subjectId,          subjectType: "user" };
  if (subjectType === "professional")  return { idProfessional: subjectId,  subjectType: "professional" };
  return                                 { idAdmin: subjectId,              subjectType: "admin" };
}

// DTO para criação de uma autenticação
export interface CreateAuthenticationDTO {
  subjectType: AuthSubjectType;
  idUser?: number;
  idProfessional?: number;
  idAdmin?: number;
  email: string;
  password: string;
  refreshToken: string;
  recoveryCode?: string | null;
  lastAccess: Date;
}

export type CreateAuthenticationInput = {
  subjectType: AuthSubjectType; // "user" | "professional" | "admin"
  idUser?: number | null;
  idProfessional?: number | null;
  idAdmin?: number | null;

  email: string;          // único global
  password: string;       // hash
  refreshToken: string;   // idealmente hash
  recoveryCode?: string | null;
  recoveryCodeExpiresAt?: Date | null;
  lastAccess: Date;
};

const isHex64 = (s?: string | null) => !!s && /^[0-9a-f]{64}$/i.test(s);
const safeEqHex = (a?: string | null, b?: string | null) => {
  if (!isHex64(a) || !isHex64(b)) return false;
  const A = Buffer.from(a!, "hex");
  const B = Buffer.from(b!, "hex");
  return A.length === B.length && timingSafeEqual(A, B);
};

export class AuthenticationRepository {

  async createAuthentication(
    data: CreateAuthenticationDTO,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? prisma;
    return client.authentication.create({
      data,
    });
  }

  async updateRefreshToken(
    authId: number,
    tokenHash: string,                        // já vem hasheado
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const client = tx ?? prisma;
    await client.authentication.update({
      where: { id: authId },
      data: { refreshToken: tokenHash },      // persiste o HASH
    });
  }

  async findAuthenticationByEmail(
    email: string,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? prisma;
    return client.authentication.findUnique({
      where: { email },
    });
  }

  async updateRecoveryCode(id: number, recoveryCode: string | null) {
    return prisma.authentication.update({
      where: { id }, // Usa id como chave única
      data: {
        recoveryCode,
        recoveryCodeExpiresAt: recoveryCode ? new Date(Date.now() + 5 * 60 * 1000) : null,
      },
    });
  }

  async updatePassword(
    id: number, // Usando id único para a autenticação
    newPassword: string,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? prisma;
    return client.authentication.update({
      where: { id }, // Usando id único aqui
      data: { password: newPassword },
    });
  }

  async isRefreshTokenValidByAuthId(
    authId: number,
    tokenHash: string,                        // compare sempre hash vs hash
    tx?: Prisma.TransactionClient
  ): Promise<boolean> {
    const client = tx ?? prisma;
    const rec = await client.authentication.findUnique({
      where: { id: authId },
      select: { refreshToken: true },         // armazenado como HASH (hex)
    });
    if (!rec?.refreshToken) return false;

    // ambas strings devem ser hex de mesmo tamanho (64 chars para SHA-256)
    return safeEqHex(rec.refreshToken, tokenHash);
  }

 async isSubjectBlocked(tx: Tx, subjectType: SubjectType, subjectId: number) {
    const row = await tx.authentication.findFirst({
      where: { ...whereBySubject(subjectType, subjectId), isBlocked: true },
      select: { id: true },
    });
    return !!row;
  }

  async setBlockedBySubject(
    tx: Tx,
    subjectType: SubjectType,
    subjectId: number,
    block: boolean
  ) {
    return tx.authentication.updateMany({
      where: whereBySubject(subjectType, subjectId),
      data: {
        isBlocked: block,
        refreshToken: "",
      },
    });
  }

  async getBlockedByAuthId(tx: Tx, authId: number) {
    const row = await tx.authentication.findUnique({
      where: { id: authId },
      select: { isBlocked: true },
    });
    return row?.isBlocked ?? false;
  }

}
