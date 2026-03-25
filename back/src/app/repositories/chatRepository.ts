import { Prisma, MessageSenderType } from "@prisma/client";
import { prisma } from "../lib/prismaClient";

export class ChatRepository {
    async findOrCreateConversation(
        professionalId: number,
        userId: number,
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? prisma;
        return db.conversation.upsert({
            where: {
                professionalId_userId: { professionalId, userId },
            },
            create: { professionalId, userId },
            update: {},
        });
    }

    async findConversationById(
        id: number,
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? prisma;
        return db.conversation.findUnique({ where: { id } });
    }

    async listConversationsForUser(
        userId: number,
        pagination: { skip: number; take: number },
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? prisma;

        const [conversations, total] = await Promise.all([
            db.conversation.findMany({
                where: { userId },
                skip: pagination.skip,
                take: pagination.take,
                orderBy: { updatedAt: "desc" },
                include: {
                    professional: {
                        select: { id: true, name: true, profilePicture: true },
                    },
                    messages: {
                        orderBy: { createdAt: "desc" },
                        take: 1,
                        select: { content: true, createdAt: true, senderType: true },
                    },
                },
            }),
            db.conversation.count({ where: { userId } }),
        ]);

        return { conversations, total };
    }

    async listConversationsForProfessional(
        professionalId: number,
        pagination: { skip: number; take: number },
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? prisma;

        const [conversations, total] = await Promise.all([
            db.conversation.findMany({
                where: { professionalId },
                skip: pagination.skip,
                take: pagination.take,
                orderBy: { updatedAt: "desc" },
                include: {
                    user: {
                        select: { id: true, name: true, profilePicture: true },
                    },
                    messages: {
                        orderBy: { createdAt: "desc" },
                        take: 1,
                        select: { content: true, createdAt: true, senderType: true },
                    },
                },
            }),
            db.conversation.count({ where: { professionalId } }),
        ]);

        return { conversations, total };
    }

    async createMessage(
        conversationId: number,
        senderType: MessageSenderType,
        content: string,
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? prisma;

        const [message] = await Promise.all([
            db.message.create({
                data: { conversationId, senderType, content },
            }),
            db.conversation.update({
                where: { id: conversationId },
                data: { updatedAt: new Date() },
            }),
        ]);

        return message;
    }

    async listMessages(
        conversationId: number,
        pagination: { skip: number; take: number },
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? prisma;

        const [messages, total] = await Promise.all([
            db.message.findMany({
                where: { conversationId },
                skip: pagination.skip,
                take: pagination.take,
                orderBy: { createdAt: "desc" },
            }),
            db.message.count({ where: { conversationId } }),
        ]);

        return { messages, total };
    }

    async getMessagesSince(
        conversationId: number,
        since: Date,
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? prisma;
        return db.message.findMany({
            where: {
                conversationId,
                createdAt: { gt: since },
            },
            orderBy: { createdAt: "asc" },
        });
    }

    async markAsRead(
        conversationId: number,
        participantType: "user" | "professional",
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? prisma;
        const field = participantType === "user" ? "userLastReadAt" : "professionalLastReadAt";
        return db.conversation.update({
            where: { id: conversationId },
            data: { [field]: new Date() },
        });
    }

    async countUnreadConversations(
        participantType: "user" | "professional",
        participantId: number,
        tx?: Prisma.TransactionClient
    ): Promise<number> {
        const db = tx ?? prisma;
        const idField = participantType === "user" ? "userId" : "professionalId";
        const readField = participantType === "user" ? "userLastReadAt" : "professionalLastReadAt";
        const senderToCheck: MessageSenderType = participantType === "user" ? "professional" : "user";

        // Count conversations that have messages from the other party after the lastReadAt
        const conversations = await db.conversation.findMany({
            where: { [idField]: participantId },
            select: {
                id: true,
                [readField]: true,
                messages: {
                    where: { senderType: senderToCheck },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    select: { createdAt: true },
                },
            },
        });

        let count = 0;
        for (const conv of conversations) {
            const lastMsg = (conv.messages as { createdAt: Date }[])[0];
            if (!lastMsg) continue;
            const lastRead = (conv as any)[readField] as Date | null;
            if (!lastRead || lastMsg.createdAt > lastRead) {
                count++;
            }
        }

        return count;
    }
}
