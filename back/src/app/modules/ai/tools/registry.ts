import type { AiToolName } from "./definitions";
import type { AiToolsService } from "../services/ai-tools.service";

export type ToolHandlerContext = {
  userId: number;
  tools: AiToolsService;
};

export type ToolHandler = (args: unknown, ctx: ToolHandlerContext) => Promise<unknown>;

export const aiToolRegistry: Record<AiToolName, ToolHandler> = {
  get_last_evolution: async (_args, ctx) => {
    const evo = await ctx.tools.getLastEvolution(ctx.userId);

    if (!evo) return null;
    return {
      id: evo.id,
      date: evo.date,
      goal: evo.goal,
      height: evo.height,
      weight: evo.weight,
      measures: {
        waist: evo.waist,
        hips: evo.hips,
        chest: evo.chest,
        shoulder: evo.shoulder,
        rightBiceps: evo.rightBiceps,
        leftBiceps: evo.leftBiceps,
        rightThigh: evo.rightThigh,
        leftThigh: evo.leftThigh,
        rightCalf: evo.rightCalf,
        leftCalf: evo.leftCalf,
        rightForearm: evo.rightForearm,
        leftForearm: evo.leftForearm,
      },
      message: evo.message,
      updatedAt: evo.updatedAt,
    };
  },
};
