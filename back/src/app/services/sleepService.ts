// src/services/sleepService.ts
import { SleepRepository, CreateSleepInput, UpdateSleepInput } from "../repositories/sleepRepository";
import { computeDurationHours } from "../utils/sleepTime";

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
}
