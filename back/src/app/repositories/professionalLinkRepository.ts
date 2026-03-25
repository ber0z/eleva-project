import { Prisma, LinkStatus, LinkPermission } from "@prisma/client";
import { prisma } from "../lib/prismaClient";

export class ProfessionalLinkRepository {
    async findByProfessionalId(
        professionalId: number,
        filters: { status?: LinkStatus },
        pagination: { skip: number; take: number },
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? prisma;
        const where: Prisma.ProfessionalLinkWhereInput = {
            professionalId,
            ...(filters.status && { status: filters.status }),
        };
        return db.professionalLink.findMany({
            where,
            skip: pagination.skip,
            take: pagination.take,
            orderBy: { createdAt: "desc" },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        profilePicture: true,
                        birthDate: true,
                        gender: true,
                    },
                },
            },
        });
    }

    async countByProfessionalId(
        professionalId: number,
        filters: { status?: LinkStatus },
        tx?: Prisma.TransactionClient
    ): Promise<number> {
        const db = tx ?? prisma;
        return db.professionalLink.count({
            where: {
                professionalId,
                ...(filters.status && { status: filters.status }),
            },
        });
    }

    async findByProfessionalAndUser(
        professionalId: number,
        userId: number,
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? prisma;
        return db.professionalLink.findUnique({
            where: { professional_user_unique: { professionalId, userId } },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        profilePicture: true,
                        birthDate: true,
                        gender: true,
                    },
                },
            },
        });
    }

    async createLink(
        data: {
            professionalId: number;
            userId: number;
            status: LinkStatus;
            permissions: LinkPermission[];
        },
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? prisma;
        return db.professionalLink.create({ data });
    }

    async updatePermissions(
        professionalId: number,
        userId: number,
        permissions: LinkPermission[],
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? prisma;
        return db.professionalLink.update({
            where: { professional_user_unique: { professionalId, userId } },
            data: { permissions },
        });
    }

    async revokeLink(
        professionalId: number,
        userId: number,
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? prisma;
        return db.professionalLink.update({
            where: { professional_user_unique: { professionalId, userId } },
            data: { status: "revoked" },
        });
    }

    // ===================== User-side methods =====================

    async findByUserId(
        userId: number,
        filters: { status?: LinkStatus },
        pagination: { skip: number; take: number },
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? prisma;
        const where: Prisma.ProfessionalLinkWhereInput = {
            userId,
            ...(filters.status && { status: filters.status }),
        };
        return db.professionalLink.findMany({
            where,
            skip: pagination.skip,
            take: pagination.take,
            orderBy: { createdAt: "desc" },
            include: {
                professional: {
                    select: {
                        id: true,
                        name: true,
                        roles: true,
                        profilePicture: true,
                        bio: true,
                        crefNumber: true,
                        crnNumber: true,
                        contactPhone: true,
                        whatsapp: true,
                        instagram: true,
                    },
                },
            },
        });
    }

    async countByUserId(
        userId: number,
        filters: { status?: LinkStatus },
        tx?: Prisma.TransactionClient
    ): Promise<number> {
        const db = tx ?? prisma;
        return db.professionalLink.count({
            where: {
                userId,
                ...(filters.status && { status: filters.status }),
            },
        });
    }

    // ===================== Pending Permissions =====================

    async setPendingPermissions(
        professionalId: number,
        userId: number,
        pendingPermissions: LinkPermission[],
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? prisma;
        return db.professionalLink.update({
            where: { professional_user_unique: { professionalId, userId } },
            data: { pendingPermissions },
        });
    }

    async applyPendingPermissions(
        professionalId: number,
        userId: number,
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? prisma;
        const link = await db.professionalLink.findUnique({
            where: { professional_user_unique: { professionalId, userId } },
        });
        if (!link || link.pendingPermissions.length === 0) return null;
        return db.professionalLink.update({
            where: { professional_user_unique: { professionalId, userId } },
            data: {
                permissions: link.pendingPermissions,
                pendingPermissions: [],
            },
        });
    }

    async clearPendingPermissions(
        professionalId: number,
        userId: number,
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? prisma;
        return db.professionalLink.update({
            where: { professional_user_unique: { professionalId, userId } },
            data: { pendingPermissions: [] },
        });
    }
}
