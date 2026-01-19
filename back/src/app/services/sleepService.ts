// src/services/sleepService.ts
import { SleepRepository, CreateSleepInput, UpdateSleepInput } from "../repositories/sleepRepository";
import { computeDurationHours } from "../utils/sleepTime";
import { SleepQuality } from "../schemas/sleepSchema";


const QUALITY_KEYS: SleepQuality[] = [
  "excellent",
  "good",
  "average",
  "poor",
  "very_poor",
];
export class SleepService {
  private repo = new SleepRepository();

  async create(data: Omit<CreateSleepInput, "duration">) {
    const duration = computeDurationHours(data.startTime, data.endTime);
    return this.repo.create({ ...data, duration });
  }

  async updateOwned(id: number, idUser: number, data: Omit<UpdateSleepInput, "duration">) {
    // precisamos da duração recalculada se start/end mudarem
    const existing = await this.repo.findByIdOwned(id, idUser);
    if (!existing) return null;

    const nextStart = data.startTime ?? existing.startTime;
    const nextEnd   = data.endTime   ?? existing.endTime;
    const duration  = computeDurationHours(nextStart, nextEnd);

    return this.repo.updateOwned(id, idUser, { ...data, duration });
  }

  async deleteOwned(id: number, idUser: number): Promise<boolean> {
    return this.repo.deleteOwned(id, idUser);
  }

  async getByIdOwned(id: number, idUser: number) {
    return this.repo.findByIdOwned(id, idUser);
  }

  async listByUser(
    idUser: number,
    p: { page: number; pageSize: number; dateFrom?: Date; dateTo?: Date }
  ) {
    return this.repo.listByUser(idUser, p);
  }

    async getStatsByUser(idUser: number, p: { dateFrom: Date; dateTo: Date }) {
    const { agg, grouped } = await this.repo.statsByUser(idUser, p);

    const totalRecords = agg._count._all ?? 0;
    const avgSleepHoursRaw = agg._avg.duration ?? 0;

    // counts por qualidade (só não-null)
    const counts: Record<SleepQuality, number> = {
      excellent: 0,
      good: 0,
      average: 0,
      poor: 0,
      very_poor: 0,
    };

    for (const row of grouped) {
      const key = row.sleepQuality as SleepQuality | null;
      if (key && key in counts) counts[key] += row._count._all;
    }

    const totalRated = QUALITY_KEYS.reduce((sum, k) => sum + counts[k], 0);
    const unknown = Math.max(0, totalRecords - totalRated);

    const percent: Record<SleepQuality, number> = {
      excellent: 0,
      good: 0,
      average: 0,
      poor: 0,
      very_poor: 0,
    };

    for (const k of QUALITY_KEYS) {
      percent[k] = totalRated > 0 ? (counts[k] / totalRated) * 100 : 0;
    }

    // arredondamentos (ajuste como preferir)
    const avgSleepHours = Math.round(avgSleepHoursRaw * 10) / 10;
    for (const k of QUALITY_KEYS) percent[k] = Math.round(percent[k] * 10) / 10;

    return {
      avgSleepHours,
      totalRecords,
      quality: {
        totalRated,
        unknown,
        count: counts,
        percent,
      },
    };
  }
}
