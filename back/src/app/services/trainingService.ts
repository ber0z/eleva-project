// src/services/trainingService.ts
import { PrismaClient, DayOfWeek } from "@prisma/client";
import { prisma } from "../lib/prismaClient";
import { TrainingRepository } from "../repositories/trainingRepository";
import { uploadTrainingDocumentR2 } from "../services/uploadService";
import { deleteR2Keys } from "../services/r2Service";
import type { z } from "zod";
import { trainingCreateSchema, dayOfWeekEnum, TrainingUpdateBody } from "../schemas/trainingSchema";
import { NotFoundError } from "../errors/appErrors";

type CreateDTO = z.infer<typeof trainingCreateSchema>;

export class TrainingService {
    private repo = new TrainingRepository();
    private db: PrismaClient = prisma;

    async createOwned(
        idUser: number,
        data: CreateDTO,
        doc?: { buffer: Buffer; contentType?: string; originalName?: string },
        idProfessional?: number
    ) {
        let uploadedKey: string | null = null;

        try {
            // 1) se veio doc, sobe primeiro
            let docFields: { documentPath?: string | null; documentType?: string | null; documentSize?: number | null } = {};
            if (doc?.buffer) {
                const up = await uploadTrainingDocumentR2({
                    userId: idUser,
                    buffer: doc.buffer,
                    contentType: doc.contentType,
                    originalName: doc.originalName
                });
                uploadedKey = up.key;
                docFields = { documentPath: up.key, documentType: doc.contentType ?? null, documentSize: up.size };
            }

            // 2) tx: cria training + workouts + exercises
            const created = await this.db.$transaction(async (tx) => {
                const training = await this.repo.createTraining(
                    { idUser, title: data.title ?? null, notes: data.notes ?? null, ...(idProfessional ? { idProfessional } : {}), ...docFields },
                    tx
                );

                const ids = Array.from(new Set(
                    data.workouts.flatMap(w =>
                        w.exercises.map(e => e.exerciseId).filter((v): v is number => typeof v === "number")
                    )
                ));
                const baseRows = await this.repo.findExercisesByIds(ids, tx);
                const baseMap = new Map(baseRows.map(r => [r.id, r]));

                // ✅ valida ids inexistentes
                const missing = ids.filter(id => !baseMap.has(id));
                if (missing.length) {
                    // escolha A: erro 400 explícito
                    throw new NotFoundError(`Exercise(s) not found: ${missing.join(", ")}`, "exerciseId");
                    // escolha B (se preferir não falhar): transformar ids inválidos em null
                    // (se usar B, remova o throw e mantenha o mapeamento abaixo como está)
                }

                for (const w of data.workouts) {
                    const wk = await this.repo.createWorkout(
                        { idTraining: training.id, title: w.title, notes: w.notes ?? null, dayOfWeek: w.dayOfWeek as DayOfWeek },
                        tx
                    );

                    const items = w.exercises.map((e, idx) => {
                        const base = e.exerciseId ? baseMap.get(e.exerciseId) : undefined;
                        return {
                            idWorkout: wk.id,
                            exerciseId: base ? e.exerciseId! : null,   // ✅ só persiste FK se existir
                            name: e.name ?? base?.name ?? "Exercise",
                            technique: e.technique ?? null,
                            restTime: e.restTime ?? null,
                            sets: e.sets ?? 0,
                            reps: e.reps ?? null,
                            weight: e.weight ?? null,
                            type: e.type ?? base?.type ?? null,
                            notes: e.notes ?? null,
                            order: idx,
                        };
                    });

                    await this.repo.createExercisesBulk(items, tx);
                }

                return this.repo.findTrainingOwned(training.id, idUser, tx);
            });

            return created;
        } catch (err) {
            // rollback do upload se a tx falhar
            if (uploadedKey) await deleteR2Keys([uploadedKey]).catch(() => { });
            throw err;
        }
    }

