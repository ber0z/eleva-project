import { NotificationRepository, CreateNotificationInput } from "../repositories/notificationRepository";
import { NotificationType, NotificationPriority } from "@prisma/client";
import { Prisma } from "@prisma/client";

export class NotificationService {
    private repo = new NotificationRepository();

    async createForProfessional(
        professionalId: number,
        data: {
            type: NotificationType;
            title: string;
            body?: string;
            data?: Prisma.InputJsonValue;
            priority?: NotificationPriority;
            actorUserId?: number;
        },
        tx?: Prisma.TransactionClient
    ) {
        const input: CreateNotificationInput = {
            professionalId,
            type: data.type,
            title: data.title,
            body: data.body,
            data: data.data,
            priority: data.priority,
            actorUserId: data.actorUserId,
        };
        return this.repo.create(input, tx);
    }

    async createForUser(
        userId: number,
        data: {
            type: NotificationType;
            title: string;
            body?: string;
            data?: Prisma.InputJsonValue;
            priority?: NotificationPriority;
            actorProfessionalId?: number;
        },
        tx?: Prisma.TransactionClient
    ) {
        const input: CreateNotificationInput = {
            userId,
            type: data.type,
            title: data.title,
            body: data.body,
            data: data.data,
            priority: data.priority,
            actorProfessionalId: data.actorProfessionalId,
        };
        return this.repo.create(input, tx);
    }

    async listForProfessional(
        professionalId: number,
        filters: { read?: "true" | "false" },
        pagination: { page: number; perPage: number }
    ) {
        const skip = (pagination.page - 1) * pagination.perPage;
        const [data, total] = await Promise.all([
            this.repo.findByProfessionalId(professionalId, filters, {
                skip,
                take: pagination.perPage,
            }),
            this.repo.countByProfessionalId(professionalId, filters),
        ]);
        return {
            data,
            meta: {
                page: pagination.page,
                perPage: pagination.perPage,
                total,
                totalPages: Math.ceil(total / pagination.perPage),
            },
        };
    }

    async markAsRead(id: number, professionalId: number) {
        return this.repo.markAsRead(id, professionalId);
    }

    async markAllAsRead(professionalId: number) {
        return this.repo.markAllAsRead(professionalId);
    }

    async countUnread(professionalId: number) {
        return this.repo.countUnread(professionalId);
    }

    // ===================== User methods =====================

    async listForUser(
        userId: number,
        filters: { read?: "true" | "false" },
        pagination: { page: number; perPage: number }
    ) {
        const skip = (pagination.page - 1) * pagination.perPage;
        const [data, total] = await Promise.all([
            this.repo.findByUserId(userId, filters, {
                skip,
                take: pagination.perPage,
            }),
            this.repo.countByUserId(userId, filters),
        ]);
        return {
            data,
            meta: {
                page: pagination.page,
                perPage: pagination.perPage,
                total,
                totalPages: Math.ceil(total / pagination.perPage),
            },
        };
    }

    async markAsReadForUser(id: number, userId: number) {
        return this.repo.markAsReadForUser(id, userId);
    }

    async markAllAsReadForUser(userId: number) {
        return this.repo.markAllAsReadForUser(userId);
    }

    async countUnreadForUser(userId: number) {
        return this.repo.countUnreadForUser(userId);
    }
}
