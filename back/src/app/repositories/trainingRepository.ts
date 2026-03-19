// src/repositories/trainingRepository.ts
import { Prisma, PrismaClient, Training, DayOfWeek } from "@prisma/client";
import { prisma } from "../lib/prismaClient";

export class TrainingRepository {
  private db: PrismaClient = prisma;

  async createTraining(data: Prisma.TrainingUncheckedCreateInput, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.db;
    return db.training.create({ data });
  }

  async updateTrainingOwned(
    id: number, idUser: number, data: Prisma.TrainingUpdateInput, tx?: Prisma.TransactionClient
  ): Promise<Training | null> {
    const db = tx ?? this.db;
    const res = await db.training.updateMany({ where: { id, idUser }, data });
    if (res.count === 0) return null;
    return db.training.findUnique({ where: { id } });
  }

  async deleteTrainingOwned(id: number, idUser: number, tx?: Prisma.TransactionClient): Promise<boolean> {
    const db = tx ?? this.db;
    // const row = await db.training.findFirst({ where: { id, idUser }, select: { documentPath: true } });
    const res = await db.training.deleteMany({ where: { id, idUser } });
    return res.count > 0;
  }

  async findTrainingOwned(id: number, idUser: number, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.db;
    return db.training.findFirst({
      where: { id, idUser },
      include: {
        workouts: {
          orderBy: [{ dayOfWeek: "asc" as const }, { id: "asc" as const }],
          include: { exercises: { orderBy: { id: "asc" } } }
        }
      }
    });
  }

  async findDocPathOwned(id: number, idUser: number, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.db;
    return db.training.findFirst({ where: { id, idUser }, select: { documentPath: true } });
  }

  async countByUser(idUser: number, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.db;
    return db.training.count({ where: { idUser } });
  }

  async listByUser(
    idUser: number,
    p: { skip: number; take: number; dayOfWeek?: DayOfWeek },
    tx?: Prisma.TransactionClient
  ) {
    const db = tx ?? this.db;
    const { skip, take, dayOfWeek } = p;
    return db.training.findMany({
      where: { idUser, ...(dayOfWeek ? { workouts: { some: { dayOfWeek } } } : {}) },
      orderBy: [{ createdAt: "desc" }],
      skip, take,
      select: {
        id: true, title: true, notes: true, createdAt: true, updatedAt: true,
        documentPath: true, documentType: true, documentSize: true,
        workouts: { select: { id: true, dayOfWeek: true, title: true, _count: { select: { exercises: true } } } },
      },
    });
  }

  // workouts/exercises (iguais ao que te passei antes)
  async createWorkout(data: { idTraining: number; title: string; notes?: string | null; dayOfWeek: DayOfWeek }, tx: Prisma.TransactionClient) {
    return tx.trainingWorkout.create({ data });
  }

  async deleteWorkoutsByTraining(idTraining: number, tx: Prisma.TransactionClient) {
    await tx.trainingWorkout.deleteMany({ where: { idTraining } });
  }

  async createExercisesBulk(items: Array<{
    idWorkout: number; exerciseId?: number | null; name: string; technique?: string | null; restTime?: number | null;
    sets: number; reps?: number | null; weight?: number | null; type?: string | null; notes?: string | null;
  }>, tx: Prisma.TransactionClient) {
    if (items.length === 0) return;
    await tx.trainingExercise.createMany({ data: items.map(i => ({ ...i, exerciseId: i.exerciseId ?? null })) });
  }

  async findExercisesByIds(ids: number[], tx: Prisma.TransactionClient) {
    if (ids.length === 0) return [];
    return tx.exercise.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, type: true } });
  }






  
  
  async findWorkoutById(workoutId: number, userId: number) {
    return this.db.trainingWorkout.findFirst({
      where: { id: workoutId, training: { idUser: userId } },
      include: {
        exercises: { orderBy: { id: "asc" } },
        training: { select: { id: true, title: true } },
      },
    });
  }

  async updateWorkout(id: number, data: { title?: string; notes?: string | null; dayOfWeek?: DayOfWeek }, tx: Prisma.TransactionClient) {
    return tx.trainingWorkout.update({ where: { id }, data });
  }
  async deleteWorkoutsByIdsNotIn(idTraining: number, keepIds: number[], tx: Prisma.TransactionClient) {
    await tx.trainingWorkout.deleteMany({
      where: { idTraining, id: { notIn: keepIds.length ? keepIds : [0] } }
    });
  }


  async updateExercise(id: number, data: {
    idWorkout?: number; exerciseId?: number | null; name?: string; technique?: string | null; restTime?: number | null;
    sets?: number; reps?: number | null; weight?: number | null; type?: string | null; notes?: string | null;
  }, tx: Prisma.TransactionClient) {
    return tx.trainingExercise.update({ where: { id }, data });
  }
  async deleteExercisesByWorkoutNotIn(idWorkout: number, keepIds: number[], tx: Prisma.TransactionClient) {
    await tx.trainingExercise.deleteMany({
      where: { idWorkout, id: { notIn: keepIds.length ? keepIds : [0] } }
    });
  }


}




