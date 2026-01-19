// src/schemas/sleepSchema.ts
import { z } from "zod";
import { HHMM_REGEX } from "../utils/sleepTime";
import { DATE_REGEX } from "../utils/sleepTime";

const SleepQualityEnum = z.enum([
  "excellent",
  "good",
  "average",
  "poor",
  "very_poor",
]);

export const createSleepSchema = z.object({
  date: z.string().min(1, "Data é obrigatória"), // "YYYY-MM-DD"
  startTime: z.string().regex(HHMM_REGEX, "Hora inválida (HH:mm)"),
  endTime: z.string().regex(HHMM_REGEX, "Hora inválida (HH:mm)"),
  sleepQuality: SleepQualityEnum.nullable().optional(),
  notes: z.string().max(1024).nullable().optional(),
});

export const updateSleepSchema = z.object({
  date: z.string().min(1, "Data é obrigatória"), // "YYYY-MM-DD"
  startTime: z.string().regex(HHMM_REGEX, "Hora inválida (HH:mm)").optional(),
  endTime: z.string().regex(HHMM_REGEX, "Hora inválida (HH:mm)").optional(),
  sleepQuality: SleepQualityEnum.nullable().optional(),
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

export const sleepStatsQuerySchema = z
  .object({
    dateFrom: z.string().regex(DATE_REGEX, "dateFrom inválido (YYYY-MM-DD)"),
    dateTo: z.string().regex(DATE_REGEX, "dateTo inválido (YYYY-MM-DD)"),
  })
  .refine(
    (v) => new Date(v.dateFrom).getTime() <= new Date(v.dateTo).getTime(),
    { message: "dateFrom não pode ser maior que dateTo", path: ["dateFrom"] }
  );

export type SleepQuality = z.infer<typeof SleepQualityEnum>;
export type SleepCreateBody = z.infer<typeof createSleepSchema>;
export type SleepUpdateBody = z.infer<typeof updateSleepSchema>;
