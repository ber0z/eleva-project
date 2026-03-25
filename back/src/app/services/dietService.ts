import { PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prismaClient";
import { DietRepository, DietUpdateTopInput } from "../repositories/dietRepository";
import { uploadDietDocumentR2 } from "./uploadService";
import { deleteR2Keys } from "../services/r2Service";
import type { DietCreateBody, DietUpdateBody } from "../schemas/dietSchema";
import { NotFoundError } from "../errors/appErrors";



type MacroTotals = {
  protein: number;
  carbs: number;
  fat: number;
};

function sumMealsMacros(
  meals: Array<{ protein?: number; carbs?: number; fat?: number }>
): MacroTotals {
  return meals.reduce<MacroTotals>(
    (acc, m) => {
      acc.protein += m.protein ?? 0;
      acc.carbs += m.carbs ?? 0;
      acc.fat += m.fat ?? 0;
      return acc;
    },
    { protein: 0, carbs: 0, fat: 0 }
  );
}

export class DietService {
  private db: PrismaClient = prisma;
  private repo = new DietRepository();



  async createOwned(
    idUser: number,
    body: DietCreateBody,
    doc?: { buffer: Buffer; contentType?: string; originalName?: string },
    idProfessional?: number
  ) {
    let uploadedKey: string | null = null;

    try {
      // 1. documento
      let docFields = {
        documentPath: null as string | null,
        documentType: null as string | null,
        documentSize: null as number | null,
      };

      if (doc?.buffer) {
        const up = await uploadDietDocumentR2({
          userId: idUser,
          buffer: doc.buffer,
          contentType: doc.contentType,
          originalName: doc.originalName,
        });
        uploadedKey = up.key;
        docFields = {
          documentPath: up.key,
          documentType: doc.contentType ?? null,
          documentSize: up.size,
        };
      }

      // 2. macros totais
      const mealsInput = body.meals.map(m => ({
        title: m.title,
        time: m.time ?? null,
        meal: m.meal,
        notes: m.notes ?? null,
        protein: m.protein ?? 0,
        carbs: m.carbs ?? 0,
        fat: m.fat ?? 0,
      }));

      let totalProtein = body.protein;
      let totalCarbs = body.carbs;
      let totalFat = body.fat;

      if (
        totalProtein === undefined ||
        totalCarbs === undefined ||
        totalFat === undefined
      ) {
        const sums = sumMealsMacros(mealsInput);
        if (totalProtein === undefined) totalProtein = sums.protein;
        if (totalCarbs === undefined) totalCarbs = sums.carbs;
        if (totalFat === undefined) totalFat = sums.fat;
      }

      // 3. transação
      const created = await this.db.$transaction(async (tx) => {
        return this.repo.createDiet(
          {
            idUser,
            ...(idProfessional ? { idProfessional } : {}),
            title: body.title,
            notes: body.notes ?? null,
            date: body.date,

            protein: totalProtein ?? 0,
            carbs: totalCarbs ?? 0,
            fat: totalFat ?? 0,

            ...docFields,
            meals: mealsInput,
          },
          tx
        );
      });

      return created;
    } catch (err) {
      if (uploadedKey) await deleteR2Keys([uploadedKey]).catch(() => { });
      throw err;
    }
  }

  async getByIdOwned(id: number, idUser: number) {
    return this.repo.findOwned(id, idUser);
  }

  async listByUser(idUser: number, p: { page: number; pageSize: number; dateFrom?: Date; dateTo?: Date }) {
    return this.repo.listByUser(idUser, p);
  }

  async updateOwned(
    id: number,
    idUser: number,
    data: DietUpdateBody,
    doc?: { buffer: Buffer; contentType?: string; originalName?: string }
  ) {
    let newKey: string | null = null;
    let oldKeyToDelete: string | null = null;

    try {
      // upload prévio do novo doc
      if (doc?.buffer) {
        const up = await uploadDietDocumentR2({
          userId: idUser,
          buffer: doc.buffer,
          contentType: doc.contentType,
          originalName: doc.originalName,
        });
        newKey = up.key;
      }

      const updated = await this.db.$transaction(async (tx) => {
        const current = await this.repo.findOwned(id, idUser, tx);
        if (!current) return null;

        // 1. preparar atualização top-level
        const top: DietUpdateTopInput = {};

        // documento
        if (newKey) {
          oldKeyToDelete = current.documentPath ?? null;
          top.documentPath = newKey;
          top.documentType = doc?.contentType ?? null;
          top.documentSize = doc?.buffer.length ?? null;
        } else if (data.deleteDocument) {
          if (current.documentPath) oldKeyToDelete = current.documentPath;
          top.documentPath = null;
          top.documentType = null;
          top.documentSize = null;
        }

        if (data.title !== undefined) top.title = data.title;
        if (data.notes !== undefined) top.notes = data.notes ?? null;
        if (data.date !== undefined) top.date = data.date;

        // macros totais explícitas no payload?
        const explicitTotalsProvided =
          data.protein !== undefined ||
          data.carbs !== undefined ||
          data.fat !== undefined;

        if (explicitTotalsProvided) {
          if (data.protein !== undefined) top.protein = data.protein;
          if (data.carbs !== undefined) top.carbs = data.carbs;
          if (data.fat !== undefined) top.fat = data.fat;
        }

        // atualiza Diet (top-level) agora
        await this.repo.updateTopOwned(id, idUser, top, tx);

        // 2. se veio `meals`, sincroniza meals
        if (Array.isArray(data.meals)) {
          const existingMap = new Map(current.meals.map(m => [m.id, m]));
          const seenIds = new Set<number>();
          const toCreate: Array<{
            title: string;
            time?: string | null;
            meal: string;
            notes?: string | null;
            protein?: number;
            carbs?: number;
            fat?: number;
          }> = [];

          for (const m of data.meals) {
            if (m.id && existingMap.has(m.id)) {
              const prev = existingMap.get(m.id)!;
              await this.repo.updateMeal(
                m.id,
                {
                  title: m.title ?? prev.title,
                  time: m.time ?? prev.time,
                  meal: m.meal ?? prev.meal,
                  notes: m.notes ?? prev.notes,
                  protein: m.protein ?? prev.protein,
                  carbs: m.carbs ?? prev.carbs,
                  fat: m.fat ?? prev.fat,
                },
                tx
              );
              seenIds.add(m.id);
            } else {
              toCreate.push({
                title: m.title ?? "Refeição",
                time: m.time ?? null,
                meal: m.meal ?? "",
                notes: m.notes ?? null,
                protein: m.protein ?? 0,
                carbs: m.carbs ?? 0,
                fat: m.fat ?? 0,
              });
            }
          }

          // apaga refeições não enviadas
          await this.repo.deleteMealsNotIn(id, Array.from(seenIds), tx);

          // cria as novas
          if (toCreate.length) {
            await this.repo.createMealsBulk(id, toCreate, tx);
          }

          // 3. se NÃO mandou macros totais explícitas,
          //    recalcular com base no estado final das meals
          if (!explicitTotalsProvided) {
            // recarrega meals atualizadas
            const fresh = await this.repo.findOwned(id, idUser, tx);
            if (!fresh) return null;

            const sums = sumMealsMacros(fresh.meals);
            await this.repo.updateTopOwned(
              id,
              idUser,
              {
                protein: sums.protein,
                carbs: sums.carbs,
                fat: sums.fat,
              },
              tx
            );

            return this.repo.findOwned(id, idUser, tx);
          }
        }

        // se não teve meals OU já tinha macros explícitas,
        // retorna estado final
        return this.repo.findOwned(id, idUser, tx);
      });

      // pós-commit: tenta apagar doc antigo
      if (oldKeyToDelete) {
        const failed = await deleteR2Keys([oldKeyToDelete]);
        if (failed.length) {
          console.warn("[R2] falha ao apagar documento antigo da Diet:", failed);
        }
      }

      return updated;
    } catch (err) {
      if (newKey) await deleteR2Keys([newKey]).catch(() => { });
      throw err;
    }
  }

  async getByIdForProfessional(dietId: number, userId: number) {
    return this.repo.findOwned(dietId, userId);
  }

  async deleteByProfessional(dietId: number, professionalId: number) {
    const current = await this.repo.findDocPathByProfessional(dietId, professionalId);
    if (!current) throw new NotFoundError("Dieta não encontrada ou você não é o criador desta dieta");

    const ok = await this.repo.deleteDietByProfessional(dietId, professionalId);
    if (!ok) throw new NotFoundError("Dieta não encontrada ou você não é o criador desta dieta");

    if (current.documentPath) {
      const failed = await deleteR2Keys([current.documentPath]);
      if (failed.length) console.warn("[R2] falha ao apagar documento da Diet:", failed);
    }
    return true;
  }

  async updateByProfessional(
    dietId: number,
    userId: number,
    professionalId: number,
    data: DietUpdateBody,
    doc?: { buffer: Buffer; contentType?: string; originalName?: string }
  ) {
    let newKey: string | null = null;
    let oldKeyToDelete: string | null = null;

    try {
      if (doc?.buffer) {
        const up = await uploadDietDocumentR2({
          userId,
          buffer: doc.buffer,
          contentType: doc.contentType,
          originalName: doc.originalName,
        });
        newKey = up.key;
      }

      const updated = await this.db.$transaction(async (tx) => {
        const current = await this.repo.findOwned(dietId, userId, tx);
        if (!current || current.idProfessional !== professionalId) {
          throw new NotFoundError("Dieta não encontrada ou você não é o criador desta dieta");
        }

        const top: DietUpdateTopInput = {};

        if (newKey) {
          oldKeyToDelete = current.documentPath ?? null;
          top.documentPath = newKey;
          top.documentType = doc?.contentType ?? null;
          top.documentSize = doc?.buffer.length ?? null;
        } else if (data.deleteDocument) {
          if (current.documentPath) oldKeyToDelete = current.documentPath;
          top.documentPath = null;
          top.documentType = null;
          top.documentSize = null;
        }

        if (data.title !== undefined) top.title = data.title;
        if (data.notes !== undefined) top.notes = data.notes ?? null;
        if (data.date !== undefined) top.date = data.date;

        const explicitTotalsProvided =
          data.protein !== undefined ||
          data.carbs !== undefined ||
          data.fat !== undefined;

        if (explicitTotalsProvided) {
          if (data.protein !== undefined) top.protein = data.protein;
          if (data.carbs !== undefined) top.carbs = data.carbs;
          if (data.fat !== undefined) top.fat = data.fat;
        }

        await this.repo.updateTopOwned(dietId, userId, top, tx);

        if (Array.isArray(data.meals)) {
          const existingMap = new Map(current.meals.map(m => [m.id, m]));
          const seenIds = new Set<number>();
          const toCreate: Array<{
            title: string; time?: string | null; meal: string; notes?: string | null;
            protein?: number; carbs?: number; fat?: number;
          }> = [];

          for (const m of data.meals) {
            if (m.id && existingMap.has(m.id)) {
              const prev = existingMap.get(m.id)!;
              await this.repo.updateMeal(m.id, {
                title: m.title ?? prev.title,
                time: m.time ?? prev.time,
                meal: m.meal ?? prev.meal,
                notes: m.notes ?? prev.notes,
                protein: m.protein ?? prev.protein,
                carbs: m.carbs ?? prev.carbs,
                fat: m.fat ?? prev.fat,
              }, tx);
              seenIds.add(m.id);
            } else {
              toCreate.push({
                title: m.title ?? "Refeição",
                time: m.time ?? null,
                meal: m.meal ?? "",
                notes: m.notes ?? null,
                protein: m.protein ?? 0,
                carbs: m.carbs ?? 0,
                fat: m.fat ?? 0,
              });
            }
          }

          await this.repo.deleteMealsNotIn(dietId, Array.from(seenIds), tx);

          if (toCreate.length) {
            await this.repo.createMealsBulk(dietId, toCreate, tx);
          }

          if (!explicitTotalsProvided) {
            const fresh = await this.repo.findOwned(dietId, userId, tx);
            if (!fresh) return null;
            const sums = sumMealsMacros(fresh.meals);
            await this.repo.updateTopOwned(dietId, userId, { protein: sums.protein, carbs: sums.carbs, fat: sums.fat }, tx);
            return this.repo.findOwned(dietId, userId, tx);
          }
        }

        return this.repo.findOwned(dietId, userId, tx);
      });

      if (oldKeyToDelete) {
        const failed = await deleteR2Keys([oldKeyToDelete]);
        if (failed.length) console.warn("[R2] falha ao apagar documento antigo da Diet:", failed);
      }

      return updated;
    } catch (err) {
      if (newKey) await deleteR2Keys([newKey]).catch(() => { });
      throw err;
    }
  }

  async deleteOwned(id: number, idUser: number) {
    // buscar somente path para apagar do R2 (sem carregar meals)
    const current = await this.repo.findOwned(id, idUser);
    if (!current) return false;

    const ok = await this.repo.deleteOwned(id, idUser);
    if (!ok) return false;

    if (current.documentPath) {
      const failed = await deleteR2Keys([current.documentPath]);
      if (failed.length) console.warn("[R2] falha ao apagar documento da Diet:", failed);
    }
    return true;
  }
}
