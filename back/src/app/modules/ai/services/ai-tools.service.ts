import type { Evolution } from "@prisma/client";
import { EvolutionService } from "../../../services/evolutionService";
import { SleepService } from "../../../services/sleepService";
import { PhysicalActivityService } from "../../../services/physicalActivityService";
import { TrainingService } from "../../../services/trainingService";
import { ExerciseService } from "../../../services/exerciseService";
import { DietService } from "../../../services/dietService";
import { MealLogService } from "../../../services/mealLogService";
import { AnamnesisRepository } from "../../../repositories/anamnesisRepository";

export class AiToolsService {
  private evolutionService = new EvolutionService();
  private sleepService = new SleepService();
  private activityService = new PhysicalActivityService();
  private trainingService = new TrainingService();
  private exerciseService = new ExerciseService();
  private dietService = new DietService();
  private mealLogService = new MealLogService();
  private anamnesisRepo = new AnamnesisRepository();

  // ── helpers ────────────────────────────────────────────────────────────────

  private defaultDateRange(
    dateFrom: string | undefined,
    dateTo: string | undefined,
    days = 30
  ): { from: Date; to: Date } {
    const to = dateTo ? new Date(dateTo) : new Date();
    const from = dateFrom
      ? new Date(dateFrom)
      : new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
    return { from, to };
  }

  private defaultDateRangeStr(
    dateFrom: string | undefined,
    dateTo: string | undefined,
    days = 30
  ): { dateFrom: string; dateTo: string } {
    const { from, to } = this.defaultDateRange(dateFrom, dateTo, days);
    return {
      dateFrom: from.toISOString().slice(0, 10),
      dateTo: to.toISOString().slice(0, 10),
    };
  }

  // ── EVOLUTION ──────────────────────────────────────────────────────────────

  async getLastEvolution(userId: number): Promise<Evolution | null> {
    const list = await this.evolutionService.getLastEvolutions(userId);
    return list[0] ?? null;
  }

  async getEvolutionList(userId: number, limit = 5) {
    const result = await this.evolutionService.getAllEvolutions(userId, 1, limit);
    return result.data.map((e) => ({
      id: e.id,
      date: e.evaluationDate,
      weight: e.weight,
    }));
  }

  // ── SLEEP ──────────────────────────────────────────────────────────────────

  async getSleepStats(userId: number, dateFrom?: string, dateTo?: string) {
    const { from, to } = this.defaultDateRange(dateFrom, dateTo, 30);
    return this.sleepService.getStatsByUser(userId, { dateFrom: from, dateTo: to });
  }

  async getRecentSleep(
    userId: number,
    limit = 7,
    dateFrom?: string,
    dateTo?: string
  ) {
    const { from, to } = this.defaultDateRange(dateFrom, dateTo, 30);
    const result = await this.sleepService.listByUser(userId, {
      page: 1,
      pageSize: limit,
      dateFrom: from,
      dateTo: to,
    });
    return result.items.map((s) => ({
      id: s.id,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      duration: s.duration,
      quality: s.sleepQuality,
    }));
  }

  // ── PHYSICAL ACTIVITY ──────────────────────────────────────────────────────

  async getActivityStats(userId: number, dateFrom?: string, dateTo?: string) {
    const { dateFrom: df, dateTo: dt } = this.defaultDateRangeStr(dateFrom, dateTo, 30);
    const result = await this.activityService.statsByUser(userId, {
      dateFrom: df,
      dateTo: dt,
      groupBy: "day",
      top: 5,
    });
    return {
      period: { from: df, to: dt },
      totals: result.totals,
      byType: result.byType,
      insights: result.insights,
      topActivities: result.topActivities,
    };
  }

