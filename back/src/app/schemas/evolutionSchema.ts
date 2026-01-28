import { z } from "zod";

const goalEnums = ["gain_muscle", "lose_fat", "recomposition", "maintain", "increase_strength", "improve_endurance", "improve_health"] as const;


export const evolutionSchema = z.object({
  date: z.coerce.date(),
  goal: z.enum(goalEnums).default("gain_muscle"),
  height: z.number(),
  weight: z.number(),
  rightBiceps: z.number().optional(),
  leftBiceps: z.number().optional(),
  rightThigh: z.number().optional(),
  leftThigh: z.number().optional(),
  waist: z.number().optional(),
  hips: z.number().optional(),
  chest: z.number().optional(),
  shoulder: z.number().optional(),
  rightCalf: z.number().optional(),
  leftCalf: z.number().optional(),
  rightForearm: z.number().optional(),
  leftForearm: z.number().optional(),
  message: z.coerce.string().max(512).optional(),
  imageFront: z.instanceof(Buffer).optional(),
  imageSide: z.instanceof(Buffer).optional(),
  imageBack: z.instanceof(Buffer).optional(),

});

export const evolutionUpdateSchema = z.object({
  date: z.coerce.date(),
  goal: z.enum(goalEnums).optional(),
  height: z.number(),
  weight: z.number(),
  rightBiceps: z.number().optional(),
  leftBiceps: z.number().optional(),
  rightThigh: z.number().optional(),
  leftThigh: z.number().optional(),
  waist: z.number().optional(),
  hips: z.number().optional(),
  chest: z.number().optional(),
  shoulder: z.number().optional(),
  calf: z.number().optional(),
  forearm: z.number().optional(),
  message: z.coerce.string().max(512).optional(),
  imageFront: z.instanceof(Buffer).optional(),
  imageSide: z.instanceof(Buffer).optional(),
  imageBack: z.instanceof(Buffer).optional(),
  removeImageFront: z.coerce.boolean().optional(),
  removeImageSide: z.coerce.boolean().optional(),
  removeImageBack: z.coerce.boolean().optional(),
});

// evolution.schema.ts
export const measuresSchema = z.object({
  height: z.number(),
  weight: z.number(),
  rightBiceps: z.number().optional(),
  leftBiceps: z.number().optional(),
  rightThigh: z.number().optional(),
  leftThigh: z.number().optional(),
  waist: z.number().optional(),
  hips: z.number().optional(),
  chest: z.number().optional(),
  shoulder: z.number().optional(),
  rightCalf: z.number().optional(),
  leftCalf: z.number().optional(),
  rightForearm: z.number().optional(),
  leftForearm: z.number().optional(),
});

export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, {
    message: "ID deve ser um número válido"
  }) 
});

export const imageIdParamSchema = z.object({
  imageId: z.coerce
    .number()        // coage string → number
    .int()           // checa que seja inteiro
    .positive(),     // checa que seja > 0
}); 

export const idParamSchemaNumber = z.object({
  userId: z.coerce.number().int().positive(),
});

export const compareEvolutionsParamsSchema = z.object({
  evo1Id: z.coerce.number().int().positive(),
  evo2Id: z.coerce.number().int().positive(),
});

export const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().default(10),
});

export const idSchema = z.object({ id: z.coerce.number().int().positive() });


export type EvolutionInput = z.infer<typeof evolutionSchema>;
export type EvolutionUpdateInput = z.infer<typeof evolutionUpdateSchema>;
export type MeasuresInput = z.infer<typeof measuresSchema>;