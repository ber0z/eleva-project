import { prisma } from "../lib/prismaClient";
import { ProfessionalLinkRepository } from "../repositories/professionalLinkRepository";
import { PhysicalActivityService } from "./physicalActivityService";
import { SleepService } from "./sleepService";
import { MealLogService } from "./mealLogService";
import { EvolutionService } from "./evolutionService";
import { NotFoundError, ForbiddenError } from "../errors/appErrors";

export class ClientRecordService {
    private linkRepo = new ProfessionalLinkRepository();
    private activityService = new PhysicalActivityService();
    private sleepService = new SleepService();
    private mealLogService = new MealLogService();
    private evolutionService = new EvolutionService();

    // ===================== Autorizacao =====================

    private async verifyAcceptedLink(professionalId: number, userId: number): Promise<void> {
        const link = await this.linkRepo.findByProfessionalAndUser(professionalId, userId);
        if (!link) throw new NotFoundError("Vínculo não encontrado");
        if (link.status !== "accepted") throw new ForbiddenError("Vínculo não está ativo");
    }

    // ===================== Overview =====================

    async getOverview(professionalId: number, userId: number) {
        await this.verifyAcceptedLink(professionalId, userId);

        const now = new Date();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [
            recentActivities,
            recentSleep,
            recentMeals,
            latestEvolution,
        ] = await Promise.all([
            // Atividades dos ultimos 7 dias
            prisma.physicalActivity.aggregate({
                where: { idUser: userId, date: { gte: sevenDaysAgo } },
                _count: { _all: true },
                _sum: { duration: true, calories: true },
            }),
            // Sono dos ultimos 7 dias
            prisma.sleep.aggregate({
                where: { idUser: userId, date: { gte: sevenDaysAgo } },
                _count: { _all: true },
                _avg: { duration: true },
            }),
            // Refeicoes dos ultimos 7 dias
            prisma.mealLogDay.findMany({
                where: { idUser: userId, date: { gte: sevenDaysAgo } },
                orderBy: { date: "desc" },
                take: 7,
                select: { adherence: true, totalKcal: true, date: true },
            }),
            // Ultima evolucao
            prisma.evolution.findFirst({
                where: { idUser: userId },
                orderBy: { date: "desc" },
                select: { id: true, date: true, weight: true, height: true },
            }),
        ]);

        // Calcular segunda ultima evolucao para variacao de peso
        let weightChange: number | null = null;
        if (latestEvolution) {
            const previousEvolution = await prisma.evolution.findFirst({
                where: { idUser: userId, id: { not: latestEvolution.id } },
                orderBy: { date: "desc" },
                select: { weight: true },
            });
            if (previousEvolution) {
                weightChange = Math.round((latestEvolution.weight - previousEvolution.weight) * 10) / 10;
            }
        }

        const avgAdherence = recentMeals.length > 0
            ? Math.round(recentMeals.reduce((sum, m) => sum + (m.adherence ?? 0), 0) / recentMeals.length)
            : null;

        const avgKcal = recentMeals.length > 0
            ? Math.round(recentMeals.reduce((sum, m) => sum + (m.totalKcal ?? 0), 0) / recentMeals.length)
            : null;

        return {
            activities: {
                countLast7Days: recentActivities._count._all,
                totalDurationMin: recentActivities._sum.duration ?? 0,
                totalCalories: recentActivities._sum.calories ?? 0,
            },
            sleep: {
                countLast7Days: recentSleep._count._all,
                avgHours: recentSleep._avg.duration ? Math.round(recentSleep._avg.duration * 10) / 10 : null,
            },
            meals: {
                daysLast7: recentMeals.length,
                avgAdherence,
                avgKcal,
            },
            evolution: latestEvolution
                ? {
                    latestDate: latestEvolution.date,
                    weight: latestEvolution.weight,
                    height: latestEvolution.height,
                    weightChange,
                }
                : null,
        };
    }

    // ===================== Activities =====================

    async listActivities(
        professionalId: number,
        userId: number,
        filters: { page: number; pageSize: number; dateFrom?: Date; dateTo?: Date; type?: string }
    ) {
        await this.verifyAcceptedLink(professionalId, userId);
        return this.activityService.listByUser(userId, filters);
    }

    async getActivityStats(
        professionalId: number,
        userId: number,
        params: { dateFrom: string; dateTo: string; groupBy: "day" | "week" | "month"; typeFilter?: string | null; top: number }
    ) {
        await this.verifyAcceptedLink(professionalId, userId);
        return this.activityService.statsByUser(userId, params);
    }

    // ===================== Sleep =====================

    async listSleep(
        professionalId: number,
        userId: number,
        filters: { page: number; pageSize: number; dateFrom?: Date; dateTo?: Date }
    ) {
        await this.verifyAcceptedLink(professionalId, userId);
        return this.sleepService.listByUser(userId, filters);
    }

    async getSleepStats(
        professionalId: number,
        userId: number,
        params: { dateFrom: Date; dateTo: Date }
    ) {
        await this.verifyAcceptedLink(professionalId, userId);
        return this.sleepService.getStatsByUser(userId, params);
    }

    // ===================== Meals =====================

    async listMealDays(
        professionalId: number,
        userId: number,
        filters: { page: number; pageSize: number; dateFrom?: Date; dateTo?: Date }
    ) {
        await this.verifyAcceptedLink(professionalId, userId);
        return this.mealLogService.listDaysOwned(userId, filters);
    }

    async getMealDay(professionalId: number, userId: number, dayId: number) {
        await this.verifyAcceptedLink(professionalId, userId);
        const day = await this.mealLogService.getDayOwned(dayId, userId);
        if (!day) throw new NotFoundError("Registro de refeição não encontrado");
        return day;
    }

    // ===================== Evolutions =====================

    async listEvolutions(
        professionalId: number,
        userId: number,
        page: number,
        pageSize: number
    ) {
        await this.verifyAcceptedLink(professionalId, userId);
        return this.evolutionService.getAllEvolutions(userId, page, pageSize);
    }

    async getEvolution(professionalId: number, userId: number, evolutionId: string) {
        await this.verifyAcceptedLink(professionalId, userId);
        // getEvolutionById verifica evo.idUser === userId, que aqui e o userId do cliente
        return this.evolutionService.getEvolutionById(userId, evolutionId);
    }
}
