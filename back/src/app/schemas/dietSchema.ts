import { z } from "zod";

export const hhmmRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const dietMealCreate = z.object({
  title: z.string().min(1).max(255),
  time: z.string().regex(hhmmRegex, "Formato HH:mm").optional(),
  meal: z.string().min(1).max(1024),
  notes: z.string().max(1024).optional(),
  protein: z.coerce.number().min(0).default(0),
  carbs: z.coerce.number().min(0).default(0),
  fat: z.coerce.number().min(0).default(0),
});

const dietMealPatch = z.object({
  id: z.number().int().positive().optional(), // presente => update, ausente => create
  title: z.string().max(255).optional(),
  time: z.string().regex(hhmmRegex, "Formato HH:mm").optional(),
  meal: z.string().max(1024).optional(),
  notes: z.string().max(1024).optional(),
  protein: z.coerce.number().min(0).optional(),
  carbs: z.coerce.number().min(0).optional(),
  fat: z.coerce.number().min(0).optional(),
}).refine(m => m.id || m.title || m.meal, {
  message: "Envie id (para editar) ou campos para criar/atualizar a refeição.",
});

export const dietCreateSchema = z.object({
  title: z.string().min(1).max(255),
  notes: z.string().max(1024).optional(),
  date: z.coerce.date(),
  protein: z.coerce.number().min(0).optional(),
  carbs: z.coerce.number().min(0).optional(),
  fat: z.coerce.number().min(0).optional(),

  meals: z.array(dietMealCreate).min(1),
});

export const dietUpdateSchema = z.object({
  title: z.string().max(255).optional(),
  notes: z.string().max(1024).optional(),
  date: z.coerce.date().optional(),

  // NOVO: macros totais opcionais
  protein: z.coerce.number().min(0).optional(),
  carbs: z.coerce.number().min(0).optional(),
  fat: z.coerce.number().min(0).optional(),

  meals: z.array(dietMealPatch).optional(),     
  deleteDocument: z.coerce.boolean().optional(),
});


export const dietIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const dietListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});
export type DietCreateBody = z.infer<typeof dietCreateSchema>;
export type DietUpdateBody = z.infer<typeof dietUpdateSchema>;
