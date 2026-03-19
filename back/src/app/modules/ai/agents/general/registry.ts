import type { ToolRegistry } from "../../tools/types";

interface DateRangeArgs {
  dateFrom?: string;
  dateTo?: string;
}

interface LimitArgs extends DateRangeArgs {
  limit?: number;
}

export const generalRegistry: ToolRegistry = {
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
    };
  },

  get_evolution_list: async (args, ctx) => {
    const { limit } = args as LimitArgs;
    return ctx.tools.getEvolutionList(ctx.userId, limit ?? 5);
  },

  get_sleep_stats: async (args, ctx) => {
    const { dateFrom, dateTo } = args as DateRangeArgs;
    return ctx.tools.getSleepStats(ctx.userId, dateFrom, dateTo);
  },

  get_recent_sleep: async (args, ctx) => {
    const { limit, dateFrom, dateTo } = args as LimitArgs;
    return ctx.tools.getRecentSleep(ctx.userId, limit ?? 7, dateFrom, dateTo);
  },

  get_activity_stats: async (args, ctx) => {
    const { dateFrom, dateTo } = args as DateRangeArgs;
    return ctx.tools.getActivityStats(ctx.userId, dateFrom, dateTo);
  },

  get_recent_activities: async (args, ctx) => {
    const { limit, dateFrom, dateTo } = args as LimitArgs;
    return ctx.tools.getRecentActivities(ctx.userId, limit ?? 5, dateFrom, dateTo);
  },

  create_sleep: async (args, ctx) => {
    const { date, startTime, endTime, sleepQuality, notes } = args as {
      date: string; startTime: string; endTime: string;
      sleepQuality: string | null; notes: string | null;
    };
    const result = await ctx.tools.createSleep(ctx.userId, { date, startTime, endTime, sleepQuality, notes });
    return { success: true, id: result?.id, date: result?.date };
  },

  update_sleep: async (args, ctx) => {
    const { sleepId, date, startTime, endTime, sleepQuality, notes } = args as {
      sleepId: number; date: string | null; startTime: string | null;
      endTime: string | null; sleepQuality: string | null; notes: string | null;
    };
    const result = await ctx.tools.updateSleep(ctx.userId, sleepId, { date, startTime, endTime, sleepQuality, notes });
    return result ? { success: true } : { success: false, error: "Registro nao encontrado." };
  },

  create_physical_activity: async (args, ctx) => {
    const { name, type, duration, date, calories, observations } = args as {
      name: string; type: string | null; duration: number; date: string;
      calories: number | null; observations: string | null;
    };
    const result = await ctx.tools.createPhysicalActivity(ctx.userId, { name, type, duration, date, calories, observations });
    return { success: true, id: result?.id };
  },

  update_physical_activity: async (args, ctx) => {
    const { activityId, name, type, duration, date, calories, observations } = args as {
      activityId: number; name: string | null; type: string | null; duration: number | null;
      date: string | null; calories: number | null; observations: string | null;
    };
    const result = await ctx.tools.updatePhysicalActivity(ctx.userId, activityId, { name, type, duration, date, calories, observations });
    return result ? { success: true } : { success: false, error: "Atividade nao encontrada." };
  },

  create_evolution: async (args, ctx) => {
    const data = args as {
      date: string; weight: number; height: number; goal: string | null; message: string | null;
      waist: number | null; hips: number | null; chest: number | null; shoulder: number | null;
      rightBiceps: number | null; leftBiceps: number | null; rightThigh: number | null; leftThigh: number | null;
      rightCalf: number | null; leftCalf: number | null; rightForearm: number | null; leftForearm: number | null;
    };
    const result = await ctx.tools.createEvolution(ctx.userId, data);
    return { success: true, id: result?.id, weight: result?.weight };
  },

  update_evolution: async (args, ctx) => {
    const { evolutionId, ...data } = args as {
      evolutionId: number; date: string | null; weight: number | null; height: number | null; goal: string | null;
      message: string | null; waist: number | null; hips: number | null; chest: number | null; shoulder: number | null;
      rightBiceps: number | null; leftBiceps: number | null; rightThigh: number | null; leftThigh: number | null;
      rightCalf: number | null; leftCalf: number | null; rightForearm: number | null; leftForearm: number | null;
    };
    const result = await ctx.tools.updateEvolution(ctx.userId, evolutionId, data);
    return result ? { success: true } : { success: false, error: "Evolucao nao encontrada." };
  },
};
