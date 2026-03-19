import { prisma } from "../lib/prismaClient";
import { Prisma, PhysicalActivity } from "@prisma/client";
import { NotFoundError } from "../errors/appErrors";
import {
    PhysicalActivityRepository,
    CreatePhysicalActivityInput,
    UpdatePhysicalActivityInput,
    ExerciseLogInput,
    GroupBy
} from "../repositories/physicalActivityRepository";


const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;

function round1(n: number) {
    return Math.round(n * 10) / 10;
}

// interpreta dateFrom/dateTo como dias locais (Recife) e cria range [from, toExclusive)
function toUtcRange(dateFrom: string, dateTo: string) {
    const from = new Date(`${dateFrom}T00:00:00-03:00`);
    const to = new Date(`${dateTo}T00:00:00-03:00`);
    to.setDate(to.getDate() + 1);
    return { from, toExclusive: to };
}

function streakFromDaysDesc(daysDesc: string[]) {
    if (daysDesc.length === 0) return 0;

    const parse = (d: string) => new Date(`${d}T00:00:00-03:00`).getTime();
    let streak = 1;

    for (let i = 0; i < daysDesc.length - 1; i++) {
        const cur = parse(daysDesc[i]);
        const next = parse(daysDesc[i + 1]);
        const diff = cur - next;
        if (diff === 24 * 60 * 60 * 1000) streak++;
        else break;
    }
    return streak;
}

type Insight =
    | { key: "streak_current"; label: string; value: number; unit: "dias" }
    | { key: "best_day"; label: string; value: string; extra: { durationMin: number } };


export class PhysicalActivityService {
    private repo = new PhysicalActivityRepository();

    async create(data: CreatePhysicalActivityInput) {
        return prisma.$transaction(async (tx) => {
            if (data.trainingWorkoutId != null) {
                const exists = await this.repo.trainingWorkoutExists(data.trainingWorkoutId, tx);
                if (!exists) throw new NotFoundError("Treino não encontrado", "trainingWorkoutId");
            }
            try {
                return await this.repo.create(data, tx);
            } catch (e) {
                // fallback FK (P2003)
                if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
                    throw new NotFoundError("Relacionamento inválido", "trainingWorkoutId");
                }
                throw e;
            }
        });
    }


    async updateOwned(id: number, idUser: number, data: UpdatePhysicalActivityInput) {
        return prisma.$transaction(async (tx) => {
            if (typeof data.trainingWorkoutId === "number") {
                const exists = await this.repo.trainingWorkoutExists(data.trainingWorkoutId, tx);
                if (!exists) throw new NotFoundError("Treino não encontrado", "trainingWorkoutId");
            }
            try {
                return await this.repo.updateOwned(id, idUser, data, tx);
            } catch (e) {
                if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
                    throw new NotFoundError("Relacionamento inválido", "trainingWorkoutId");
                }
                throw e;
            }
        });
    }

    async deleteOwned(id: number, idUser: number): Promise<boolean> {
        return prisma.$transaction(async (tx) => this.repo.deleteOwned(id, idUser, tx));
    }

    async getByIdOwned(id: number, idUser: number): Promise<PhysicalActivity | null> {
        return this.repo.findByIdOwned(id, idUser);
    }

    async listByUser(idUser: number, p: { page: number; pageSize: number; dateFrom?: Date; dateTo?: Date; type?: string; trainingWorkoutId?: number }) {
        return this.repo.listByUser(idUser, p);
    }



    //stats ----------- 

    async statsByUser(idUser: number, p: {
        dateFrom: string;
        dateTo: string;
        groupBy: GroupBy;
        typeFilter?: string | null;
        top: number;
    }) {
        const { from, toExclusive } = toUtcRange(p.dateFrom, p.dateTo);
        const typeFilter = p.typeFilter ?? null;

        const [
            totalsRow,
            series,
            byTypeRows,
            byWeekdayRows,
            byHourRows,
            topActivities,
            daysDesc,
            daySeriesForInsights,
        ] = await Promise.all([
            this.repo.totalsByUser(idUser, { from, toExclusive, typeFilter }),
            this.repo.seriesByUser(idUser, { from, toExclusive, groupBy: p.groupBy, typeFilter }),
            this.repo.byType(idUser, { from, toExclusive, typeFilter }),
            this.repo.byWeekday(idUser, { from, toExclusive, typeFilter }),
            this.repo.byHour(idUser, { from, toExclusive, typeFilter }),
            this.repo.topActivities(idUser, { from, toExclusive, typeFilter, top: p.top }),
            this.repo.distinctDaysDesc(idUser, { from, toExclusive, typeFilter }),
            this.repo.daySeriesForInsights(idUser, { from, toExclusive, typeFilter }),
        ]);

        const totalRecords = totalsRow.totalRecords;
        const totalDurationMin = totalsRow.totalDurationMin;
        const totalCalories = totalsRow.totalCalories;

        const avgDurationMin = totalRecords > 0 ? round1(totalDurationMin / totalRecords) : 0;
        const avgCalories = totalRecords > 0 ? round1(totalCalories / totalRecords) : 0;

        const byType = byTypeRows.map((r) => ({
            type: r.type,
            count: r.count,
            durationMin: r.durationMin,
            calories: r.calories,
            percent: totalRecords > 0 ? round1((r.count / totalRecords) * 100) : 0,
        }));

        const byWeekday = byWeekdayRows.map((r) => ({
            weekday: r.weekday,
            label: WEEKDAY_LABELS[r.weekday] ?? String(r.weekday),
            count: r.count,
            durationMin: r.durationMin,
        }));

        const byHour = byHourRows.map((r) => ({
            hour: r.hour,
            count: r.count,
            durationMin: r.durationMin,
        }));

        const streakCurrent = streakFromDaysDesc(daysDesc);

        // best_day: pega o dia com maior durationMin (sempre por dia, mesmo se groupBy=week/month)
        let bestDay: { bucket: string; durationMin: number } | null = null;
        for (const d of daySeriesForInsights) {
            if (!bestDay || d.durationMin > bestDay.durationMin) {
                bestDay = { bucket: d.bucket, durationMin: d.durationMin };
            }
        }

        const insights: Insight[] = [
            { key: "streak_current", label: "Sequência atual", value: streakCurrent, unit: "dias" },
        ];

        if (bestDay) {
            insights.push({
                key: "best_day",
                label: "Dia mais ativo",
                value: bestDay.bucket,
                extra: { durationMin: bestDay.durationMin },
            });
        }

        return {
            dateFrom: p.dateFrom,
            dateTo: p.dateTo,
            groupBy: p.groupBy,
            typeFilter: typeFilter,

            totals: {
                totalRecords,
                totalDurationMin,
                totalCalories,
                avgDurationMin,
                avgCalories,
            },

            series,
            byType,
            byWeekday,
            byHour,

            topActivities: topActivities.map((a) => ({
                id: a.id,
                name: a.name,
                type: a.type,
                date: a.date.toISOString(),
                duration: a.duration,
                calories: a.calories,
            })),

            insights,
        };
    }
}
