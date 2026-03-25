import { Prisma, InviteStatus, LinkPermission } from "@prisma/client";
import { prisma } from "../lib/prismaClient";

export class ProfessionalInviteRepository {
    async create(
        data: {
            professionalId: number;
            inviteeEmail?: string | null;
            inviteePhone?: string | null;
            userId?: number | null;
            code: string;
            token: string;
            expiresAt: Date;
            message?: string | null;
            permissions: LinkPermission[];
        },
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? prisma;
        return db.professionalInvite.create({ data });
    }

    async findByProfessionalId(
        professionalId: number,
        filters: { status?: InviteStatus },
        pagination: { skip: number; take: number },
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? prisma;
        return db.professionalInvite.findMany({
            where: {
                professionalId,
                ...(filters.status && { status: filters.status }),
            },
            skip: pagination.skip,
            take: pagination.take,
            orderBy: { createdAt: "desc" },
            include: {
                user: {
                    select: { id: true, name: true, profilePicture: true },
                },
            },
        });
    }

    async countByProfessionalId(
        professionalId: number,
        filters: { status?: InviteStatus },
        tx?: Prisma.TransactionClient
    ): Promise<number> {
        const db = tx ?? prisma;
        return db.professionalInvite.count({
            where: {
                professionalId,
                ...(filters.status && { status: filters.status }),
            },
        });
    }

    async findById(
        id: number,
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? prisma;
        return db.professionalInvite.findUnique({
            where: { id },
            include: {
                professional: { select: { id: true, name: true } },
                user: { select: { id: true, name: true, profilePicture: true } },
            },
        });
    }

    async findByToken(
        token: string,
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? prisma;
        return db.professionalInvite.findUnique({
            where: { token },
            include: {
                professional: { select: { id: true, name: true } },
            },
        });
    }

    async updateStatus(
        id: number,
        status: InviteStatus,
        extra?: { acceptedAt?: Date; userId?: number },
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? prisma;
        return db.professionalInvite.update({
            where: { id },
            data: {
                status,
                ...(extra?.acceptedAt && { acceptedAt: extra.acceptedAt }),
                ...(extra?.userId && { userId: extra.userId }),
            },
        });
    }

    async findExistingPending(
        professionalId: number,
        inviteeEmail?: string | null,
        inviteePhone?: string | null,
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? prisma;
        const orConditions: Prisma.ProfessionalInviteWhereInput[] = [];
        if (inviteeEmail) orConditions.push({ inviteeEmail });
        if (inviteePhone) orConditions.push({ inviteePhone });
        if (orConditions.length === 0) return null;

        return db.professionalInvite.findFirst({
            where: {
                professionalId,
                status: "pending",
                OR: orConditions,
            },
        });
    }

    async countPendingByProfessional(
        professionalId: number,
        tx?: Prisma.TransactionClient
    ): Promise<number> {
        const db = tx ?? prisma;
        return db.professionalInvite.count({
            where: { professionalId, status: "pending" },
        });
    }

    // ===================== User-side methods =====================

    async findPendingByEmail(
        email: string,
        pagination: { skip: number; take: number },
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? prisma;
        return db.professionalInvite.findMany({
            where: {
                inviteeEmail: email,
                status: "pending",
                expiresAt: { gt: new Date() },
            },
            skip: pagination.skip,
            take: pagination.take,
            orderBy: { createdAt: "desc" },
            include: {
                professional: {
                    select: { id: true, name: true, roles: true, profilePicture: true },
                },
            },
        });
    }

    async countPendingByEmail(
        email: string,
        tx?: Prisma.TransactionClient
    ): Promise<number> {
        const db = tx ?? prisma;
        return db.professionalInvite.count({
            where: {
                inviteeEmail: email,
                status: "pending",
                expiresAt: { gt: new Date() },
            },
        });
    }
}
