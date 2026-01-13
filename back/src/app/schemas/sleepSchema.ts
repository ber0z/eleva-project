// src/schemas/sleepSchema.ts
import { z } from "zod";
import { HHMM_REGEX } from "../utils/sleepTime";

export const createSleepSchema = z.object({
  date: z.string().min(1, "Data é obrigatória"), // "YYYY-MM-DD"
  startTime: z.string().regex(HHMM_REGEX, "Hora inválida (HH:mm)"),
  endTime: z.string().regex(HHMM_REGEX, "Hora inválida (HH:mm)"),
  sleepQuality: z.string().max(64).optional(),
  notes: z.string().max(1024).optional(),
});

export const updateSleepSchema = z.object({
  date: z.string().optional(), // se vier, "YYYY-MM-DD"
  startTime: z.string().regex(HHMM_REGEX, "Hora inválida (HH:mm)").optional(),
  endTime: z.string().regex(HHMM_REGEX, "Hora inválida (HH:mm)").optional(),
  sleepQuality: z.string().max(64).nullable().optional(),
  notes: z.string().max(1024).nullable().optional(),
});

export const sleepIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listSleepQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  dateFrom: z.string().optional(), // "YYYY-MM-DD"
  dateTo: z.string().optional(),   // "YYYY-MM-DD"
});

// Tipos inferidos (opcional)
export type SleepCreateBody = z.infer<typeof createSleepSchema>;
export type SleepUpdateBody = z.infer<typeof updateSleepSchema>;
