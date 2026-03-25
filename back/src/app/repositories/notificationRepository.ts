import { Prisma, NotificationType, NotificationPriority } from "@prisma/client";
import { prisma } from "../lib/prismaClient";

export type CreateNotificationInput = {
    userId?: number | null;
    professionalId?: number | null;
    type: NotificationType;
    title: string;
    body?: string | null;
    data?: Prisma.InputJsonValue;
    priority?: NotificationPriority;
    actorProfessionalId?: number | null;
    actorUserId?: number | null;
};

export class NotificationRepository {
    async create(
        data: CreateNotificationInput,
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? prisma;
        return db.notification.create({ data });
    }

    async findByProfessionalId(
        professionalId: number,
        filters: { read?: "true" | "false" },
        pagination: { skip: number; take: number },
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? prisma;
        const readFilter: Prisma.NotificationWhereInput =
            filters.read === "true"
                ? { readAt: { not: null } }
                : filters.read === "false"
                  ? { readAt: null }
                  : {};

        return db.notification.findMany({
            where: { professionalId, ...readFilter },
            skip: pagination.skip,
            take: pagination.take,
            orderBy: { createdAt: "desc" },
            include: {
                actorUser: { select: { id: true, name: true } },
            },
        });
    }

    async countByProfessionalId(
        professionalId: number,
        filters: { read?: "true" | "false" },
        tx?: Prisma.TransactionClient
    ): Promise<number> {
        const db = tx ?? prisma;
        const readFilter: Prisma.NotificationWhereInput =
            filters.read === "true"
                ? { readAt: { not: null } }
                : filters.read === "false"
                  ? { readAt: null }
                  : {};

        return db.notification.count({
            where: { professionalId, ...readFilter },
        });
    }

    async markAsRead(
        id: number,
        professionalId: number,
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? prisma;
        return db.notification.updateMany({
            where: { id, professionalId, readAt: null },
            data: { readAt: new Date() },
        });
    }

    async markAllAsRead(
        professionalId: number,
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? prisma;
        return db.notification.updateMany({
            where: { professionalId, readAt: null },
            data: { readAt: new Date() },
        });
    }

    async countUnread(
        professionalId: number,
        tx?: Prisma.TransactionClient
    ): Promise<number> {
        const db = tx ?? prisma;
        return db.notification.count({
            where: { professionalId, readAt: null },
        });
    }

    // ===================== User methods =====================

    async findByUserId(
        userId: number,
        filters: { read?: "true" | "false" },
        pagination: { skip: number; take: number },
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? prisma;
        const readFilter: Prisma.NotificationWhereInput =
            filters.read === "true"
                ? { readAt: { not: null } }
                : filters.read === "false"
                  ? { readAt: null }
                  : {};

        return db.notification.findMany({
            where: { userId, ...readFilter },
            skip: pagination.skip,
            take: pagination.take,
            orderBy: { createdAt: "desc" },
            include: {
                actorPro: { select: { id: true, name: true } },
            },
        });
    }

    async countByUserId(
        userId: number,
        filters: { read?: "true" | "false" },
        tx?: Prisma.TransactionClient
    ): Promise<number> {
        const db = tx ?? prisma;
        const readFilter: Prisma.NotificationWhereInput =
            filters.read === "true"
                ? { readAt: { not: null } }
                : filters.read === "false"
                  ? { readAt: null }
                  : {};

        return db.notification.count({
            where: { userId, ...readFilter },
        });
    }

    async markAsReadForUser(
        id: number,
        userId: number,
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? prisma;
        return db.notification.updateMany({
            where: { id, userId, readAt: null },
            data: { readAt: new Date() },
        });
    }

    async markAllAsReadForUser(
        userId: number,
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? prisma;
        return db.notification.updateMany({
            where: { userId, readAt: null },
            data: { readAt: new Date() },
        });
    }

    async countUnreadForUser(
        userId: number,
        tx?: Prisma.TransactionClient
    ): Promise<number> {
        const db = tx ?? prisma;
        return db.notification.count({
            where: { userId, readAt: null },
        });
    }
}
