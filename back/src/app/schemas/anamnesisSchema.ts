import { z } from "zod";

export const anamnesisSchema = z.object({
  // Histórico de saúde
  healthConditions: z.string().max(1024).nullable().optional(),
  medications: z.string().max(512).nullable().optional(),
  injuries: z.string().max(512).nullable().optional(),
  physicalLimitations: z.string().max(512).nullable().optional(),

  // Experiência fitness
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]).nullable().optional(),
  workoutsPerWeek: z.number().int().min(0).max(14).nullable().optional(),
  preferredWorkoutTime: z.enum(["morning", "afternoon", "evening", "flexible"]).nullable().optional(),
  availableEquipment: z.string().max(512).nullable().optional(),

  // Preferências alimentares
  dietaryRestrictions: z.string().max(512).nullable().optional(),
  foodAllergies: z.string().max(512).nullable().optional(),
  likedFoods: z.string().max(1024).nullable().optional(),
  dislikedFoods: z.string().max(1024).nullable().optional(),
  mealFrequency: z.number().int().min(1).max(10).nullable().optional(),
  waterIntakeMl: z.number().int().min(0).nullable().optional(),

  // Estilo de vida
  occupation: z.string().max(255).nullable().optional(),
  dailyActivityLevel: z
    .enum(["sedentary", "lightly_active", "moderately_active", "very_active"])
    .nullable()
    .optional(),
  stressLevel: z.enum(["low", "moderate", "high"]).nullable().optional(),
  mainGoal: z.string().max(512).nullable().optional(),
  motivation: z.string().max(512).nullable().optional(),
  notes: z.string().max(1024).nullable().optional(),
});

export type AnamnesisInput = z.infer<typeof anamnesisSchema>;
