import { z } from "zod";

// enum do Prisma: enum ProfessionalRole { trainer nutritionist }
const roleEnum = z.enum(["trainer", "nutritionist"]);
const permissionEnum = z.enum(["edit_diet", "edit_training"]);
const e164 = /^\+?[1-9]\d{1,14}$/;

// --- Criação de professional (POST /professional) ---
export const professionalSchema = z.object({
    name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres").max(255),
    roles: z.array(roleEnum).min(1, "Informe pelo menos um papel (trainer/nutritionist)"),
    profilePicture: z.string().max(255).optional().nullable(),
    bio: z.string().max(1024).optional().nullable(),
    crefNumber: z.string().max(64).optional().nullable(),
    crnNumber: z.string().max(64).optional().nullable(),
    contactPhone: z.string().regex(e164, "Telefone deve estar em E.164 (+5511999999999)").optional().nullable(),
    whatsapp: z.string().regex(e164, "WhatsApp deve estar em E.164 (+5511999999999)").optional().nullable(),
    instagram: z.string().max(255).optional().nullable(),
    email: z.string().email().max(255),
    password: z.string().min(6).max(255),
});

// --- Atualização de perfil (PUT /professional/me) ---
export const professionalUpdateSchema = z.object({
    name: z.string().min(2).max(255).optional(),
    roles: z.array(roleEnum).min(1).optional(),
    profilePicture: z.string().max(255).optional().nullable(),
    bio: z.string().max(1024).optional().nullable(),
    crefNumber: z.string().max(64).optional().nullable(),
    crnNumber: z.string().max(64).optional().nullable(),
    contactPhone: z.string().regex(e164, "Telefone deve estar em E.164 (+5511999999999)").optional().nullable(),
    whatsapp: z.string().regex(e164, "WhatsApp deve estar em E.164 (+5511999999999)").optional().nullable(),
    instagram: z.string().max(255).optional().nullable(),
});

// --- Envio de convite (POST /professional/invites) ---
export const createInviteSchema = z
    .object({
        inviteeEmail: z.string().email().max(255).optional(),
        inviteePhone: z.string().regex(e164, "Telefone deve estar em E.164").optional(),
        message: z.string().max(1024).optional(),
        permissions: z.array(permissionEnum).default([]),
    })
    .refine((d) => d.inviteeEmail || d.inviteePhone, {
        message: "Informe o email ou telefone do convidado",
    });

// --- Atualizar permissões (PATCH /professional/clients/:userId/permissions) ---
export const updatePermissionsSchema = z.object({
    permissions: z.array(permissionEnum),
});

// --- Query params para listagem de clientes ---
export const listClientsQuerySchema = z.object({
    status: z.enum(["pending", "accepted", "revoked"]).optional(),
    page: z.coerce.number().int().positive().default(1),
    perPage: z.coerce.number().int().min(1).max(100).default(20),
});

// --- Query params para listagem de convites ---
export const listInvitesQuerySchema = z.object({
    status: z.enum(["pending", "accepted", "declined", "expired", "cancelled"]).optional(),
    page: z.coerce.number().int().positive().default(1),
    perPage: z.coerce.number().int().min(1).max(100).default(20),
});

// --- Query params para listagem de notificações ---
export const listNotificationsQuerySchema = z.object({
    read: z.enum(["true", "false"]).optional(),
    page: z.coerce.number().int().positive().default(1),
    perPage: z.coerce.number().int().min(1).max(100).default(20),
});

// --- Token para aceitar/recusar convite ---
export const inviteTokenSchema = z.object({
    token: z.string().min(1, "Token é obrigatório"),
});
