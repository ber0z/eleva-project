import { z } from "zod";

export const shareProfileCreateBody = z.object({
  ttlMinutes: z.number().int().min(1).max(60 * 24 * 7).optional(), // até 7 dias, ajuste se quiser
  images: z.coerce.boolean().default(true), // <- aqui

});

export const shareEvolutionCreateBody = z.object({
  evolutionId: z.coerce.number().int().positive(),
  ttlMinutes: z.coerce.number().int().min(0).default(60), // 0 = sem expiração (se quiser)
  images: z.coerce.boolean().default(true),
})

export const createCompareShareBody = z.object({
  evolutionAId: z.number().int().positive(),
  evolutionBId: z.number().int().positive(),
  ttlMinutes: z.number().int().min(0).default(60),
  includeImages: z.boolean().default(true),
}).refine((v) => v.evolutionAId !== v.evolutionBId, {
  message: "As evoluções não podem ser iguais.",
});

export const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
});


export const TokenOrUsername = z.union([
  z.object({ tokenOrUsername: z.string().regex(/^[0-9a-f]{64}$/i) })
    .transform(o => ({ token: o.tokenOrUsername })),
  z.object({ tokenOrUsername: z.string().trim().min(3).max(30) })
    .transform(o => ({ username: o.tokenOrUsername.toLowerCase() })),
]);

export const shareTokenParams = z.object({
  token: z.string().regex(/^[0-9a-f]{64}$/i, "token inválido"),
});




export type TokenOrUsername = z.infer<typeof TokenOrUsername>;
export type CreateCompareShareBody = z.infer<typeof createCompareShareBody>;