    async updateOwned(
        id: number,
        idUser: number,
        data: TrainingUpdateBody,
        doc?: { buffer: Buffer; contentType?: string; originalName?: string }
    ) {
        let newKey: string | null = null;
        let oldKeyToDelete: string | null = null;

        try {
            // 1) upload do novo documento (antes da TX)
            if (doc?.buffer) {
                const up = await uploadTrainingDocumentR2({
                    userId: idUser,
                    buffer: doc.buffer,
                    contentType: doc.contentType,
                    originalName: doc.originalName,
                });
                newKey = up.key;
            }

            const updated = await this.db.$transaction(async (tx) => {
                // 2) estado atual
                const current = await this.repo.findTrainingOwned(id, idUser, tx);
                if (!current) return null;

                // 3) decidir campos de documento
                let documentPath: string | null | undefined = undefined;
                let documentType: string | null | undefined = undefined;
                let documentSize: number | null | undefined = undefined;

                if (newKey) {
                    oldKeyToDelete = current.documentPath ?? null;
                    documentPath = newKey;
                    documentType = doc?.contentType ?? null;
                    documentSize = doc?.buffer.length ?? null;
                } else if (data.deleteDocument) {
                    if (current.documentPath) oldKeyToDelete = current.documentPath;
                    documentPath = null;
                    documentType = null;
                    documentSize = null;
                }

                // 4) atualizar topo do treino
                await this.repo.updateTrainingOwned(
                    id,
                    idUser,
                    {
                        title: data.title ?? undefined,
                        notes: data.notes ?? undefined,
                        documentPath,
                        documentType,
                        documentSize,
                    },
                    tx
                );

                // 5) sincronização de listas (somente se workouts veio)
                if (Array.isArray(data.workouts)) {
                    // mapa de workouts atuais
                    const existingWorkouts = new Map(current.workouts.map((w) => [w.id, w]));
                    const seenWorkoutIds = new Set<number>();

                    // validar exerciseId presentes no payload
                    const allPayloadExerciseIds = Array.from(
                        new Set(
                            data.workouts
                                .flatMap((w) => w.exercises ?? [])
                                .map((e) => e.exerciseId)
                                .filter((v): v is number => typeof v === "number")
                        )
                    );
                    const baseRows = await this.repo.findExercisesByIds(allPayloadExerciseIds, tx);
                    const baseMap = new Map(baseRows.map((r) => [r.id, r]));
                    const missing = allPayloadExerciseIds.filter((eid) => !baseMap.has(eid));
                    if (missing.length) {
                        throw new NotFoundError(`Exercise(s) not found: ${missing.join(", ")}`, "exerciseId");
                    }

                    // para cada workout do payload
                    for (const w of data.workouts) {
                        // 5.1 cria/atualiza workout
                        let workoutId: number;
                        if (w.id && existingWorkouts.has(w.id)) {
                            workoutId = w.id;
                            await this.repo.updateWorkout(
                                workoutId,
                                {
                                    title: w.title,
                                    notes: w.notes ?? null,
                                    dayOfWeek: w.dayOfWeek as unknown as DayOfWeek,
                                },
                                tx
                            );
                        } else {
                            const wk = await this.repo.createWorkout(
                                {
                                    idTraining: id,
                                    title: w.title,
                                    notes: w.notes ?? null,
                                    dayOfWeek: w.dayOfWeek as unknown as DayOfWeek,
                                },
                                tx
                            );
                            workoutId = wk.id;
                        }
                        seenWorkoutIds.add(workoutId);

                        // 5.2 exercises existentes desse workout (snapshot atual)
                        const existingForThis = existingWorkouts.get(workoutId)?.exercises ?? [];
                        const existingExercises = new Map(existingForThis.map((e) => [e.id, e]));
                        const seenExerciseIds = new Set<number>();

                        // acumular criações
                        const toCreate: Array<{
                            idWorkout: number;
                            exerciseId?: number | null;
                            name: string;
                            technique?: string | null;
                            restTime?: number | null;
                            sets: number;
                            reps?: number | null;
                            weight?: number | null;
                            type?: string | null;
                            notes?: string | null;
                            order: number;
                        }> = [];

                        // 5.3 UPDATE / COLLECT CREATES
                        const exercises = w.exercises ?? [];
                        for (let exIdx = 0; exIdx < exercises.length; exIdx++) {
                            const e = exercises[exIdx];
                            const base = typeof e.exerciseId === "number" ? baseMap.get(e.exerciseId) : undefined;

                            if (e.id && existingExercises.has(e.id)) {
                                // preparar relação exercise (connect/disconnect/none)
                                const exerciseRel =
                                    e.exerciseId === null
                                        ? { disconnect: true }
                                        : typeof e.exerciseId === "number"
                                            ? { connect: { id: e.exerciseId } }
                                            : undefined;

                                // ⚠️ usar modo "checado": relações aninhadas (sem idWorkout/exerciseId escalares)
                                await tx.trainingExercise.update({
                                    where: { id: e.id },
                                    data: {
                                        workout: { connect: { id: workoutId } }, // mover entre workouts, se necessário
                                        ...(exerciseRel ? { exercise: exerciseRel } : {}),
                                        name: e.name ?? base?.name ?? "Exercise",
                                        technique: e.technique ?? null,
                                        restTime: e.restTime ?? null,
                                        sets: e.sets ?? existingExercises.get(e.id)!.sets,
                                        reps: e.reps ?? null,
                                        weight: e.weight ?? null,
                                        type: e.type ?? base?.type ?? null,
                                        notes: e.notes ?? null,
                                        order: exIdx,
                                    },
                                });

                                seenExerciseIds.add(e.id);
                            } else {
                                // será criado depois do DELETE
                                toCreate.push({
                                    idWorkout: workoutId,
                                    exerciseId: typeof e.exerciseId === "number" ? e.exerciseId : null,
                                    name: e.name ?? base?.name ?? "Exercise",
                                    technique: e.technique ?? null,
                                    restTime: e.restTime ?? null,
                                    sets: e.sets ?? 0,
                                    reps: e.reps ?? null,
                                    weight: e.weight ?? null,
                                    type: e.type ?? base?.type ?? null,
                                    notes: e.notes ?? null,
                                    order: exIdx,
                                });
                            }
                        }

                        // 5.4 DELETE dos exercises não enviados
                        await this.repo.deleteExercisesByWorkoutNotIn(workoutId, Array.from(seenExerciseIds), tx);

                        // 5.5 CREATE dos novos
                        if (toCreate.length) {
                            await this.repo.createExercisesBulk(toCreate, tx);
                        }
                    }

                    // 5.6 DELETE de workouts não enviados (cascata remove seus exercises)
                    await this.repo.deleteWorkoutsByIdsNotIn(id, Array.from(seenWorkoutIds), tx);
                }

                // 6) retorno final
                return this.repo.findTrainingOwned(id, idUser, tx);
            });

            // 7) pós-commit: apaga doc antigo (best-effort)
            if (oldKeyToDelete) {
                const failed = await deleteR2Keys([oldKeyToDelete]);
                if (failed.length) console.warn("[R2] falha ao apagar documento antigo:", failed);
            }

            return updated;
        } catch (err) {
            // rollback do upload novo se TX falhar
            if (newKey) await deleteR2Keys([newKey]).catch(() => { });
            throw err;
        }
    }

