import type { ToolRegistry } from "../../tools/types";

interface DateRangeArgs {
  dateFrom?: string;
  dateTo?: string;
}

interface LimitArgs extends DateRangeArgs {
  limit?: number;
}

interface TrainingByIdArgs {
  trainingId: number;
}

interface ExerciseCatalogArgs {
  query?: string;
  limit?: number;
}

export const trainingRegistry: ToolRegistry = {
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

  get_training_list: async (args, ctx) => {
    const { limit } = args as LimitArgs;
    return ctx.tools.getTrainingList(ctx.userId, limit ?? 5);
  },

  get_training_by_id: async (args, ctx) => {
    const { trainingId } = args as TrainingByIdArgs;
    return ctx.tools.getTrainingById(ctx.userId, trainingId);
  },

  get_recent_activities: async (args, ctx) => {
    const { limit, dateFrom, dateTo } = args as LimitArgs;
    return ctx.tools.getRecentActivities(ctx.userId, limit ?? 5, dateFrom, dateTo);
  },

  get_activity_stats: async (args, ctx) => {
    const { dateFrom, dateTo } = args as DateRangeArgs;
    return ctx.tools.getActivityStats(ctx.userId, dateFrom, dateTo);
  },

  get_exercise_catalog: async (args, ctx) => {
    const { query, limit } = args as ExerciseCatalogArgs;
    return ctx.tools.getExerciseCatalog(query, limit ?? 10);
  },

  get_sleep_stats: async (args, ctx) => {
    const { dateFrom, dateTo } = args as DateRangeArgs;
    return ctx.tools.getSleepStats(ctx.userId, dateFrom, dateTo);
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

  create_training: async (args, ctx) => {
    const data = args as {
      title: string | null; notes: string | null;
      workouts: Array<{
        title: string; dayOfWeek: string; notes: string | null;
        exercises: Array<{
          name: string; sets: number; reps: number | null; weight: number | null;
          type: string | null; technique: string | null; restTime: number | null; notes: string | null;
        }>;
      }>;
    };
    const result = await ctx.tools.createTraining(ctx.userId, data);
    return result ? { success: true, id: result.id, title: result.title } : { success: false, error: "Erro ao criar treino." };
  },

  update_training: async (args, ctx) => {
    const { trainingId, title, notes } = args as {
      trainingId: number; title: string | null; notes: string | null;
    };
    const result = await ctx.tools.updateTraining(ctx.userId, trainingId, { title, notes });
    return result ? { success: true } : { success: false, error: "Treino nao encontrado." };
  },
};
