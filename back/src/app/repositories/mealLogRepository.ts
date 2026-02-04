import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prismaClient";

export class MealLogRepository {
  constructor(private db: PrismaClient = prisma) {}

  // checar se já existe um dia nesse 'date' pra esse usuário
  async findDayByDateOwned(idUser: number, date: Date, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.db;
    return db.mealLogDay.findFirst({
      where: { idUser, date },
      include: { entries: { orderBy: { id: "asc" } } },
    });
  }

  async createDay(
    data: {
      idUser: number;
      date: Date;
      notes?: string | null;
      adherence?: number | null;
      totalKcal?: number | null;
      protein?: number | null;
      carbs?: number | null;
      fat?: number | null;
      waterMl?: number | null;
    },
    tx?: Prisma.TransactionClient
  ) {
    const db = tx ?? this.db;
    return db.mealLogDay.create({
      data: {
        idUser: data.idUser,
        date: data.date,
        notes: data.notes ?? null,
        adherence: data.adherence ?? null,
        totalKcal: data.totalKcal ?? null,
        protein: data.protein ?? 0,
        carbs: data.carbs ?? 0,
        fat: data.fat ?? 0,
        waterMl: data.waterMl ?? null,
      },
    });
  }

  async findDayOwned(
    idDay: number,
    idUser: number,
    tx?: Prisma.TransactionClient
  ) {
    const db = tx ?? this.db;
    return db.mealLogDay.findFirst({
      where: { id: idDay, idUser },
      include: {
        entries: { orderBy: { id: "asc" } },
        diet: {
          select: {
            id: true,
            title: true,
            date: true,
          }
        }
      },
    });
  }

  async updateDayOwned(
  idDay: number,
  idUser: number,
  data: Prisma.MealLogDayUpdateInput,
  tx?: Prisma.TransactionClient
) {
  const db = tx ?? this.db;

  // você já validou ownership antes no service (findDayOwned), então pode dar update só pelo id
  const updated = await db.mealLogDay.update({
    where: { id: idDay },
    data,
  });

  return db.mealLogDay.findUnique({
    where: { id: updated.id },
    include: {
      entries: { orderBy: { id: "asc" } },
      diet: { select: { id: true, title: true, date: true } },
    },
  });
}



  async deleteDayOwned(idDay: number, idUser: number, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.db;
    const res = await db.mealLogDay.deleteMany({
      where: { id: idDay, idUser },
    });
    return res.count > 0;
  }

  // ENTRIES stuff

  async updateEntry(
    idEntry: number,
    data: Prisma.MealLogEntryUpdateInput,
    tx: Prisma.TransactionClient
  ) {
    return tx.mealLogEntry.update({
      where: { id: idEntry },
      data,
    });
  }

  async createEntriesBulk(
    idDay: number,
    rows: Array<{
      title: string;
      time?: string | null;
      description: string;
      notes?: string | null;
      kcal?: number | null;
      protein?: number | null;
      carbs?: number | null;
      fat?: number | null;
      dietMealId?: number | null;
    }>,
    tx: Prisma.TransactionClient
  ) {
    if (!rows.length) return;
    await tx.mealLogEntry.createMany({
      data: rows.map(r => ({
        idDay,
        title: r.title,
        time: r.time ?? null,
        description: r.description,
        notes: r.notes ?? null,
        kcal: r.kcal ?? null,
        protein: r.protein ?? 0,
        carbs: r.carbs ?? 0,
        fat: r.fat ?? 0,
        dietMealId: r.dietMealId ?? null,
      })),
    });
  }

  async deleteEntriesNotIn(
    idDay: number,
    keepIds: number[],
    tx: Prisma.TransactionClient
  ) {
    await tx.mealLogEntry.deleteMany({
      where: {
        idDay,
        id: { notIn: keepIds.length ? keepIds : [0] },
      },
    });
  }

  // LIST days (sem entries, paginado)
  async listDaysByUser(
    idUser: number,
    p: { page: number; pageSize: number; dateFrom?: Date; dateTo?: Date },
    tx?: Prisma.TransactionClient
  ) {
    const db = tx ?? this.db;
    const { page, pageSize, dateFrom, dateTo } = p;
    const skip = (page - 1) * pageSize;

    const where: Prisma.MealLogDayWhereInput = {
      idUser,
      AND: [
        dateFrom ? { date: { gte: dateFrom } } : {},
        dateTo   ? { date: { lte: dateTo } }   : {},
      ],
    };

    const [items, total] = await Promise.all([
      db.mealLogDay.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          date: true,
          notes: true,
          adherence: true,
          totalKcal: true,
          protein: true,
          carbs: true,
          fat: true,
          waterMl: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.mealLogDay.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }
}
