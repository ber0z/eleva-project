import { Prisma, PhysicalActivity } from "@prisma/client";
import { prisma } from "../lib/prismaClient";

export type CreatePhysicalActivityInput = {
  idUser: number;
  name: string;
  type?: string | null;
  duration: number;
  calories?: number | null;
  observations?: string | null;
  date: Date; // já convertido
  trainingWorkoutId?: number | null;
};

export type UpdatePhysicalActivityInput = Partial<Omit<CreatePhysicalActivityInput, "idUser" | "date">> & {
  date?: Date;
};

export class PhysicalActivityRepository {
  async create(data: CreatePhysicalActivityInput, tx?: Prisma.TransactionClient): Promise<PhysicalActivity> {
    const db = tx ?? prisma;
    return db.physicalActivity.create({ data });
  }

  async updateOwned(
    id: number,
    idUser: number,
    data: UpdatePhysicalActivityInput,
    tx?: Prisma.TransactionClient
  ): Promise<PhysicalActivity | null> {
    const db = tx ?? prisma;
    const res = await db.physicalActivity.updateMany({
      where: { id, idUser },
      data,
    });
    if (res.count === 0) return null;
    return db.physicalActivity.findUnique({ where: { id } });
  }

  async deleteOwned(id: number, idUser: number, tx?: Prisma.TransactionClient): Promise<boolean> {
    const db = tx ?? prisma;
    const res = await db.physicalActivity.deleteMany({ where: { id, idUser } });
    return res.count > 0;
  }

  async findByIdOwned(id: number, idUser: number, tx?: Prisma.TransactionClient): Promise<PhysicalActivity | null> {
    const db = tx ?? prisma;
    return db.physicalActivity.findFirst({ where: { id, idUser } });
  }

  async listByUser(
    idUser: number,
    params: { page: number; pageSize: number; dateFrom?: Date; dateTo?: Date; type?: string; trainingWorkoutId?: number },
    tx?: Prisma.TransactionClient
  ) {
    const db = tx ?? prisma;
    const { page, pageSize, dateFrom, dateTo, type, trainingWorkoutId } = params;
    const skip = (page - 1) * pageSize;

    const where: Prisma.PhysicalActivityWhereInput = {
      idUser,
      AND: [
        dateFrom ? { date: { gte: dateFrom } } : {},
        dateTo ? { date: { lte: dateTo } } : {},
        type ? { type: { equals: type } } : {},
        trainingWorkoutId ? { trainingWorkoutId } : {},
      ],
    };

    const [items, total] = await Promise.all([
      db.physicalActivity.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      }),
      db.physicalActivity.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async trainingWorkoutExists(
    id: number,
    tx?: Prisma.TransactionClient
  ): Promise<boolean> {
    const db = tx ?? prisma;
    const tw = await db.trainingWorkout.findUnique({
      where: { id },
      select: { id: true },
    });
    return !!tw;
  }

}
