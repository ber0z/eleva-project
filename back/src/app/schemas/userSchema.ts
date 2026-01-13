import { z } from "zod";

export const userSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  birthDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Data inválida",
  }),
  gender: z.enum(['male', 'female', 'other']),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  preset: z.object({
    currentGoal: z.string().optional(),
    terms: z.string(),
  }).optional(),
});

const zFormBool = z.preprocess(
  (v) => (v === "true" ? true : v === "false" ? false : v),
  z.boolean()
).optional();

export const userUpdateSchema = z.object({
  name: z.string().optional(),
  birthDate: z.coerce.date().optional(), 
  isProfilePublic: zFormBool,
  isProfileImagesPublic: zFormBool,
  username: z.string().min(3).max(32).toLowerCase().regex(/^[a-zA-Z0-9_]+$/, "Username só pode ter letras, numeros e underline").optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  deletePhoto: z.coerce.boolean().optional()
});

export const userIdSchema = z.object({
  id: z.number().int().positive(),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(), // busca por nome
  sortBy: z.enum(["createdAt", "updatedAt", "name"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const usernameSchema = z.object({
  username: z.string().min(3).max(32).toLowerCase().regex(/^[a-zA-Z0-9_]+$/, "Username só pode ter letras, numeros e underline"),
});

 

// Type inferred from the Schema
export type UserInput = z.infer<typeof userSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
  