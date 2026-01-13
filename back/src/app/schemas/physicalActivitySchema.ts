import { z } from "zod";

export const createPhysicalActivitySchema = z.object({
  name: z.string().min(1).max(255),
  type: z.string().max(64).nullable().optional(),
  duration: z.coerce.number().int().positive(),                 // minutos
  calories: z.coerce.number().int().min(0).optional(),
  observations: z.string().max(1024).nullable().optional(),
  date: z.string().refine((v) => !Number.isNaN(Date.parse(v)), { // "YYYY-MM-DD"
    message: "Data inválida",
  }),
  trainingWorkoutId: z.coerce.number().int().positive().nullable().optional(),
});

export const updatePhysicalActivitySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: z.string().max(64).nullable().optional(),
  duration: z.coerce.number().int().positive().optional(),
  calories: z.coerce.number().int().min(0).optional(),
  observations: z.string().max(1024).nullable().optional(),
  date: z.string().refine((v) => !Number.isNaN(Date.parse(v)), { message: "Data inválida" }).optional(),
  trainingWorkoutId: z.coerce.number().int().positive().nullable().optional(),
}).refine((d) => Object.keys(d).length > 0, {
  message: "Envie ao menos um campo para atualização",
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listPhysicalActivitiesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  dateFrom: z.string().refine((v) => !Number.isNaN(Date.parse(v))).optional(),
  dateTo: z.string().refine((v) => !Number.isNaN(Date.parse(v))).optional(),
  type: z.string().max(64).optional(),
  trainingWorkoutId: z.coerce.number().int().positive().optional(),
});
