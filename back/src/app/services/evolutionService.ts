import { intervalToDuration } from 'date-fns';
import { Prisma, PrismaClient, Evolution, EvolutionImage } from "@prisma/client";
import { EvolutionRepository, CreateEvolutionDTO, } from "../repositories/evolutionRepository";
import { MeasuresInput } from "../schemas/evolutionSchema";
import { presignR2Get, deleteR2Keys } from "../services/r2Service";
import { prisma } from "../lib/prismaClient";

import { ImageService } from "./imageService";
import { uploadEvolutionImageR2 } from "./uploadService";
import { NotFoundError, ForbiddenError } from '../types/errors'
import { EvolutionUpdateInputFixed, EvolutionWritable } from "../types/evolution";
import { assignIfDefined } from "../types/assign";
import { PresetService } from './presetService';



type EvolutionImageWithUrl = {
  id: number;
  position: number;       // 1=front, 2=side, 3=back (seu padrão)
  url: string;            // presigned GET
};

type EvolutionWithImagesAndUrls = {
  id: number;
  idUser: number;
  date: Date;
  goal: string;
  height: number;
  weight: number;
  rightBiceps?: number | null;
  leftBiceps?: number | null;
  rightThigh?: number | null;
  leftThigh?: number | null;
  waist?: number | null;
  hips?: number | null;
  chest?: number | null;
  message?: string | null;
  createdAt: Date;
  updatedAt: Date;
  EvolutionImages: EvolutionImageWithUrl[];
};

 
export interface EvolutionImages {
  imageFront?: Buffer;
  imageSide?: Buffer;
  imageBack?: Buffer;
}

