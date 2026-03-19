import { z } from "zod";

export const aiChatSchema = z.object({
  message: z.string().min(1).max(4000),
});

export const macroEstimateSchema = z.object({
  description: z.string().min(3).max(1000),
});
