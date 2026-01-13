import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prismaClient";
import { MealLogRepository } from "../repositories/mealLogRepository";
import type { MealLogDayCreateBody, MealLogDayUpdateBody } from "../schemas/mealLogSchema";

function sumEntriesTotals(entries: Array<{ protein?: number | null; carbs?: number | null; fat?: number | null; kcal?: number | null }>) {
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    let totalKcal = 0;
    for (const e of entries) {
        protein += e.protein ?? 0;
        carbs += e.carbs ?? 0;
        fat += e.fat ?? 0;
        totalKcal += e.kcal ?? 0;
    }
    return { protein, carbs, fat, totalKcal };
}

export class MealLogService {
    private db: PrismaClient = prisma;
    private repo = new MealLogRepository();

    // CREATE DAY
    async createDayOwned(idUser: number, body: MealLogDayCreateBody) {
        return this.db.$transaction(async (tx) => {
            // já existe pra esse dia?
            const existing = await this.repo.findDayByDateOwned(idUser, body.date, tx);
            if (existing) {
                return null; // já tem log pra esse dia
            }

            // salva direto (sem entries aqui)
            const created = await this.repo.createDay(
                {
                    idUser,
                    date: body.date,
                    notes: body.notes ?? null,
                    adherence: body.adherence ?? null,
                    totalKcal: body.totalKcal ?? null,
                    protein: body.protein ?? 0,
                    carbs: body.carbs ?? 0,
                    fat: body.fat ?? 0,
                    waterMl: body.waterMl ?? null,
                },
                tx
            );

            return created;
        });
    }

    async getDayOwned(idDay: number, idUser: number) {
        return this.repo.findDayOwned(idDay, idUser);
    }

    async listDaysOwned(
        idUser: number,
        p: { page: number; pageSize: number; dateFrom?: Date; dateTo?: Date }
    ) {
        return this.repo.listDaysByUser(idUser, p);
    }

    async deleteDayOwned(idDay: number, idUser: number) {
        return this.repo.deleteDayOwned(idDay, idUser);
    }

