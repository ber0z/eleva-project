import { Anamnesis } from "@prisma/client";
import { AnamnesisRepository } from "../repositories/anamnesisRepository";
import type { AnamnesisInput } from "../schemas/anamnesisSchema";

export class AnamnesisService {
  private repo = new AnamnesisRepository();

  async getAnamnesis(userId: number): Promise<Anamnesis | null> {
    return this.repo.findByUser(userId);
  }

  async createAnamnesis(userId: number, data: AnamnesisInput): Promise<Anamnesis> {
    const existing = await this.repo.findByUser(userId);
    if (existing) throw new Error("ALREADY_EXISTS");
    return this.repo.create(userId, data);
  }

  async updateAnamnesis(userId: number, data: AnamnesisInput): Promise<Anamnesis | null> {
    return this.repo.update(userId, data);
  }
}
