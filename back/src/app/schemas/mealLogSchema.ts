import { z } from "zod";

// HH:mm, igual usamos em DietMeal
export const hhmmRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

// entry enviada pelo cliente para update do dia
const mealLogEntryPatchSchema = z.object({
  id: z.number().int().positive().optional(), // se tiver -> atualiza; senão -> cria nova
  title: z.string().max(64).optional(),
  time: z.string().regex(hhmmRegex, "Formato HH:mm").optional(),
  description: z.string().max(1024).optional(),
  notes: z.string().max(512).optional(),

  kcal: z.coerce.number().min(0).optional(),
  protein: z.coerce.number().min(0).optional(),
  carbs: z.coerce.number().min(0).optional(),
  fat: z.coerce.number().min(0).optional(),

  // referenciar DietMeal (refeição do plano) nesse log
  // permitir null pra "desvincular"
  dietMealId: z.number().int().positive().nullable().optional(),
});

// criar um dia do log (sem entries ainda)
export const mealLogDayCreateSchema = z.object({
  date: z.coerce.date(), // dia que o usuário está logando

  notes: z.string().max(1024).optional(),

  adherence: z.coerce.number().min(0).max(100).optional(),
  totalKcal: z.coerce.number().min(0).optional(),
  protein: z.coerce.number().min(0).optional(),
  carbs: z.coerce.number().min(0).optional(),
  fat: z.coerce.number().min(0).optional(),
  waterMl: z.coerce.number().min(0).optional(),
});

// atualizar um dia existente
export const mealLogDayUpdateSchema = z.object({
  notes: z.string().max(1024).optional(),

  adherence: z.coerce.number().min(0).max(100).optional(),
  totalKcal: z.coerce.number().min(0).optional(),
  protein: z.coerce.number().min(0).optional(),
  carbs: z.coerce.number().min(0).optional(),
  fat: z.coerce.number().min(0).optional(),
  waterMl: z.coerce.number().min(0).optional(),

  // opção 1: puxar tudo a partir de uma dieta salva
  dietId: z.number().int().positive().optional(),

  // opção 2: mandar as refeições desse dia manualmente
  entries: z.array(mealLogEntryPatchSchema).optional(),
})
.refine(obj => !(obj.dietId !== undefined && obj.entries !== undefined), {
  message: "Envie OU 'dietId' OU 'entries', nunca os dois ao mesmo tempo",
  path: ["dietId"]
});

export const mealLogDayIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const mealLogDayListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export type MealLogDayCreateBody = z.infer<typeof mealLogDayCreateSchema>;
export type MealLogDayUpdateBody = z.infer<typeof mealLogDayUpdateSchema>;
export type MealLogEntryPatch = z.infer<typeof mealLogEntryPatchSchema>;
