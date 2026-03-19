import { Anamnesis, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prismaClient";

export type AnamnesisData = {
  healthConditions?: string | null;
  medications?: string | null;
  injuries?: string | null;
  physicalLimitations?: string | null;
  experienceLevel?: string | null;
  workoutsPerWeek?: number | null;
  preferredWorkoutTime?: string | null;
  availableEquipment?: string | null;
  dietaryRestrictions?: string | null;
  foodAllergies?: string | null;
  likedFoods?: string | null;
  dislikedFoods?: string | null;
  mealFrequency?: number | null;
  waterIntakeMl?: number | null;
  occupation?: string | null;
  dailyActivityLevel?: string | null;
  stressLevel?: string | null;
  mainGoal?: string | null;
  motivation?: string | null;
  notes?: string | null;
};

export class AnamnesisRepository {
  private db: PrismaClient = prisma;

  async findByUser(idUser: number, tx?: Prisma.TransactionClient): Promise<Anamnesis | null> {
    const db = tx ?? this.db;
    return db.anamnesis.findUnique({ where: { idUser } });
  }

  async create(idUser: number, data: AnamnesisData, tx?: Prisma.TransactionClient): Promise<Anamnesis> {
    const db = tx ?? this.db;
    return db.anamnesis.create({ data: { idUser, ...data } });
  }

  async update(idUser: number, data: AnamnesisData, tx?: Prisma.TransactionClient): Promise<Anamnesis | null> {
    const db = tx ?? this.db;
    const res = await db.anamnesis.updateMany({ where: { idUser }, data });
    if (res.count === 0) return null;
    return db.anamnesis.findUnique({ where: { idUser } });
  }
}