export type EvolutionWithImages = Evolution & {
  EvolutionImages: Array<{
    id: number;
    position: number;
    path: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
};
interface EvolutionBasic {
  id: number;
  evaluationDate: Date | null;
  weight: number;
}

interface PaginatedEvolutions {
  data: EvolutionBasic[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

type ImageField = "imageFront" | "imageSide" | "imageBack";
type RemoveFlag = "removeImageFront" | "removeImageSide" | "removeImageBack";
type Position = 1 | 2 | 3;

const IMAGE_FIELDS: readonly ImageField[] = ["imageFront", "imageSide", "imageBack"] as const;
const REMOVE_FLAGS: readonly RemoveFlag[] = ["removeImageFront", "removeImageSide", "removeImageBack"] as const;

const positionByField: Record<ImageField, Position> = {
  imageFront: 1,
  imageSide: 2,
  imageBack: 3,
};

const positionByRemoveFlag: Record<RemoveFlag, Position> = {
  removeImageFront: 1,
  removeImageSide: 2,
  removeImageBack: 3,
};



export class EvolutionService {

  private evolutionRepository = new EvolutionRepository();
  private presetService = new PresetService();

  // async createEvolution(
  //   evolutionData: CreateEvolutionDTO & { images?: EvolutionImages },
  //   tx?: Prisma.TransactionClient
  // ): Promise<Evolution> {

  //   const executeTransaction = async (transaction: Prisma.TransactionClient) => {
  //     const { images, ...dtoData } = evolutionData

  //     // 1) cria a evolução primeiro (precisamos do id)
  //     const newEvolution = await this.evolutionRepository.createEvolution(dtoData, transaction)

  //     // 2) se tem imagens, processa e sobe no R2
  //     if (images) {
  //       const positions: Record<'imageFront' | 'imageSide' | 'imageBack', 1 | 2 | 3> = {
  //         imageFront: 1, imageSide: 2, imageBack: 3
  //       }

  //       for (const [fieldName, position] of Object.entries(positions) as [keyof typeof positions, 1 | 2 | 3][]) {
  //         const originalBuffer = images[fieldName]
  //         if (!originalBuffer) continue

  //         // processa (ex.: converte/comprime para webp ~70KB)
  //         const processed = await ImageService.processImage(originalBuffer, 70 * 1024)

  //         // envia ao R2 e pega a key
  //         const fileKey = await uploadEvolutionImageR2({
  //           userId: dtoData.idUser,
  //           evolutionId: newEvolution.id,
  //           position,
  //           buffer: processed,
  //           contentType: 'image/webp',
  //         })

  //         // grava no banco (path = key no bucket)
  //         await this.evolutionRepository.createEvolutionImage({
  //           idEvolution: newEvolution.id,
  //           position,
  //           path: fileKey,
  //         }, transaction)
  //       }
  //     }

  //     // 4) se veio goal na evolução, sincroniza no Preset.currentGoal
  //     // Se currentGoal for numérico no schema, garanta um número aqui:

  //     const rawGoal = dtoData.goal;

  //     // considera goal válido se existir e não for string vazia
  //     const hasGoal =
  //       rawGoal !== undefined &&
  //       rawGoal !== null &&
  //       String(rawGoal).trim() !== "";

  //     if (hasGoal) {
  //       const goalStr = String(rawGoal).trim();
  //       await this.presetService.setCurrentGoalForUser(
  //         dtoData.idUser,
  //         goalStr,
  //         transaction
  //       );
  //     } else {
  //       //
  //     }


  //     // 5) atualiza medidas do usuário
  //     if (await this.isLatestEvolution(dtoData.idUser, newEvolution.id, transaction)) {
  //       await this.updateUserMeasures(dtoData.idUser, dtoData, transaction);
  //     }


  //     return newEvolution
  //   }

  //   if (tx) return executeTransaction(tx)
  //   return await (prisma as PrismaClient).$transaction(executeTransaction)
  // }

  async createEvolution(
    evolutionData: CreateEvolutionDTO & { images?: EvolutionImages },
    tx?: Prisma.TransactionClient
  ): Promise<Evolution> {
    const { images, ...dto } = evolutionData;

    // --- 1) Somente DB (transação curta) ---
    const runDb = async (db: Prisma.TransactionClient) => {
      // cria a evolução
      const evo = await this.evolutionRepository.createEvolution(dto, db);

      // atualiza preset.currentGoal se veio
      const rawGoal = dto.goal;
      if (rawGoal != null && String(rawGoal).trim() !== "") {
        await this.presetService.setCurrentGoalForUser(
          dto.idUser,
          String(rawGoal).trim(),
          db
        );
      }

      // se for a mais recente por DATA, atualiza medidas
      const latest = await db.evolution.findFirst({
        where: { idUser: dto.idUser },
        orderBy: { date: "desc" },
        select: { id: true },
      });
      if (latest?.id === evo.id) {
        await this.updateUserMeasures(dto.idUser, dto, db);
      }

      return evo;
    };

    const newEvolution = tx
      ? await runDb(tx) // já estou dentro de uma transação de cima
      : await prisma.$transaction(runDb, { timeout: 20_000, maxWait: 5_000 });

    // --- 2) Fora da transação: processar/subir imagens ---
    if (images) {
      const positions: Record<"imageFront" | "imageSide" | "imageBack", 1 | 2 | 3> = {
        imageFront: 1, imageSide: 2, imageBack: 3
      };

      for (const [fieldName, position] of Object.entries(positions) as
        [keyof typeof positions, 1 | 2 | 3][]) {
        const buf = images[fieldName];
        if (!buf) continue;

        const processed = await ImageService.processImage(buf, 70 * 1024);
        const fileKey = await uploadEvolutionImageR2({
          userId: dto.idUser,
          evolutionId: newEvolution.id,
          position,
          buffer: processed,
          contentType: "image/webp",
        });

        // grava registro da imagem (operação curta; se quiser, agrupe em uma $transaction curta)
        await prisma.evolutionImage.create({
          data: { idEvolution: newEvolution.id, position, path: fileKey },
        });
      }
    }

    return newEvolution;
  }


  async getEvolutionById(
    userId: number,
    id: string,
  ): Promise<EvolutionWithImagesAndUrls | null> {
    const numericId = Number.parseInt(id, 10);
    if (Number.isNaN(numericId)) return null;

    // 1) Busca evolução
    const evo = await this.evolutionRepository.getEvolutionById(numericId);
    if (!evo) return null; // 404

    // 2) Verifica dono
    if (evo.idUser !== userId) {
      throw new ForbiddenError("A evolução não pertence ao usuário autenticado.");
    }

    // 3) Presign para cada imagem
    const ttl = 900; //15min
    const withUrls: EvolutionWithImagesAndUrls = {
      ...evo,
      EvolutionImages: await Promise.all(
        evo.EvolutionImages.map(async (img) => ({
          id: img.id,
          position: img.position,
          url: await presignR2Get(img.path, ttl),

        }))
      ),
    };

    return withUrls;
  }

  async deleteEvolution(userId: number, idParam: string | number): Promise<void> {
    const id = typeof idParam === "string" ? Number.parseInt(idParam, 10) : idParam;
    if (!Number.isFinite(id)) throw new NotFoundError("Evolução não encontrada");

    // 1) valida existência e dono
    const evo = await this.evolutionRepository.getEvolutionById(id);
    if (!evo) throw new NotFoundError("Evolução não encontrada");
    if (evo.idUser !== userId) throw new ForbiddenError("Você não tem permissão para apagar esta evolução");

    // 2) apaga em transação e captura as keys das imagens
    let imageKeys: string[] = [];
    await (prisma as PrismaClient).$transaction(async (tx) => {
      const { imagePaths } = await this.evolutionRepository.deleteEvolution(id, tx);
      imageKeys = imagePaths;
    });

    // 3) após commit, tenta limpar do R2 (best-effort)
    if (imageKeys.length) {
      const failed = await deleteR2Keys(imageKeys);
      if (failed.length) {
        // logue/mande para fila de retry se quiser
        console.warn("[R2] Falha ao deletar chaves:", failed);
      }
    }
  }

  private async updateUserMeasures(
    userId: number,
    updateData: MeasuresInput,
    transaction: Prisma.TransactionClient
  ) {
    if (!updateData) return;

    await transaction.measure.upsert({
      where: { idUser: userId },
      update: this.getMeasuresData(updateData),
      create: {
        idUser: userId,
        ...this.getMeasuresData(updateData)
      },
    });
  }


  private getMeasuresData(data: MeasuresInput) {
    return {
      height: data.height,
      weight: data.weight,
      rightBiceps: data.rightBiceps,
      leftBiceps: data.leftBiceps,
      rightThigh: data.rightThigh,
      leftThigh: data.leftThigh,
      waist: data.waist,
      hips: data.hips,
      chest: data.chest,
    };
  }







  // testar e refatorar tudo abaixo


  private async isLatestEvolution(
    userId: number,
    evolutionId: number,
    tx: Prisma.TransactionClient
  ): Promise<boolean> {
    const latest = await tx.evolution.findFirst({
      where: { idUser: userId },
      orderBy: [
        { date: "desc" },       // dia mais recente
        { createdAt: "desc" },  // desempate por criação
        { id: "desc" },         // fallback
      ],
      select: { id: true },
    });

    return latest?.id === evolutionId;
  }



  async getEvolutionImageById(id: number): Promise<EvolutionImage> {
    const image = await this.evolutionRepository.findEvolutionImageById(id);
    if (!image) {
      throw new NotFoundError("Imagem de evolução não encontrada");
    }
    return image;
  }

  async updateEvolution(
    userId: number,
    idParam: string,
    updateData: EvolutionUpdateInputFixed
  ): Promise<Evolution> {
    const evolutionId = Number.parseInt(idParam, 10);
    if (!Number.isFinite(evolutionId)) throw new NotFoundError("Evolução não encontrada");

    const keysToDelete: string[] = [];

    const updated = await prisma.$transaction(async (tx) => {
      // 1) carrega e valida
      const existing = await this.evolutionRepository.getEvolutionById(evolutionId);
      if (!existing) throw new NotFoundError("Evolução não encontrada");
      if (existing.idUser !== userId) throw new ForbiddenError("Você não tem permissão para editar esta evolução");

      // 2) imagens
      await this.handleImageUpdatesR2_Flat(existing.id, existing.idUser, updateData, tx, keysToDelete);

      // 3) se for a mais recente, atualiza medidas no User
      if (await this.isLatestEvolution(existing.idUser, evolutionId, tx)) {
        await this.updateUserMeasures(existing.idUser, updateData, tx);
      }

      // 4) se veio goal, sincroniza com Preset.currentGoal (string)
      const rawGoal = updateData.goal;
      if (rawGoal !== undefined && rawGoal !== null && String(rawGoal).trim() !== "") {
        const goalStr = String(rawGoal).trim();
        await this.presetService.setCurrentGoalForUser(existing.idUser, goalStr, tx);
      }

      // 5) aplica apenas campos permitidos que vieram definidos
      const writableKeys: (keyof EvolutionWritable)[] = [
        "date", "goal", "height", "weight",
        "rightBiceps", "leftBiceps", "rightThigh", "leftThigh",
        "waist", "hips", "chest", "message",
      ];
      const partial: Partial<EvolutionWritable> = {};
      assignIfDefined<EvolutionWritable>(partial, updateData as Partial<EvolutionWritable>, writableKeys);

      // 6) persiste evolução
      return this.evolutionRepository.updateEvolution(evolutionId, partial, tx);
    });

    // 7) limpeza no R2 (fora da tx)
    if (keysToDelete.length) {
      const failed = await deleteR2Keys(keysToDelete);
      if (failed.length) console.warn("[R2] falha ao deletar chaves:", failed);
    }

    return updated;
  }
  private async handleImageUpdatesR2_Flat(
    evolutionId: number,
    userId: number,
    data: EvolutionUpdateInputFixed,
    tx: Prisma.TransactionClient,
    keysToDeleteCollector: string[]
  ) {
    // 1) remoções explícitas (flags)
    for (const flag of REMOVE_FLAGS) {
      if (data[flag]) {
        const pos = positionByRemoveFlag[flag];
        const olds = await tx.evolutionImage.findMany({
          where: { idEvolution: evolutionId, position: pos },
          select: { path: true },
        });
        if (olds.length) {
          keysToDeleteCollector.push(...olds.map(o => o.path));
          await tx.evolutionImage.deleteMany({ where: { idEvolution: evolutionId, position: pos } });
        }
      }
    }

    // 2) substituições (buffers enviados nos campos flat)
    for (const field of IMAGE_FIELDS) {
      const buf: Buffer | undefined = data[field];
      if (!buf) continue;

      const pos = positionByField[field];

      // apaga antigos da mesma posição
      const olds = await tx.evolutionImage.findMany({
        where: { idEvolution: evolutionId, position: pos },
        select: { path: true },
      });
      if (olds.length) {
        keysToDeleteCollector.push(...olds.map(o => o.path));
        await tx.evolutionImage.deleteMany({ where: { idEvolution: evolutionId, position: pos } });
      }

      // processa e sobe a nova
      const processed = await ImageService.processImage(buf, 70 * 1024); // webp ~70KB
      const key = await uploadEvolutionImageR2({
        userId,
        evolutionId,
        position: pos,          // já é Position (1|2|3)
        buffer: processed,
        contentType: "image/webp",
      });

      await tx.evolutionImage.create({
        data: { idEvolution: evolutionId, position: pos, path: key },
      });
    }
  }

  async getAllEvolutions(
    userId: number,
    page = 1,
    pageSize = 10
  ): Promise<PaginatedEvolutions> {
    const p = Math.max(1, page | 0);
    const s = Math.max(1, pageSize | 0);
    const skip = (p - 1) * s;

    let total = 0;
    let rows: Array<{ id: number; date: Date | null; weight: number }> = [];

    await prisma.$transaction(async (tx) => {
      total = await this.evolutionRepository.countByUser(userId, tx);
      rows = await this.evolutionRepository.listByUser(userId, skip, s, tx);
    });

    const data: EvolutionBasic[] = rows.map((r) => ({
      id: r.id,
      evaluationDate: r.date,          // Date | null
      weight: r.weight,
    }));

    return {
      data,
      total,
      page: p,
      pageSize: s,
      totalPages: Math.max(1, Math.ceil(total / s)),
    };
  }

  async compareEvolutions(userId: number, evo1Id: number, evo2Id: number): Promise<{
    evolution1: Evolution;
    evolution2: Evolution;
    differences: Record<string, number | { years: number; months: number; days: number }>;
  }> {
    // 1) busca garantindo a propriedade
    const [evolution1, evolution2] = await Promise.all([
      prisma.evolution.findFirst({ where: { id: evo1Id, idUser: userId } }),
      prisma.evolution.findFirst({ where: { id: evo2Id, idUser: userId } }),
    ]);

    if (!evolution1 || !evolution2) {
      throw new Error("Evolution não encontrada ou não pertence ao usuário"); // 403/404 no controller
    }

    // 2) calcula diferenças
    const fields: Array<keyof Evolution> = [
      "height",
      "weight",
      "rightBiceps",
      "leftBiceps",
      "rightThigh",
      "leftThigh",
      "waist",
      "hips",
      "chest",
    ];

    const differences: Record<string, number> = {};
    for (const f of fields) {
      const v1 = evolution1[f] as number | null | undefined;
      const v2 = evolution2[f] as number | null | undefined;
      differences[f] =
        typeof v1 === "number" && typeof v2 === "number" ? v1 - v2 : NaN;
    }

    // cálculo da duração
    const dur = intervalToDuration({ start: evolution1.date, end: evolution2.date });
    const dateDiff = {
      years: dur.years ?? 0,
      months: dur.months ?? 0,
      days: dur.days ?? 0,
    };

    return {
      evolution1: evolution1,
      evolution2: evolution2,
      differences: {
        ...differences,
        dateDifference: dateDiff
      }
    };
  }

  async getLastEvolutions(userId: number): Promise<Evolution[]> {
    return this.evolutionRepository.findLastEvolutions(userId, 1);
  }

  async getLastTwoEvolutions(userId: number): Promise<Evolution[]> {
    return this.evolutionRepository.findLastEvolutions(userId, 2);
  }


}
