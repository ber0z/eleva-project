import { z } from "zod";

export const createExerciseSchema = z.object({
  name: z.string().min(1).max(255),
  muscleGroup: z.string().max(64).nullable().optional(),
  equipment: z.string().max(64).nullable().optional(),
  difficultyLevel: z.string().max(64).nullable().optional(),
  type: z.string().max(64).nullable().optional(),
  description: z.string().max(1024).nullable().optional(),
  videoUrl: z.string().url("URL inválida").max(1024).nullable().optional(),
});

export const updateExerciseSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  muscleGroup: z.string().max(64).nullable().optional(),
  equipment: z.string().max(64).nullable().optional(),
  difficultyLevel: z.string().max(64).nullable().optional(),
  type: z.string().max(64).nullable().optional(),
  description: z.string().max(1024).nullable().optional(),
  videoUrl: z.string().url("URL inválida").max(1024).nullable().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "É necessário enviar ao menos um campo para atualização",
});

export const listExercisesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().min(1).optional(),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});