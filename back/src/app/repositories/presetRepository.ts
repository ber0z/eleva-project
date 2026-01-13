import { Prisma} from "@prisma/client";
import { prisma } from "../lib/prismaClient";


export interface CreatePresetDTO {
  currentGoal: string;
  idUser: number;
  terms: string;
  dateSigningTerm: Date;
}

export class PresetRepository {
 
  async createPreset(
    data: CreatePresetDTO,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? prisma;
    return client.preset.create({
      data,
    });
  }

  async getPresetByUserId(
    userId: number,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? prisma;
    return client.preset.findFirst({
      where: {
        idUser: userId,
      },
    });
  }

   async upsertCurrentGoalByUser(
    idUser: number,
    currentGoal: string, // se no schema for string/Decimal, mude aqui também
    tx?:  Prisma.TransactionClient
  ) {
    const client = tx ?? prisma;
    return client.preset.update({
    where: { idUser },            
    data:  { currentGoal },
    select:{ id: true, idUser: true, currentGoal: true },
  });
  }

}
