import { Prisma, Exercise } from "@prisma/client";
import { prisma } from "../lib/prismaClient";

export type CreateExerciseInput = {
  name: string;
  muscleGroup?: string | null;
  equipment?: string | null;
  difficultyLevel?: string | null;
  type?: string | null;
  description?: string | null;
  videoUrl?: string | null;
};

export type UpdateExerciseInput = Partial<CreateExerciseInput>;

export class ExerciseRepository {
  async create(data: CreateExerciseInput, tx?: Prisma.TransactionClient): Promise<Exercise> {
    const db = tx ?? prisma;
    return db.exercise.create({ data });
  }

  async update(id: number, data: UpdateExerciseInput, tx?: Prisma.TransactionClient): Promise<Exercise> {
    const db = tx ?? prisma;
    return db.exercise.update({ where: { id }, data });
  }

  async delete(id: number, tx?: Prisma.TransactionClient): Promise<Exercise> {
    const db = tx ?? prisma;
    return db.exercise.delete({ where: { id } });
  }

  async findById(id: number, tx?: Prisma.TransactionClient): Promise<Exercise | null> {
    const db = tx ?? prisma;
    return db.exercise.findUnique({ where: { id } });
  }

  async list(params: { page: number; pageSize: number; q?: string }, tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    const { page, pageSize, q } = params;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ExerciseWhereInput = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { muscleGroup: { contains: q, mode: "insensitive" } },
            { equipment: { contains: q, mode: "insensitive" } },
            { type: { contains: q, mode: "insensitive" } },
            { difficultyLevel: { contains: q, mode: "insensitive" } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      db.exercise.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      db.exercise.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }
}


