import { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import {
    sendMessageSchema,
    startConversationSchema,
    listConversationsQuerySchema,
    listMessagesQuerySchema,
    pollMessagesQuerySchema,
} from "../schemas/chatSchema";
import { ChatService } from "../services/chatService";
import { NotFoundError, ForbiddenError } from "../errors/appErrors";

export class ChatController {
    private service = new ChatService();

    startConversation = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const callerType = request.auth!.subjectType as "user" | "professional";
            const callerId = request.auth!.subjectId;
            const { partnerId } = startConversationSchema.parse(request.body);
            const conversation = await this.service.startConversation(callerType, callerId, partnerId);
            return reply.code(200).send(conversation);
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao iniciar conversa");
        }
    };

    listConversations = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const callerType = request.auth!.subjectType as "user" | "professional";
            const callerId = request.auth!.subjectId;
            const query = listConversationsQuerySchema.parse(request.query);
            const result = await this.service.listConversations(callerType, callerId, {
                page: query.page,
                perPage: query.perPage,
            });
            return reply.code(200).send(result);
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao listar conversas");
        }
    };

    listMessages = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const callerType = request.auth!.subjectType as "user" | "professional";
            const callerId = request.auth!.subjectId;
            const conversationId = Number((request.params as any).conversationId);
            if (isNaN(conversationId)) return reply.code(400).send({ error: "conversationId inválido" });
            const query = listMessagesQuerySchema.parse(request.query);
            const result = await this.service.getMessages(callerType, callerId, conversationId, {
                page: query.page,
                perPage: query.perPage,
            });
            return reply.code(200).send(result);
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao listar mensagens");
        }
    };

    sendMessage = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const callerType = request.auth!.subjectType as "user" | "professional";
            const callerId = request.auth!.subjectId;
            const conversationId = Number((request.params as any).conversationId);
            if (isNaN(conversationId)) return reply.code(400).send({ error: "conversationId inválido" });
            const { content } = sendMessageSchema.parse(request.body);
            const message = await this.service.sendMessage(callerType, callerId, conversationId, content);
            return reply.code(201).send(message);
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao enviar mensagem");
        }
    };

    markAsRead = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const callerType = request.auth!.subjectType as "user" | "professional";
            const callerId = request.auth!.subjectId;
            const conversationId = Number((request.params as any).conversationId);
            if (isNaN(conversationId)) return reply.code(400).send({ error: "conversationId inválido" });
            await this.service.markAsRead(callerType, callerId, conversationId);
            return reply.code(200).send({ message: "Conversa marcada como lida" });
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao marcar como lida");
        }
    };

    countUnread = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const callerType = request.auth!.subjectType as "user" | "professional";
            const callerId = request.auth!.subjectId;
            const count = await this.service.countUnread(callerType, callerId);
            return reply.code(200).send({ count });
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao contar mensagens");
        }
    };

    pollMessages = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const callerType = request.auth!.subjectType as "user" | "professional";
            const callerId = request.auth!.subjectId;
            const conversationId = Number((request.params as any).conversationId);
            if (isNaN(conversationId)) return reply.code(400).send({ error: "conversationId inválido" });
            const { since } = pollMessagesQuerySchema.parse(request.query);
            const messages = await this.service.pollMessages(callerType, callerId, conversationId, since);
            return reply.code(200).send({ messages });
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao buscar novas mensagens");
        }
    };

    private handleError(error: unknown, reply: FastifyReply, defaultMessage: string) {
        if (error instanceof ZodError) {
            return reply.code(400).send({ error: "Dados inválidos", details: error.issues });
        }
        if (error instanceof NotFoundError) {
            return reply.code(404).send({ error: error.message });
        }
        if (error instanceof ForbiddenError) {
            return reply.code(403).send({ error: error.message });
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2002") {
                return reply.code(409).send({ error: "Conflito de dados únicos", details: error.meta });
            }
            if (error.code === "P2025") {
                return reply.code(404).send({ error: "Registro não encontrado" });
            }
        }
        return reply.code(500).send({ error: defaultMessage, details: String(error) });
    }
}
