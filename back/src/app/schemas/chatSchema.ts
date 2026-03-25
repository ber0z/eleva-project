import { z } from "zod";

export const sendMessageSchema = z.object({
    content: z.string().min(1, "Mensagem não pode ser vazia").max(4000, "Mensagem muito longa"),
});

export const startConversationSchema = z.object({
    partnerId: z.coerce.number().int().positive(),
});

export const listConversationsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    perPage: z.coerce.number().int().min(1).max(50).default(20),
});

export const listMessagesQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    perPage: z.coerce.number().int().min(1).max(100).default(50),
});

export const pollMessagesQuerySchema = z.object({
    since: z.coerce.date(),
});
