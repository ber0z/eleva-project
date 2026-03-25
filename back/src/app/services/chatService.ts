import { ChatRepository } from "../repositories/chatRepository";
import { prisma } from "../lib/prismaClient";
import { ForbiddenError, NotFoundError } from "../errors/appErrors";
import { presignR2Get } from "./r2Service";

export class ChatService {
    private repo = new ChatRepository();

    async startConversation(
        callerType: "user" | "professional",
        callerId: number,
        partnerId: number
    ) {
        const professionalId = callerType === "professional" ? callerId : partnerId;
        const userId = callerType === "user" ? callerId : partnerId;

        // Verify accepted link exists
        await this.requireAcceptedLink(professionalId, userId);

        return this.repo.findOrCreateConversation(professionalId, userId);
    }

    async listConversations(
        participantType: "user" | "professional",
        participantId: number,
        pagination: { page: number; perPage: number }
    ) {
        const skip = (pagination.page - 1) * pagination.perPage;
        const take = pagination.perPage;

        if (participantType === "user") {
            const { conversations, total } = await this.repo.listConversationsForUser(participantId, { skip, take });
            await Promise.all(conversations.map(async (conv) => {
                if (conv.professional?.profilePicture) {
                    conv.professional.profilePicture = await presignR2Get(conv.professional.profilePicture, 900);
                }
            }));
            return {
                conversations,
                total,
                page: pagination.page,
                totalPages: Math.ceil(total / take),
            };
        } else {
            const { conversations, total } = await this.repo.listConversationsForProfessional(participantId, { skip, take });
            await Promise.all(conversations.map(async (conv) => {
                if (conv.user?.profilePicture) {
                    conv.user.profilePicture = await presignR2Get(conv.user.profilePicture, 900);
                }
            }));
            return {
                conversations,
                total,
                page: pagination.page,
                totalPages: Math.ceil(total / take),
            };
        }
    }

    async getMessages(
        callerType: "user" | "professional",
        callerId: number,
        conversationId: number,
        pagination: { page: number; perPage: number }
    ) {
        const conversation = await this.requireConversationAccess(conversationId, callerType, callerId);

        const skip = (pagination.page - 1) * pagination.perPage;
        const take = pagination.perPage;

        const { messages, total } = await this.repo.listMessages(conversationId, { skip, take });

        return {
            messages: messages.reverse(), // oldest first for display
            total,
            page: pagination.page,
            totalPages: Math.ceil(total / take),
            partner: callerType === "user"
                ? { id: conversation.professionalId, type: "professional" as const }
                : { id: conversation.userId, type: "user" as const },
        };
    }

    async sendMessage(
        callerType: "user" | "professional",
        callerId: number,
        conversationId: number,
        content: string
    ) {
        const conversation = await this.requireConversationAccess(conversationId, callerType, callerId);

        // Check link is still accepted (not revoked) before allowing send
        await this.requireAcceptedLink(conversation.professionalId, conversation.userId);

        return this.repo.createMessage(conversationId, callerType, content);
    }

    async markAsRead(
        callerType: "user" | "professional",
        callerId: number,
        conversationId: number
    ) {
        await this.requireConversationAccess(conversationId, callerType, callerId);
        return this.repo.markAsRead(conversationId, callerType);
    }

    async countUnread(
        participantType: "user" | "professional",
        participantId: number
    ) {
        return this.repo.countUnreadConversations(participantType, participantId);
    }

    async pollMessages(
        callerType: "user" | "professional",
        callerId: number,
        conversationId: number,
        since: Date
    ) {
        await this.requireConversationAccess(conversationId, callerType, callerId);
        return this.repo.getMessagesSince(conversationId, since);
    }

    // ─── Helpers ─────────────────────────────────────────

    private async requireAcceptedLink(professionalId: number, userId: number) {
        const link = await prisma.professionalLink.findUnique({
            where: {
                professional_user_unique: { professionalId, userId },
            },
            select: { status: true },
        });

        if (!link) {
            throw new NotFoundError("Vínculo não encontrado");
        }
        if (link.status !== "accepted") {
            throw new ForbiddenError("Vínculo não está ativo");
        }
    }

    private async requireConversationAccess(
        conversationId: number,
        callerType: "user" | "professional",
        callerId: number
    ) {
        const conversation = await this.repo.findConversationById(conversationId);
        if (!conversation) {
            throw new NotFoundError("Conversa não encontrada");
        }

        const hasAccess = callerType === "user"
            ? conversation.userId === callerId
            : conversation.professionalId === callerId;

        if (!hasAccess) {
            throw new ForbiddenError("Sem acesso a esta conversa");
        }

        return conversation;
    }
}
