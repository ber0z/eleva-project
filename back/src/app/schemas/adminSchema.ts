import { z } from "zod";

const adminRoleEnum = z.enum(["superadmin", "manager", "support", "auditor"]);
const SubjectTypeEnum = z.enum(["user", "professional", "admin"]);

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});


export const adminSchema = z.object({
    name: z.string().min(2).max(255),
    roles: z.array(adminRoleEnum).min(1, "Informe pelo menos um papel"),
    profilePicture: z.string().max(255).optional().nullable(),
    isActive: z.boolean().optional(),
    email: z.string().email().max(255),
    password: z.string().min(6).max(255),
});


export const adminUpdateSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres").optional(),
  email: z.string().email("Email inválido").optional(),
  isActive: z.boolean().optional(),
  // role: z.enum(["super", "manager", "agent"]).optional(), // descomente/adapte se tiver enum
}).refine((data) => Object.keys(data).length > 0, {
  message: "Envie pelo menos um campo para atualizar",
});


export const toggleBlockSchema = z.object({
  subjectType: SubjectTypeEnum,
  subjectId: z.coerce.number().int().positive(),
});



export type AdminUpdateInput = z.infer<typeof adminUpdateSchema>;


export type AdminCreateDTO = z.infer<typeof adminSchema>;

