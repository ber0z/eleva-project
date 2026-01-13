import { Exercise } from "@prisma/client";
import { prisma } from "../lib/prismaClient";
import { ExerciseRepository, CreateExerciseInput, UpdateExerciseInput } from "../repositories/exerciseRepository";

export class ExerciseService {
  private repo = new ExerciseRepository();

  async create(data: CreateExerciseInput): Promise<Exercise> {
    return prisma.$transaction(async (tx) => this.repo.create(data, tx));
  }

  async update(id: number, data: UpdateExerciseInput): Promise<Exercise> {
    return prisma.$transaction(async (tx) => this.repo.update(id, data, tx));
  }

  async delete(id: number): Promise<void> {
    await prisma.$transaction(async (tx) => { await this.repo.delete(id, tx); });
  }

  async getById(id: number): Promise<Exercise | null> {
    return this.repo.findById(id);
  }

  async list(page: number, pageSize: number, q?: string) {
    return this.repo.list({ page, pageSize, q });
  }
}
