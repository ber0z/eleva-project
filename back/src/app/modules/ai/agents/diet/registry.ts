import type { ToolRegistry } from "../../tools/types";

interface DateRangeArgs {
  dateFrom?: string;
  dateTo?: string;
}

interface LimitArgs extends DateRangeArgs {
  limit?: number;
}

interface DietByIdArgs {
  dietId: number;
}

interface MealLogDayArgs {
  dayId: number;
}

export const dietRegistry: ToolRegistry = {
  get_anamnesis: async (_args, ctx) => {
    return ctx.tools.getAnamnesis(ctx.userId);
  },

  get_last_evolution: async (_args, ctx) => {
    const evo = await ctx.tools.getLastEvolution(ctx.userId);
    if (!evo) return null;
    return {
      id: evo.id,
      date: evo.date,
      weight: evo.weight,
      height: evo.height,
      goal: evo.goal,
    };
  },

  get_diet_list: async (args, ctx) => {
    const { limit, dateFrom, dateTo } = args as LimitArgs;
    return ctx.tools.getDietList(ctx.userId, limit ?? 5, dateFrom, dateTo);
  },

  get_diet_by_id: async (args, ctx) => {
    const { dietId } = args as DietByIdArgs;
    return ctx.tools.getDietById(ctx.userId, dietId);
  },

  get_meal_logs: async (args, ctx) => {
    const { limit, dateFrom, dateTo } = args as LimitArgs;
    return ctx.tools.getMealLogs(ctx.userId, limit ?? 7, dateFrom, dateTo);
  },

  get_meal_log_day: async (args, ctx) => {
    const { dayId } = args as MealLogDayArgs;
    return ctx.tools.getMealLogDay(ctx.userId, dayId);
  },

  get_recent_sleep: async (args, ctx) => {
    const { limit, dateFrom, dateTo } = args as LimitArgs;
    return ctx.tools.getRecentSleep(ctx.userId, limit ?? 7, dateFrom, dateTo);
  },

  create_diet: async (args, ctx) => {
    const data = args as {
      title: string; date: string; notes: string | null;
      protein: number | null; carbs: number | null; fat: number | null;
      meals: Array<{
        title: string; meal: string; time: string | null; notes: string | null;
        protein: number | null; carbs: number | null; fat: number | null;
      }>;
    };
    const result = await ctx.tools.createDiet(ctx.userId, data);
    return result ? { success: true, id: result.id, title: result.title } : { success: false, error: "Erro ao criar plano alimentar." };
  },

  update_diet: async (args, ctx) => {
    const { dietId, title, notes, date } = args as {
      dietId: number; title: string | null; notes: string | null; date: string | null;
    };
    const result = await ctx.tools.updateDiet(ctx.userId, dietId, { title, notes, date });
    return result ? { success: true } : { success: false, error: "Plano alimentar nao encontrado." };
  },

  create_meal_log_day: async (args, ctx) => {
    const data = args as {
      date: string; notes: string | null; adherence: number | null;
      totalKcal: number | null; protein: number | null; carbs: number | null;
      fat: number | null; waterMl: number | null;
    };
    const result = await ctx.tools.createMealLogDay(ctx.userId, data);
    if (result === null) return { success: false, error: "Ja existe um registro para essa data." };
    return { success: true, id: result?.id, date: result?.date };
  },

  update_meal_log_day: async (args, ctx) => {
    const { dayId, entries, ...rest } = args as {
      dayId: number; notes: string | null; adherence: number | null;
      totalKcal: number | null; protein: number | null; carbs: number | null;
      fat: number | null; waterMl: number | null;
      entries: Array<{
        id: number | null; title: string | null; time: string | null;
        description: string | null; kcal: number | null;
        protein: number | null; carbs: number | null; fat: number | null;
      }> | null;
    };
    const result = await ctx.tools.updateMealLogDay(ctx.userId, dayId, { ...rest, entries });
    return result ? { success: true } : { success: false, error: "Registro nao encontrado." };
  },
};