    // UPDATE DAY
    async updateDayOwned(idDay: number, idUser: number, body: MealLogDayUpdateBody) {
        return this.db.$transaction(async (tx) => {
            // carrega estado atual
            const current = await this.repo.findDayOwned(idDay, idUser, tx);
            if (!current) return null;

            // Se veio dietId, isso DOMINA o update de entries
            if (body.dietId !== undefined) {
                // pega dieta do usuário com meals
                const diet = await tx.diet.findFirst({
                    where: { id: body.dietId, idUser },
                    include: { meals: true },
                });
                if (!diet) {
                    // dieta não pertence ao user ou não existe
                    return null;
                }

                // vamos substituir TODAS as entries pelo que está na dieta
                // primeiro apaga tudo
                await this.repo.deleteEntriesNotIn(idDay, [], tx); // apaga todas (keep=[])

                // cria novas entries baseadas nas DietMeals
                const rows = diet.meals.map(m => ({
                    title: m.title,
                    time: m.time ?? null,
                    description: m.meal,
                    notes: m.notes ?? null,

                    kcal: null, // DietMeal não tem kcal, se quiser pode calcular
                    protein: m.protein ?? 0,
                    carbs: m.carbs ?? 0,
                    fat: m.fat ?? 0,

                    dietMealId: m.id,
                }));
                await this.repo.createEntriesBulk(idDay, rows, tx);

                // calcular totais:
                const sums = sumEntriesTotals(rows);

                // montar update top-level do dia
                const dayUpdateData: Prisma.MealLogDayUpdateInput = {
                    notes: body.notes ?? current.notes ?? null,
                    adherence: body.adherence ?? current.adherence ?? null,
                    waterMl: body.waterMl ?? current.waterMl ?? null,

                    // macros e kcal: se o payload mandou explicitamente, usa. Se não mandou, usa soma
                    totalKcal: body.totalKcal ?? sums.totalKcal,
                    protein: body.protein ?? sums.protein,
                    carbs: body.carbs ?? sums.carbs,
                    fat: body.fat ?? sums.fat,

                    diet: { connect: { id: diet.id } }, // vincula a Diet escolhida
                };

                const updatedDay = await this.repo.updateDayOwned(idDay, idUser, dayUpdateData, tx);
                return updatedDay;
            }

            // Caso contrário, se veio entries, sincroniza manualmente
            if (Array.isArray(body.entries)) {
                // Map atual de entries
                const existingMap = new Map(current.entries.map(e => [e.id, e]));
                const seenIds = new Set<number>();
                const toCreate: Array<{
                    title: string;
                    time?: string | null;
                    description: string;
                    notes?: string | null;
                    kcal?: number | null;
                    protein?: number | null;
                    carbs?: number | null;
                    fat?: number | null;
                    dietMealId?: number | null;
                }> = [];

                for (const e of body.entries) {
                    if (e.id && existingMap.has(e.id)) {
                        const prev = existingMap.get(e.id)!;

                        // montar a relação dietMeal (connect / disconnect / nada)
                        let dietMealRelation:
                            | { disconnect: true }
                            | { connect: { id: number } }
                            | undefined;

                        if (e.dietMealId === null) {
                            // explicitamente remover vínculo
                            dietMealRelation = { disconnect: true };
                        } else if (typeof e.dietMealId === "number") {
                            // trocar / setar vínculo pra uma DietMeal específica
                            dietMealRelation = { connect: { id: e.dietMealId } };
                        }
                        // se e.dietMealId === undefined => não muda a relação

                        const updateData: Prisma.MealLogEntryUpdateInput = {
                            title: e.title ?? prev.title,
                            time: e.time ?? prev.time,
                            description: e.description ?? prev.description,
                            notes: e.notes ?? prev.notes,
                            kcal: e.kcal ?? prev.kcal,
                            protein: e.protein ?? prev.protein,
                            carbs: e.carbs ?? prev.carbs,
                            fat: e.fat ?? prev.fat,
                            // não mexemos em idDay aqui
                            ...(dietMealRelation ? { dietMeal: dietMealRelation } : {}),
                        };

                        await this.repo.updateEntry(e.id, updateData, tx);
                        seenIds.add(e.id);
                    } else {
                        // create de uma nova entry
                        toCreate.push({
                            title: e.title ?? "Refeição",
                            time: e.time ?? null,
                            description: e.description ?? "",
                            notes: e.notes ?? null,
                            kcal: e.kcal ?? null,
                            protein: e.protein ?? 0,
                            carbs: e.carbs ?? 0,
                            fat: e.fat ?? 0,
                            dietMealId: e.dietMealId ?? null, // aqui pode mandar direto, porque no createMany a FK escalar é aceita
                        });
                    }
                }

                // delete entries não enviadas
                await this.repo.deleteEntriesNotIn(idDay, Array.from(seenIds), tx);

                // cria novas
                if (toCreate.length) {
                    await this.repo.createEntriesBulk(idDay, toCreate, tx);
                }

                // Agora precisamos atualizar os totais do dia:
                // 1. se user mandou explicitamente protein/carbs/fat/totalKcal -> usa esses
                // 2. senão, recalc a partir do estado FINAL
                let finalProtein = body.protein;
                let finalCarbs = body.carbs;
                let finalFat = body.fat;
                let finalKcal = body.totalKcal;

                if (
                    finalProtein === undefined ||
                    finalCarbs === undefined ||
                    finalFat === undefined ||
                    finalKcal === undefined
                ) {
                    // recarrega entries atuais do dia depois do sync
                    const freshDay = await this.repo.findDayOwned(idDay, idUser, tx);
                    if (!freshDay) return null;
                    const totals = sumEntriesTotals(freshDay.entries);

                    if (finalProtein === undefined) finalProtein = totals.protein;
                    if (finalCarbs === undefined) finalCarbs = totals.carbs;
                    if (finalFat === undefined) finalFat = totals.fat;
                    if (finalKcal === undefined) finalKcal = totals.totalKcal;
                }

                const updatedDay = await this.repo.updateDayOwned(idDay, idUser, {
                    notes: body.notes ?? current.notes ?? null,
                    adherence: body.adherence ?? current.adherence ?? null,
                    waterMl: body.waterMl ?? current.waterMl ?? null,

                    protein: finalProtein ?? 0,
                    carbs: finalCarbs ?? 0,
                    fat: finalFat ?? 0,
                    totalKcal: finalKcal ?? 0,

                    // se ele está editando manualmente entries, não vamos alterar dietId:
                    // então não mexemos no campo diet aqui.
                }, tx);

                return updatedDay;
            }

            // Se não veio nem dietId nem entries,
            // é só update dos campos top-level do dia
            const updatedDay = await this.repo.updateDayOwned(idDay, idUser, {
                notes: body.notes ?? current.notes ?? null,
                adherence: body.adherence ?? current.adherence ?? null,
                waterMl: body.waterMl ?? current.waterMl ?? null,

                protein: body.protein ?? current.protein ?? 0,
                carbs: body.carbs ?? current.carbs ?? 0,
                fat: body.fat ?? current.fat ?? 0,
                totalKcal: body.totalKcal ?? current.totalKcal ?? 0,
                // dietId permanece igual
            }, tx);

            return updatedDay;
        });
    }
}