  async getRecentActivities(
    userId: number,
    limit = 5,
    dateFrom?: string,
    dateTo?: string
  ) {
    const { from, to } = this.defaultDateRange(dateFrom, dateTo, 30);
    const result = await this.activityService.listByUser(userId, {
      page: 1,
      pageSize: limit,
      dateFrom: from,
      dateTo: to,
    });
    return result.items.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      date: a.date,
      duration: a.duration,
      calories: a.calories,
    }));
  }

  // ── TRAINING ───────────────────────────────────────────────────────────────

  async getTrainingList(userId: number, limit = 5) {
    const result = await this.trainingService.listByUser(userId, {
      page: 1,
      pageSize: limit,
    });
    return result.items.map((t) => ({
      id: t.id,
      title: t.title,
      notes: t.notes,
      createdAt: t.createdAt,
      workouts: t.workouts.map((w) => ({
        id: w.id,
        title: w.title,
        dayOfWeek: w.dayOfWeek,
        exerciseCount: w._count.exercises,
      })),
    }));
  }

  async getTrainingById(userId: number, trainingId: number) {
    const training = await this.trainingService.getByIdOwned(trainingId, userId);
    if (!training) return null;
    return {
      id: training.id,
      title: training.title,
      notes: training.notes,
      workouts: training.workouts.map((w) => ({
        id: w.id,
        title: w.title,
        dayOfWeek: w.dayOfWeek,
        exercises: w.exercises.map((e) => ({
          id: e.id,
          name: e.name,
          sets: e.sets,
          reps: e.reps,
          weight: e.weight,
          restTime: e.restTime,
          technique: e.technique,
          type: e.type,
          notes: e.notes,
        })),
      })),
    };
  }

  // ── EXERCISE CATALOG ───────────────────────────────────────────────────────

  async getExerciseCatalog(query?: string, limit = 10) {
    const result = await this.exerciseService.list(1, limit, query);
    return result.items.map((e) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      muscleGroup: e.muscleGroup,
      description: e.description,
    }));
  }

  // ── DIET ───────────────────────────────────────────────────────────────────

  async getDietList(
    userId: number,
    limit = 5,
    dateFrom?: string,
    dateTo?: string
  ) {
    const { from, to } = this.defaultDateRange(dateFrom, dateTo, 90);
    const result = await this.dietService.listByUser(userId, {
      page: 1,
      pageSize: limit,
      dateFrom: from,
      dateTo: to,
    });
    return result.items.map((d) => ({
      id: d.id,
      title: d.title,
      date: d.date,
      notes: d.notes,
    }));
  }

  async getDietById(userId: number, dietId: number) {
    const diet = await this.dietService.getByIdOwned(dietId, userId);
    if (!diet) return null;
    return {
      id: diet.id,
      title: diet.title,
      notes: diet.notes,
      date: diet.date,
      protein: diet.protein,
      carbs: diet.carbs,
      fat: diet.fat,
      meals: diet.meals.map((m) => ({
        id: m.id,
        title: m.title,
        time: m.time,
        meal: m.meal,
        notes: m.notes,
        protein: m.protein,
        carbs: m.carbs,
        fat: m.fat,
      })),
    };
  }

  // ── MEAL LOG ───────────────────────────────────────────────────────────────

  async getMealLogs(
    userId: number,
    limit = 7,
    dateFrom?: string,
    dateTo?: string
  ) {
    const { from, to } = this.defaultDateRange(dateFrom, dateTo, 30);
    const result = await this.mealLogService.listDaysOwned(userId, {
      page: 1,
      pageSize: limit,
      dateFrom: from,
      dateTo: to,
    });
    return result.items.map((d) => ({
      id: d.id,
      date: d.date,
      totalKcal: d.totalKcal,
      protein: d.protein,
      carbs: d.carbs,
      fat: d.fat,
      adherence: d.adherence,
      waterMl: d.waterMl,
    }));
  }

  async getMealLogDay(userId: number, dayId: number) {
    const day = await this.mealLogService.getDayOwned(dayId, userId);
    if (!day) return null;
    return {
      id: day.id,
      date: day.date,
      notes: day.notes,
      adherence: day.adherence,
      totalKcal: day.totalKcal,
      protein: day.protein,
      carbs: day.carbs,
      fat: day.fat,
      waterMl: day.waterMl,
      entries: day.entries.map((e) => ({
        id: e.id,
        title: e.title,
        time: e.time,
        description: e.description,
        kcal: e.kcal,
        protein: e.protein,
        carbs: e.carbs,
        fat: e.fat,
      })),
    };
  }

  // ── SLEEP WRITE ─────────────────────────────────────────────────────────────

  async createSleep(userId: number, data: {
    date: string;
    startTime: string;
    endTime: string;
    sleepQuality?: string | null;
    notes?: string | null;
  }) {
    return this.sleepService.create({
      idUser: userId,
      date: new Date(data.date),
      startTime: data.startTime,
      endTime: data.endTime,
      sleepQuality: data.sleepQuality ?? null,
      notes: data.notes ?? null,
    });
  }

  async updateSleep(userId: number, sleepId: number, data: {
    date?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    sleepQuality?: string | null;
    notes?: string | null;
  }) {
    return this.sleepService.updateOwned(sleepId, userId, {
      date: data.date ? new Date(data.date) : undefined,
      startTime: data.startTime ?? undefined,
      endTime: data.endTime ?? undefined,
      sleepQuality: data.sleepQuality ?? undefined,
      notes: data.notes ?? undefined,
    });
  }

  // ── PHYSICAL ACTIVITY WRITE ──────────────────────────────────────────────────

  async createPhysicalActivity(userId: number, data: {
    name: string;
    type?: string | null;
    duration: number;
    date: string;
    calories?: number | null;
    observations?: string | null;
  }) {
    return this.activityService.create({
      idUser: userId,
      name: data.name,
      type: data.type ?? null,
      duration: data.duration,
      date: new Date(data.date),
      calories: data.calories ?? null,
      observations: data.observations ?? null,
    });
  }

  async updatePhysicalActivity(userId: number, activityId: number, data: {
    name?: string | null;
    type?: string | null;
    duration?: number | null;
    date?: string | null;
    calories?: number | null;
    observations?: string | null;
  }) {
    return this.activityService.updateOwned(activityId, userId, {
      name: data.name ?? undefined,
      type: data.type ?? undefined,
      duration: data.duration ?? undefined,
      date: data.date ? new Date(data.date) : undefined,
      calories: data.calories ?? undefined,
      observations: data.observations ?? undefined,
    });
  }

  // ── EVOLUTION WRITE ──────────────────────────────────────────────────────────

  async createEvolution(userId: number, data: {
    date: string;
    weight: number;
    height: number;
    goal?: string | null;
    message?: string | null;
    waist?: number | null;
    hips?: number | null;
    chest?: number | null;
    shoulder?: number | null;
    rightBiceps?: number | null;
    leftBiceps?: number | null;
    rightThigh?: number | null;
    leftThigh?: number | null;
    rightCalf?: number | null;
    leftCalf?: number | null;
    rightForearm?: number | null;
    leftForearm?: number | null;
  }) {
    return this.evolutionService.createEvolution({
      idUser: userId,
      date: new Date(data.date),
      weight: data.weight,
      height: data.height,
      goal: data.goal ?? "gain_muscle",
      message: data.message ?? undefined,
      waist: data.waist ?? undefined,
      hips: data.hips ?? undefined,
      chest: data.chest ?? undefined,
      shoulder: data.shoulder ?? undefined,
      rightBiceps: data.rightBiceps ?? undefined,
      leftBiceps: data.leftBiceps ?? undefined,
      rightThigh: data.rightThigh ?? undefined,
      leftThigh: data.leftThigh ?? undefined,
      rightCalf: data.rightCalf ?? undefined,
      leftCalf: data.leftCalf ?? undefined,
      rightForearm: data.rightForearm ?? undefined,
      leftForearm: data.leftForearm ?? undefined,
    });
  }

  async updateEvolution(userId: number, evolutionId: number, data: {
    date?: string | null;
    weight?: number | null;
    height?: number | null;
    goal?: string | null;
    message?: string | null;
    waist?: number | null;
    hips?: number | null;
    chest?: number | null;
    shoulder?: number | null;
    rightBiceps?: number | null;
    leftBiceps?: number | null;
    rightThigh?: number | null;
    leftThigh?: number | null;
    rightCalf?: number | null;
    leftCalf?: number | null;
    rightForearm?: number | null;
    leftForearm?: number | null;
  }) {
    return this.evolutionService.updateEvolution(userId, String(evolutionId), {
      date: data.date ? new Date(data.date) : undefined,
      weight: data.weight ?? undefined,
      height: data.height ?? undefined,
      goal: data.goal ?? undefined,
      message: data.message ?? undefined,
      waist: data.waist ?? undefined,
      hips: data.hips ?? undefined,
      chest: data.chest ?? undefined,
      shoulder: data.shoulder ?? undefined,
      rightBiceps: data.rightBiceps ?? undefined,
      leftBiceps: data.leftBiceps ?? undefined,
      rightThigh: data.rightThigh ?? undefined,
      leftThigh: data.leftThigh ?? undefined,
      rightCalf: data.rightCalf ?? undefined,
      leftCalf: data.leftCalf ?? undefined,
      rightForearm: data.rightForearm ?? undefined,
      leftForearm: data.leftForearm ?? undefined,
    } as any);
  }

  // ── TRAINING WRITE ───────────────────────────────────────────────────────────

  async createTraining(userId: number, data: {
    title?: string | null;
    notes?: string | null;
    workouts: Array<{
      title: string;
      dayOfWeek: string;
      notes?: string | null;
      exercises: Array<{
        name: string;
        sets: number;
        reps?: number | null;
        weight?: number | null;
        type?: string | null;
        technique?: string | null;
        restTime?: number | null;
        notes?: string | null;
      }>;
    }>;
  }) {
    return this.trainingService.createOwned(userId, {
      title: data.title ?? undefined,
      notes: data.notes ?? undefined,
      workouts: data.workouts.map((w) => ({
        title: w.title,
        dayOfWeek: w.dayOfWeek as any,
        notes: w.notes ?? undefined,
        exercises: w.exercises.map((e) => ({
          name: e.name,
          sets: e.sets,
          reps: e.reps ?? undefined,
          weight: e.weight ?? undefined,
          type: e.type ?? undefined,
          technique: e.technique ?? undefined,
          restTime: e.restTime ?? undefined,
          notes: e.notes ?? undefined,
        })),
      })),
    });
  }

  async updateTraining(userId: number, trainingId: number, data: {
    title?: string | null;
    notes?: string | null;
  }) {
    return this.trainingService.updateOwned(trainingId, userId, {
      title: data.title ?? undefined,
      notes: data.notes ?? undefined,
    });
  }

  // ── DIET WRITE ───────────────────────────────────────────────────────────────

  async createDiet(userId: number, data: {
    title: string;
    date: string;
    notes?: string | null;
    protein?: number | null;
    carbs?: number | null;
    fat?: number | null;
    meals: Array<{
      title: string;
      meal: string;
      time?: string | null;
      notes?: string | null;
      protein?: number | null;
      carbs?: number | null;
      fat?: number | null;
    }>;
  }) {
    return this.dietService.createOwned(userId, {
      title: data.title,
      date: new Date(data.date),
      notes: data.notes ?? undefined,
      protein: data.protein ?? undefined,
      carbs: data.carbs ?? undefined,
      fat: data.fat ?? undefined,
      meals: data.meals.map((m) => ({
        title: m.title,
        meal: m.meal,
        time: m.time ?? undefined,
        notes: m.notes ?? undefined,
        protein: m.protein ?? 0,
        carbs: m.carbs ?? 0,
        fat: m.fat ?? 0,
      })),
    });
  }

  async updateDiet(userId: number, dietId: number, data: {
    title?: string | null;
    notes?: string | null;
    date?: string | null;
  }) {
    return this.dietService.updateOwned(dietId, userId, {
      title: data.title ?? undefined,
      notes: data.notes ?? undefined,
      date: data.date ? new Date(data.date) : undefined,
    });
  }

  // ── MEAL LOG WRITE ───────────────────────────────────────────────────────────

  async createMealLogDay(userId: number, data: {
    date: string;
    notes?: string | null;
    adherence?: number | null;
    totalKcal?: number | null;
    protein?: number | null;
    carbs?: number | null;
    fat?: number | null;
    waterMl?: number | null;
  }) {
    return this.mealLogService.createDayOwned(userId, {
      date: new Date(data.date),
      notes: data.notes ?? undefined,
      adherence: data.adherence ?? undefined,
      totalKcal: data.totalKcal ?? undefined,
      protein: data.protein ?? undefined,
      carbs: data.carbs ?? undefined,
      fat: data.fat ?? undefined,
      waterMl: data.waterMl ?? undefined,
    });
  }

  async updateMealLogDay(userId: number, dayId: number, data: {
    notes?: string | null;
    adherence?: number | null;
    totalKcal?: number | null;
    protein?: number | null;
    carbs?: number | null;
    fat?: number | null;
    waterMl?: number | null;
    entries?: Array<{
      id?: number | null;
      title?: string | null;
      time?: string | null;
      description?: string | null;
      kcal?: number | null;
      protein?: number | null;
      carbs?: number | null;
      fat?: number | null;
    }> | null;
  }) {
    return this.mealLogService.updateDayOwned(dayId, userId, {
      notes: data.notes ?? undefined,
      adherence: data.adherence ?? undefined,
      totalKcal: data.totalKcal ?? undefined,
      protein: data.protein ?? undefined,
      carbs: data.carbs ?? undefined,
      fat: data.fat ?? undefined,
      waterMl: data.waterMl ?? undefined,
      entries: data.entries?.map((e) => ({
        id: e.id ?? undefined,
        title: e.title ?? undefined,
        time: e.time ?? undefined,
        description: e.description ?? undefined,
        kcal: e.kcal ?? undefined,
        protein: e.protein ?? undefined,
        carbs: e.carbs ?? undefined,
        fat: e.fat ?? undefined,
      })) ?? undefined,
    });
  }

  // ── ANAMNESE ───────────────────────────────────────────────────────────────

  async getAnamnesis(userId: number) {
    return this.anamnesisRepo.findByUser(userId);
  }
}