    async getByIdOwned(id: number, idUser: number) {
        return this.repo.findTrainingOwned(id, idUser);
    }

    async listByUser(idUser: number, p: { page: number; pageSize: number; dayOfWeek?: z.infer<typeof dayOfWeekEnum> }) {
        const skip = (p.page - 1) * p.pageSize;
        const [rows, total] = await Promise.all([
            this.repo.listByUser(idUser, { skip, take: p.pageSize, dayOfWeek: p.dayOfWeek as unknown as DayOfWeek | undefined }),
            this.repo.countByUser(idUser),
        ]);
        return { items: rows, total, page: p.page, pageSize: p.pageSize };
    }

    async getWorkoutById(workoutId: number, idUser: number) {
        return this.repo.findWorkoutById(workoutId, idUser);
    }

    async deleteOwned(id: number, idUser: number) {
        // pegue a key antes
        const current = await this.repo.findTrainingOwned(id, idUser);
        if (!current) return false;

        const ok = await this.repo.deleteTrainingOwned(id, idUser);
        if (!ok) return false;

        if (current.documentPath) {
            const failed = await deleteR2Keys([current.documentPath]);
            if (failed.length) console.warn("[R2] falha ao apagar documento do treino:", failed);
        }
        return true;
    }

    async getByIdForProfessional(trainingId: number, userId: number) {
        return this.repo.findTrainingForProfessional(trainingId, userId);
    }

