import { z } from "zod";

// enum do Prisma: enum ProfessionalRole { trainer nutritionist }
// aqui validamos como strings; o service envia para o Prisma como está
const roleEnum = z.enum(["trainer", "nutritionist"]);

const e164 = /^\+?[1-9]\d{1,14}$/;

export const professionalSchema = z
    .object({
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
