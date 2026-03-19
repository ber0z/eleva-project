import { z } from "zod";

const typeEnum = z.enum([
  'strength',
  'cardio',
  'sports',
  'mobility',
  'yoga_pilates',
  'recovery',
  'other'
]);

const exerciseLogSchema = z.object({
  trainingExerciseId: z.coerce.number().int().positive().nullable().optional(),
  name: z.string().min(1).max(255),
  setNumber: z.coerce.number().int().min(1),
  reps: z.coerce.number().int().min(0).nullable().optional(),
  weight: z.coerce.number().min(0).nullable().optional(),
  completed: z.boolean().default(false),
});

export const createPhysicalActivitySchema = z.object({
  name: z.string().min(1).max(255),
  type: typeEnum, //optional
  duration: z.coerce.number().int().positive(),                 // minutos
  calories: z.coerce.number().int().min(0).optional(),
  observations: z.string().max(1024).nullable().optional(),
  date: z.string(),
  trainingWorkoutId: z.coerce.number().int().positive().nullable().optional(),
  exerciseLogs: z.array(exerciseLogSchema).optional(),
});

export const updatePhysicalActivitySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: typeEnum,
  duration: z.coerce.number().int().positive().optional(),
  calories: z.coerce.number().int().min(0).optional(),
  observations: z.string().max(1024).nullable().optional(),
  date: z.string(),
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


const YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const activityStatsQuerySchema = z
  .object({
    dateFrom: z.string().regex(YMD_REGEX, "dateFrom inválido (YYYY-MM-DD)"),
    dateTo: z.string().regex(YMD_REGEX, "dateTo inválido (YYYY-MM-DD)"),
    groupBy: z.enum(["day", "week", "month"]).optional().default("day"),
    type: z.string().trim().max(64).optional(), // filtro opcional
    top: z.coerce.number().int().min(1).max(50).optional().default(10),
  })
  .refine(
    (v) => new Date(v.dateFrom).getTime() <= new Date(v.dateTo).getTime(),
    { message: "dateFrom não pode ser maior que dateTo", path: ["dateFrom"] }
  );