    async deleteByProfessional(trainingId: number, professionalId: number) {
        const current = await this.repo.findDocPathByProfessional(trainingId, professionalId);
        if (!current) throw new NotFoundError("Treino não encontrado ou você não é o criador deste treino");

        const ok = await this.repo.deleteTrainingByProfessional(trainingId, professionalId);
        if (!ok) throw new NotFoundError("Treino não encontrado ou você não é o criador deste treino");

        if (current.documentPath) {
            const failed = await deleteR2Keys([current.documentPath]);
            if (failed.length) console.warn("[R2] falha ao apagar documento do treino:", failed);
        }
        return true;
    }

    async updateByProfessional(
        trainingId: number,
        userId: number,
        professionalId: number,
        data: TrainingUpdateBody,
        doc?: { buffer: Buffer; contentType?: string; originalName?: string }
    ) {
        let newKey: string | null = null;
        let oldKeyToDelete: string | null = null;

        try {
            if (doc?.buffer) {
                const up = await uploadTrainingDocumentR2({
                    userId,
                    buffer: doc.buffer,
                    contentType: doc.contentType,
                    originalName: doc.originalName,
                });
                newKey = up.key;
            }

            const updated = await this.db.$transaction(async (tx) => {
                const current = await this.repo.findTrainingForProfessional(trainingId, userId, tx);
                if (!current || current.idProfessional !== professionalId) {
                    throw new NotFoundError("Treino não encontrado ou você não é o criador deste treino");
                }

                let documentPath: string | null | undefined = undefined;
                let documentType: string | null | undefined = undefined;
                let documentSize: number | null | undefined = undefined;

                if (newKey) {
                    oldKeyToDelete = current.documentPath ?? null;
                    documentPath = newKey;
                    documentType = doc?.contentType ?? null;
                    documentSize = doc?.buffer.length ?? null;
                } else if (data.deleteDocument) {
                    if (current.documentPath) oldKeyToDelete = current.documentPath;
                    documentPath = null;
                    documentType = null;
                    documentSize = null;
                }

                await this.repo.updateTrainingByProfessional(
                    trainingId,
                    professionalId,
                    { title: data.title ?? undefined, notes: data.notes ?? undefined, documentPath, documentType, documentSize },
                    tx
                );

                if (Array.isArray(data.workouts)) {
                    const existingWorkouts = new Map(current.workouts.map((w) => [w.id, w]));
                    const seenWorkoutIds = new Set<number>();

                    const allPayloadExerciseIds = Array.from(
                        new Set(
                            data.workouts
                                .flatMap((w) => w.exercises ?? [])
                                .map((e) => e.exerciseId)
                                .filter((v): v is number => typeof v === "number")
                        )
                    );
                    const baseRows = await this.repo.findExercisesByIds(allPayloadExerciseIds, tx);
                    const baseMap = new Map(baseRows.map((r) => [r.id, r]));
                    const missing = allPayloadExerciseIds.filter((eid) => !baseMap.has(eid));
                    if (missing.length) {
                        throw new NotFoundError(`Exercise(s) not found: ${missing.join(", ")}`, "exerciseId");
                    }

                    for (const w of data.workouts) {
                        let workoutId: number;
                        if (w.id && existingWorkouts.has(w.id)) {
                            workoutId = w.id;
                            await this.repo.updateWorkout(workoutId, { title: w.title, notes: w.notes ?? null, dayOfWeek: w.dayOfWeek as unknown as DayOfWeek }, tx);
                        } else {
                            const wk = await this.repo.createWorkout({ idTraining: trainingId, title: w.title, notes: w.notes ?? null, dayOfWeek: w.dayOfWeek as unknown as DayOfWeek }, tx);
                            workoutId = wk.id;
                        }
                        seenWorkoutIds.add(workoutId);

                        const existingForThis = existingWorkouts.get(workoutId)?.exercises ?? [];
                        const existingExercises = new Map(existingForThis.map((e) => [e.id, e]));
                        const seenExerciseIds = new Set<number>();
                        const toCreate: Array<{
                            idWorkout: number; exerciseId?: number | null; name: string; technique?: string | null;
                            restTime?: number | null; sets: number; reps?: number | null; weight?: number | null;
                            type?: string | null; notes?: string | null; order: number;
                        }> = [];

                        const exercises = w.exercises ?? [];
                        for (let exIdx = 0; exIdx < exercises.length; exIdx++) {
                            const e = exercises[exIdx];
                            const base = typeof e.exerciseId === "number" ? baseMap.get(e.exerciseId) : undefined;

                            if (e.id && existingExercises.has(e.id)) {
                                const exerciseRel =
                                    e.exerciseId === null ? { disconnect: true } :
                                    typeof e.exerciseId === "number" ? { connect: { id: e.exerciseId } } :
                                    undefined;

                                await tx.trainingExercise.update({
                                    where: { id: e.id },
                                    data: {
                                        workout: { connect: { id: workoutId } },
                                        ...(exerciseRel ? { exercise: exerciseRel } : {}),
                                        name: e.name ?? base?.name ?? "Exercise",
                                        technique: e.technique ?? null,
                                        restTime: e.restTime ?? null,
                                        sets: e.sets ?? existingExercises.get(e.id)!.sets,
                                        reps: e.reps ?? null,
                                        weight: e.weight ?? null,
                                        type: e.type ?? base?.type ?? null,
                                        notes: e.notes ?? null,
                                    },
                                });
                                seenExerciseIds.add(e.id);
                            } else {
                                toCreate.push({
                                    idWorkout: workoutId,
                                    exerciseId: typeof e.exerciseId === "number" ? e.exerciseId : null,
                                    name: e.name ?? base?.name ?? "Exercise",
                                    technique: e.technique ?? null,
                                    restTime: e.restTime ?? null,
                                    sets: e.sets ?? 0,
                                    reps: e.reps ?? null,
                                    weight: e.weight ?? null,
                                    type: e.type ?? base?.type ?? null,
                                    notes: e.notes ?? null,
                                    order: exIdx,
                                });
                            }
                        }

                        await this.repo.deleteExercisesByWorkoutNotIn(workoutId, Array.from(seenExerciseIds), tx);
                        if (toCreate.length) await this.repo.createExercisesBulk(toCreate, tx);
                    }

                    await this.repo.deleteWorkoutsByIdsNotIn(trainingId, Array.from(seenWorkoutIds), tx);
                }

                return this.repo.findTrainingForProfessional(trainingId, userId, tx);
            });

            if (oldKeyToDelete) {
                const failed = await deleteR2Keys([oldKeyToDelete]);
                if (failed.length) console.warn("[R2] falha ao apagar documento antigo:", failed);
            }

            return updated;
        } catch (err) {
            if (newKey) await deleteR2Keys([newKey]).catch(() => { });
            throw err;
        }
    }
}
