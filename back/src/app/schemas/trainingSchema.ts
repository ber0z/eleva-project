// src/schemas/trainingSchema.ts
import { z } from "zod";

export const dayOfWeekEnum = z.enum([
  "monday","tuesday","wednesday","thursday","friday","saturday","sunday"
]);

const trainingExerciseInput = z.object({
  exerciseId: z.number().int().positive().optional(),
  name: z.string().max(255).optional(),
  technique: z.string().max(255).optional(),
  sets: z.number().int().min(0).default(0),
  reps: z.number().int().positive().optional(),
  weight: z.number().positive().optional(),
  type: z.string().max(64).optional(),
  notes: z.string().max(1024).optional(),
}).refine(
  (v) => typeof v.exerciseId === "number" || typeof v.name === "string",
  { message: "Envie exerciseId ou name no TrainingExercise." }
);

const trainingWorkoutInput = z.object({
  title: z.string().max(255),
  notes: z.string().max(1024).optional(),
  dayOfWeek: dayOfWeekEnum,
  exercises: z.array(trainingExerciseInput).min(1, "Workout precisa de pelo menos 1 exercício"),
});

export const trainingCreateSchema = z.object({
  title: z.string().max(255).optional(),
  notes: z.string().max(1024).optional(),
  workouts: z.array(trainingWorkoutInput).min(1, "Treino precisa de pelo menos 1 workout"),
});

export const trainingIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const trainingListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(10),
  dayOfWeek: dayOfWeekEnum.optional(),
});


const trainingExercisePatch = z.object({
  id: z.number().int().positive().optional(),     // << pode vir para update/move
  exerciseId: z.number().int().positive().nullable().optional(),
  name: z.string().max(255).optional(),
  technique: z.string().max(255).optional(),
  sets: z.number().int().min(0).optional(),
  reps: z.number().int().positive().nullable().optional(),
  weight: z.number().positive().nullable().optional(),
  type: z.string().max(64).nullable().optional(),
  notes: z.string().max(1024).nullable().optional(),
}).refine(
  (v) => typeof v.name === "string" || typeof v.id === "number",
  { message: "Envie id (para editar) ou exerciseId/name (para criar) no TrainingExercise." }
);

const trainingWorkoutPatch = z.object({
  id: z.number().int().positive().optional(),     // << pode vir para update
  title: z.string().max(255),
  notes: z.string().max(1024).nullable().optional(),
  dayOfWeek: dayOfWeekEnum,
  exercises: z.array(trainingExercisePatch).default([]),
});

export const trainingUpdateSchema = z.object({
  title: z.string().max(255).optional(),
  notes: z.string().max(1024).optional(),
  workouts: z.array(trainingWorkoutPatch).optional(),

  deleteDocument: z.coerce.boolean().optional(),
});



// tipos (opcional)
export type TrainingCreateBody = z.infer<typeof trainingCreateSchema>;
export type TrainingUpdateBody = z.infer<typeof trainingUpdateSchema>;



