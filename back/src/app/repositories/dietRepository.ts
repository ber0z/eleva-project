import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prismaClient";

export type DietCreateInput = {
  idUser: number;
  title: string;
  notes?: string | null;
  date: Date;

  // NOVO
  protein: number;
  carbs: number;
  fat: number;

  idProfessional?: number | null;

  documentPath?: string | null;
  documentType?: string | null;
  documentSize?: number | null;

  meals: Array<{
    title: string;
    time?: string | null;
    meal: string;
    notes?: string | null;
    protein?: number;
    carbs?: number;
    fat?: number;
  }>;
};

export type DietUpdateTopInput = {
  title?: string;
  notes?: string | null;
  date?: Date;

  protein?: number;
  carbs?: number;
  fat?: number;

  documentPath?: string | null;
  documentType?: string | null;
  documentSize?: number | null;
};

export class DietRepository {
  constructor(private db: PrismaClient = prisma) { }

  async createDiet(data: DietCreateInput, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.db;
    const created = await db.diet.create({
      data: {
        idUser: data.idUser,
        idProfessional: data.idProfessional ?? null,
        title: data.title,
        notes: data.notes ?? null,
        date: data.date,
        protein: data.protein, // novo
        carbs: data.carbs,     // novo
        fat: data.fat,         // novo
        documentPath: data.documentPath ?? null,
        documentType: data.documentType ?? null,
        documentSize: data.documentSize ?? null,
        meals: {
          createMany: {
            data: data.meals.map(m => ({
              title: m.title,
              time: m.time ?? null,
              meal: m.meal,
              notes: m.notes ?? null,
              protein: m.protein ?? 0,
              carbs: m.carbs ?? 0,
              fat: m.fat ?? 0,
            })),
          },
        },
      },
      include: { meals: true },
    });
    return created;
  }

  async findOwned(id: number, idUser: number, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.db;
    return db.diet.findFirst({
      where: { id, idUser },
      include: { meals: { orderBy: { id: "asc" } }, professional: { select: { id: true, name: true } } },
    });
  }

  async updateTopOwned(
    id: number,
    idUser: number,
    data: DietUpdateTopInput,
    tx?: Prisma.TransactionClient
  ) {
    const db = tx ?? this.db;
    const res = await db.diet.updateMany({
      where: { id, idUser },
      data,
    });
    if (res.count === 0) return null;
    return db.diet.findUnique({ where: { id } });
  }

  async updateMeal(id: number, data: Prisma.DietMealUpdateInput, tx: Prisma.TransactionClient) {
    return tx.dietMeal.update({ where: { id }, data });
  }

  async createMealsBulk(idDiet: number, items: Array<{
    title: string; time?: string | null; meal: string; notes?: string | null;
    protein?: number; carbs?: number; fat?: number;
  }>, tx: Prisma.TransactionClient) {
    if (!items.length) return;
    await tx.dietMeal.createMany({
      data: items.map(i => ({
        idDiet,
        title: i.title,
        time: i.time ?? null,
        meal: i.meal,
        notes: i.notes ?? null,
        protein: i.protein ?? 0,
        carbs: i.carbs ?? 0,
        fat: i.fat ?? 0,
      })),
    });
  }

  async deleteMealsNotIn(idDiet: number, keepIds: number[], tx: Prisma.TransactionClient) {
    await tx.dietMeal.deleteMany({
      where: { idDiet, id: { notIn: keepIds.length ? keepIds : [0] } },
    });
  }

  async deleteOwned(id: number, idUser: number, tx?: Prisma.TransactionClient): Promise<boolean> {
    const db = tx ?? this.db;
    const res = await db.diet.deleteMany({ where: { id, idUser } });
    return res.count > 0;
  }

  async findDocPathByProfessional(dietId: number, professionalId: number) {
    return this.db.diet.findFirst({
      where: { id: dietId, idProfessional: professionalId },
      select: { id: true, documentPath: true, documentType: true },
    });
  }

  async deleteDietByProfessional(dietId: number, professionalId: number): Promise<boolean> {
    const res = await this.db.diet.deleteMany({ where: { id: dietId, idProfessional: professionalId } });
    return res.count > 0;
  }

  async listByUser(
    idUser: number,
    p: { page: number; pageSize: number; dateFrom?: Date; dateTo?: Date },
    tx?: Prisma.TransactionClient
  ) {
    const db = tx ?? this.db;
    const { page, pageSize, dateFrom, dateTo } = p;
    const skip = (page - 1) * pageSize;

    const where: Prisma.DietWhereInput = {
      idUser,
      AND: [
        dateFrom ? { date: { gte: dateFrom } } : {},
        dateTo ? { date: { lte: dateTo } } : {},
      ],
    };

    const [items, total] = await Promise.all([
      db.diet.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        // não trazer campos de documento no list
        select: { id: true, title: true, notes: true, date: true, createdAt: true, updatedAt: true, idProfessional: true },
      }),
      db.diet.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async listByProfessionalAndUser(
    idProfessional: number,
    idUser: number,
    p: { page: number; pageSize: number },
    tx?: Prisma.TransactionClient
  ) {
    const db = tx ?? this.db;
    const skip = (p.page - 1) * p.pageSize;
    const where: Prisma.DietWhereInput = { idUser, idProfessional };

    const [items, total] = await Promise.all([
      db.diet.findMany({
        where,
        skip,
        take: p.pageSize,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        select: { id: true, title: true, notes: true, date: true, createdAt: true, updatedAt: true, idProfessional: true },
      }),
      db.diet.count({ where }),
    ]);

    return { items, total, page: p.page, pageSize: p.pageSize };
  }
}
