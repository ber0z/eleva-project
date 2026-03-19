import { Prisma, Evolution, EvolutionImage } from "@prisma/client";
import { prisma } from "../lib/prismaClient";
import { EvolutionWithImages } from "../services/evolutionService"
import { EvolutionWritable } from "../types/evolution";

// DTO para criar um registro de Evolution
export interface CreateEvolutionDTO {
  idUser: number;
  date: Date;
  goal: string;
  height: number;
  weight: number;
  rightBiceps?: number;
  leftBiceps?: number;
  rightThigh?: number;
  leftThigh?: number;
  waist?: number;
  hips?: number;
  chest?: number;
  shoulder?: number,
  rightForearm?: number,
  leftForearm?: number,
  rightCalf?: number,
  leftCalf?: number,
  message?: string;
}
export interface UpdateEvolutionDTO {
  idUser: number;
  date: Date;
  goal: string;
  height: number;
  weight: number;
  rightBiceps?: number;
  leftBiceps?: number;
  rightThigh?: number;
  leftThigh?: number;
  waist?: number;
  hips?: number;
  chest?: number;
  shoulder: true,
  rightForearm?: number,
  leftForearm?: number,
  rightCalf?: number,
  leftCalf?: number,
  message?: string;
  removeImageFront?: boolean,
  removeImageSide?: boolean,
  removeImageBack?: boolean

}

// DTO para criar uma EvolutionImage
export interface CreateEvolutionImageDTO {
  idEvolution: number;
  position: number; // 1 = front, 2 = side, 3 = back
  path: string;
}

export class EvolutionRepository {
  async createEvolution(
    data: CreateEvolutionDTO,
    tx?: Prisma.TransactionClient
  ): Promise<Evolution> {
    const client = tx ?? prisma;
    return client.evolution.create({
      data,
    });
  }

  async createEvolutionImage(
    data: CreateEvolutionImageDTO,
    tx?: Prisma.TransactionClient
  ): Promise<EvolutionImage> {
    const client = tx ?? prisma;
    return client.evolutionImage.create({
      data,
    });
  }

  async getEvolutionById(id: number): Promise<EvolutionWithImages | null> {
    return prisma.evolution.findUnique({
      where: { id },
      include: {
        EvolutionImages: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            position: true,
            path: true,
            createdAt: true,
            updatedAt: true
          }
        }
      }
    });
  }

  async updateEvolution(
    id: number,
    data: Partial<EvolutionWritable>,   // <- só campos editáveis
    tx?: Prisma.TransactionClient
  ): Promise<Evolution> {
    const client = tx ?? prisma;
    return client.evolution.update({
      where: { id },
      data, // Prisma ignora chaves undefined
    });
  }

  async deleteEvolution(
    id: number,
    tx?: Prisma.TransactionClient
  ): Promise<{ deleted: Evolution; imagePaths: string[] }> {
    const client = tx ?? prisma;

    // 1) busca os paths das imagens antes de apagar
    const images = await client.evolutionImage.findMany({
      where: { idEvolution: id },
      select: { path: true }
    });
    const imagePaths = images.map(i => i.path);

    // 2) apaga primeiro as imagens
    await client.evolutionImage.deleteMany({
      where: { idEvolution: id }
    });

    // 3) só então apaga a evolução
    const deleted = await client.evolution.delete({
      where: { id }
    });

    return { deleted, imagePaths };
  }

  async findEvolutionImageById(
    id: number
  ): Promise<EvolutionImage | null> {
    return prisma.evolutionImage.findUnique({
      where: { id },
    });
  }

  async countByUser(userId: number, tx?: Prisma.TransactionClient): Promise<number> {
    const client = tx ?? prisma;
    return client.evolution.count({ where: { idUser: userId } });
  }

  async listByUser(
    userId: number,
    skip: number,
    take: number,
    tx?: Prisma.TransactionClient
  ): Promise<Array<{ id: number; date: Date | null; weight: number }>> {
    const db = tx ?? prisma;

    return db.evolution.findMany({
      where: { idUser: userId, /* se quiser ignorar nulos: date: { not: null } */ },
      select: { id: true, date: true, weight: true },
      orderBy: [
        { date: "desc" },
        { createdAt: "desc" },
        { id: "desc" },
      ],
      skip,
      take,
    });
  }
  async findLastEvolutions(
    userId: number,
    limit: number = 2,
    tx?: Prisma.TransactionClient
  ): Promise<Evolution[]> {
    const client = tx ?? prisma;
    return client.evolution.findMany({
      where: { idUser: userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        EvolutionImages: true,
      },
    });
  }

  async findEvolutionImageWithOwner(imageId: number) {
    return prisma.evolutionImage.findUnique({
      where: { id: imageId },
      include: {
        evolution: { select: { idUser: true } }, // trás o dono
      },
    });
  }


} 