// src/repositories/sleepRepository.ts
import { Prisma, PrismaClient, Sleep } from "@prisma/client";
import { prisma } from "../lib/prismaClient";

export type CreateSleepInput = {
  idUser: number;
  date: Date;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  duration: number;  // horas (float)
  sleepQuality?: string | null;
  notes?: string | null;
};

export type UpdateSleepInput = Partial<{
  date: Date;
  startTime: string;
  endTime: string;
  duration: number;
  sleepQuality: string | null;
  notes: string | null;
}>;

export class SleepRepository {
  private db: PrismaClient = prisma;

  async create(data: CreateSleepInput, tx?: Prisma.TransactionClient): Promise<Sleep> {
    const db = tx ?? this.db;
    return db.sleep.create({ data });
  }

  async updateOwned(
    id: number,
    idUser: number,
    data: UpdateSleepInput,
    tx?: Prisma.TransactionClient
  ): Promise<Sleep | null> {
    const db = tx ?? this.db;
    const res = await db.sleep.updateMany({
      where: { id, idUser },
      data,
    });
    if (res.count === 0) return null;
    return db.sleep.findUnique({ where: { id } });
  }

  async deleteOwned(id: number, idUser: number, tx?: Prisma.TransactionClient): Promise<boolean> {
    const db = tx ?? this.db;
    const res = await db.sleep.deleteMany({ where: { id, idUser } });
    return res.count > 0;
  }

  async findByIdOwned(id: number, idUser: number, tx?: Prisma.TransactionClient): Promise<Sleep | null> {
    const db = tx ?? this.db;
    return db.sleep.findFirst({ where: { id, idUser } });
  }

  async countByUser(idUser: number, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.db;
    return db.sleep.count({ where: { idUser } });
  }

  async listByUser(
    idUser: number,
    params: { page: number; pageSize: number; dateFrom?: Date; dateTo?: Date },
    tx?: Prisma.TransactionClient
  ) {
    const db = tx ?? this.db;
    const { page, pageSize, dateFrom, dateTo } = params;
    const skip = (page - 1) * pageSize;

    const where: Prisma.SleepWhereInput = {
      idUser,
      AND: [
        dateFrom ? { date: { gte: dateFrom } } : {},
        dateTo ? { date: { lte: dateTo } } : {},
      ],
    };

    const [items, total] = await Promise.all([
      db.sleep.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ date: "desc" }, { startTime: "asc" }],
      }),
      db.sleep.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }
}
