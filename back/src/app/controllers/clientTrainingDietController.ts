import { FastifyRequest, FastifyReply } from "fastify";
import type { MultipartFile } from "@fastify/multipart";
import fs from "fs/promises";
import { ZodError } from "zod";
import { z } from "zod";
import { unwrapMultipartBody } from "../utils/multiparty";
import { isAllowedDoc } from "../utils/mime";
import { TrainingService } from "../services/trainingService";
import { DietService } from "../services/dietService";
import { NotificationService } from "../services/notificationService";
import { ProfessionalLinkRepository } from "../repositories/professionalLinkRepository";
import { TrainingRepository } from "../repositories/trainingRepository";
import { DietRepository } from "../repositories/dietRepository";
import { trainingCreateSchema, trainingUpdateSchema } from "../schemas/trainingSchema";
import { getTrainingDocumentUrlByKey, getDietDocumentUrlByKey } from "../services/uploadService";
import { dietCreateSchema, dietUpdateSchema } from "../schemas/dietSchema";
import { ForbiddenError, NotFoundError } from "../errors/appErrors";

const userIdParamSchema = z.object({ userId: z.coerce.number().int().positive() });
const trainingParamSchema = z.object({ userId: z.coerce.number().int().positive(), id: z.coerce.number().int().positive() });
const dietParamSchema = z.object({ userId: z.coerce.number().int().positive(), id: z.coerce.number().int().positive() });
const listQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(50).default(10),
});

interface SavedFile extends MultipartFile { filepath: string; }

export class ClientTrainingDietController {
    private trainingService = new TrainingService();
    private dietService = new DietService();
    private notificationService = new NotificationService();
    private linkRepo = new ProfessionalLinkRepository();
    private trainingRepo = new TrainingRepository();
    private dietRepo = new DietRepository();

    private async verifyAcceptedLink(professionalId: number, userId: number) {
        const link = await this.linkRepo.findByProfessionalAndUser(professionalId, userId);
        if (!link || link.status !== "accepted") {
            throw new NotFoundError("Vínculo com cliente não encontrado ou não aceito");
        }
        return link;
    }

    private async verifyLinkAndPermission(professionalId: number, userId: number, requiredPermission: string) {
        const link = await this.verifyAcceptedLink(professionalId, userId);
        if (!link.permissions.includes(requiredPermission as any)) {
            throw new ForbiddenError(`Sem permissão: ${requiredPermission}`);
        }
        return link;
    }

    private async parseMultipartBody(req: FastifyRequest, jsonField: string) {
        const files = (await req.saveRequestFiles({
            limits: { fileSize: 5 * 1024 * 1024 }
        })) as SavedFile[];

        const raw = req.body as Record<string, unknown>;
        const unwrapped = unwrapMultipartBody(raw);

        if (typeof unwrapped[jsonField] === "string") {
            try {
                unwrapped[jsonField] = JSON.parse(unwrapped[jsonField] as string);
            } catch {
                await Promise.all(files.map(f => fs.unlink(f.filepath).catch(() => { })));
                throw new ZodError([{
                    code: "custom",
                    message: `Campo '${jsonField}' deve ser JSON válido`,
                    path: [jsonField],
                }]);
            }
        }

        let doc: { buffer: Buffer; contentType?: string; originalName?: string } | undefined;
        const file = files.find(f => f.fieldname === "document");
        try {
            if (file) {
                if (!isAllowedDoc(file.mimetype, file.filename)) {
                    await fs.unlink(file.filepath).catch(() => { });
                    throw new ZodError([{
                        code: "custom",
                        message: "Tipo de arquivo não permitido",
                        path: ["document"],
                    }]);
                }
                const buffer = await fs.readFile(file.filepath);
                doc = { buffer, contentType: file.mimetype, originalName: file.filename };
            }
        } finally {
            await Promise.all(files.map(f => fs.unlink(f.filepath).catch(() => { })));
        }

        return { bodyObj: unwrapped, doc };
    }

    createTrainingForClient = async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            const professionalId = req.auth!.subjectId;
            const { userId } = userIdParamSchema.parse(req.params);

            await this.verifyLinkAndPermission(professionalId, userId, "edit_training");

            const isMulti = typeof req.isMultipart === "function" && req.isMultipart();
            let bodyObj: unknown;
            let doc: { buffer: Buffer; contentType?: string; originalName?: string } | undefined;

            if (isMulti) {
                const parsed = await this.parseMultipartBody(req, "workouts");
                bodyObj = parsed.bodyObj;
                doc = parsed.doc;
            } else {
                bodyObj = req.body;
            }

            const body = trainingCreateSchema.parse(bodyObj);
            const created = await this.trainingService.createOwned(userId, body, doc, professionalId);

            // Notificar o cliente
            await this.notificationService.createForUser(userId, {
                type: "training_assigned",
                title: "Novo treino recebido",
                body: "Seu profissional criou um novo treino para você.",
                actorProfessionalId: professionalId,
            });

            return reply.code(201).send(created);
        } catch (err) {
            if (err instanceof ZodError) {
                return reply.code(400).send({ error: "Dados inválidos", details: err.issues });
            }
            if (err instanceof NotFoundError) {
                return reply.code(404).send({ error: err.message });
            }
            if (err instanceof ForbiddenError) {
                return reply.code(403).send({ error: err.message });
            }
            console.error("[ClientTrainingDietController] createTrainingForClient error:", err);
            return reply.code(500).send({ error: "Erro ao criar treino para cliente" });
        }
    };

    createDietForClient = async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            const professionalId = req.auth!.subjectId;
            const { userId } = userIdParamSchema.parse(req.params);

            await this.verifyLinkAndPermission(professionalId, userId, "edit_diet");

            const isMulti = typeof req.isMultipart === "function" && req.isMultipart();
            let bodyObj: unknown;
            let doc: { buffer: Buffer; contentType?: string; originalName?: string } | undefined;

            if (isMulti) {
                const parsed = await this.parseMultipartBody(req, "meals");
                bodyObj = parsed.bodyObj;
                doc = parsed.doc;
            } else {
                bodyObj = req.body;
            }

            const body = dietCreateSchema.parse(bodyObj);
            const created = await this.dietService.createOwned(userId, body, doc, professionalId);

            // Notificar o cliente
            await this.notificationService.createForUser(userId, {
                type: "diet_assigned",
                title: "Nova dieta recebida",
                body: "Seu profissional criou uma nova dieta para você.",
                actorProfessionalId: professionalId,
            });

            return reply.code(201).send(created);
        } catch (err) {
            if (err instanceof ZodError) {
                return reply.code(400).send({ error: "Dados inválidos", details: err.issues });
            }
            if (err instanceof NotFoundError) {
                return reply.code(404).send({ error: err.message });
            }
            if (err instanceof ForbiddenError) {
                return reply.code(403).send({ error: err.message });
            }
            console.error("[ClientTrainingDietController] createDietForClient error:", err);
            return reply.code(500).send({ error: "Erro ao criar dieta para cliente" });
        }
    };

    listTrainingsForClient = async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            const professionalId = req.auth!.subjectId;
            const { userId } = userIdParamSchema.parse(req.params);
            const { page, pageSize } = listQuerySchema.parse(req.query);

            const link = await this.verifyAcceptedLink(professionalId, userId);
            const skip = (page - 1) * pageSize;
            const { items, total } = await this.trainingRepo.listByProfessionalAndUser(
                professionalId, userId, { skip, take: pageSize }
            );

            return reply.code(200).send({
                items,
                total,
                page,
                pageSize,
                permissions: link.permissions,
            });
        } catch (err) {
            if (err instanceof ZodError) {
                return reply.code(400).send({ error: "Query inválida", details: err.issues });
            }
            if (err instanceof NotFoundError) {
                return reply.code(404).send({ error: err.message });
            }
            console.error("[ClientTrainingDietController] listTrainingsForClient error:", err);
            return reply.code(500).send({ error: "Erro ao listar treinos" });
        }
    };

    getTrainingForClient = async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            const professionalId = req.auth!.subjectId;
            const { userId, id: trainingId } = trainingParamSchema.parse(req.params);

            const link = await this.verifyAcceptedLink(professionalId, userId);
            const item = await this.trainingService.getByIdForProfessional(trainingId, userId);
            if (!item) return reply.code(404).send({ error: "Treino não encontrado" });

            let documentUrl: string | null = null;
            let documentUrlExpiresAt: string | null = null;
            if (item.documentPath) {
                const signed = await getTrainingDocumentUrlByKey(item.documentPath, 300, undefined, item.documentType ?? undefined);
                documentUrl = signed.url;
                documentUrlExpiresAt = signed.expiresAt;
            }

            const { documentPath: _dp, documentType: _dt, documentSize: _ds, ...rest } = item;

            return reply.code(200).send({
                training: { ...rest, documentUrl, documentUrlExpiresAt },
                permissions: link.permissions,
            });
        } catch (err) {
            if (err instanceof NotFoundError) return reply.code(404).send({ error: err.message });
            console.error("[ClientTrainingDietController] getTrainingForClient error:", err);
            return reply.code(500).send({ error: "Erro ao buscar treino" });
        }
    };

    deleteTrainingForClient = async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            const professionalId = req.auth!.subjectId;
            const { userId, id: trainingId } = trainingParamSchema.parse(req.params);

            await this.verifyLinkAndPermission(professionalId, userId, "edit_training");
            await this.trainingService.deleteByProfessional(trainingId, professionalId);

            return reply.code(200).send({ success: true });
        } catch (err) {
            if (err instanceof ZodError) return reply.code(400).send({ error: "Dados inválidos", details: err.issues });
            if (err instanceof NotFoundError) return reply.code(404).send({ error: err.message });
            if (err instanceof ForbiddenError) return reply.code(403).send({ error: err.message });
            console.error("[ClientTrainingDietController] deleteTrainingForClient error:", err);
            return reply.code(500).send({ error: "Erro ao excluir treino" });
        }
    };

    updateTrainingForClient = async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            const professionalId = req.auth!.subjectId;
            const { userId, id: trainingId } = trainingParamSchema.parse(req.params);

            await this.verifyLinkAndPermission(professionalId, userId, "edit_training");

            const isMulti = typeof req.isMultipart === "function" && req.isMultipart();
            let bodyObj: unknown;
            let doc: { buffer: Buffer; contentType?: string; originalName?: string } | undefined;

            if (isMulti) {
                const parsed = await this.parseMultipartBody(req, "workouts");
                bodyObj = parsed.bodyObj;
                doc = parsed.doc;
            } else {
                bodyObj = req.body;
            }

            const body = trainingUpdateSchema.parse(bodyObj);
            const updated = await this.trainingService.updateByProfessional(trainingId, userId, professionalId, body, doc);
            if (!updated) return reply.code(404).send({ error: "Treino não encontrado ou você não é o criador" });

            return reply.code(200).send(updated);
        } catch (err) {
            if (err instanceof ZodError) return reply.code(400).send({ error: "Dados inválidos", details: err.issues });
            if (err instanceof NotFoundError) return reply.code(404).send({ error: err.message });
            if (err instanceof ForbiddenError) return reply.code(403).send({ error: err.message });
            console.error("[ClientTrainingDietController] updateTrainingForClient error:", err);
            return reply.code(500).send({ error: "Erro ao atualizar treino" });
        }
    };

    listDietsForClient = async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            const professionalId = req.auth!.subjectId;
            const { userId } = userIdParamSchema.parse(req.params);
            const { page, pageSize } = listQuerySchema.parse(req.query);

            const link = await this.verifyAcceptedLink(professionalId, userId);
            const { items, total } = await this.dietRepo.listByProfessionalAndUser(
                professionalId, userId, { page, pageSize }
            );

            return reply.code(200).send({
                items,
                total,
                page,
                pageSize,
                permissions: link.permissions,
            });
        } catch (err) {
            if (err instanceof ZodError) {
                return reply.code(400).send({ error: "Query inválida", details: err.issues });
            }
            if (err instanceof NotFoundError) {
                return reply.code(404).send({ error: err.message });
            }
            console.error("[ClientTrainingDietController] listDietsForClient error:", err);
            return reply.code(500).send({ error: "Erro ao listar dietas" });
        }
    };

    getDietForClient = async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            const professionalId = req.auth!.subjectId;
            const { userId, id: dietId } = dietParamSchema.parse(req.params);

            const link = await this.verifyAcceptedLink(professionalId, userId);
            const item = await this.dietService.getByIdForProfessional(dietId, userId);
            if (!item) return reply.code(404).send({ error: "Dieta não encontrada" });

            let documentUrl: string | null = null;
            let documentUrlExpiresAt: string | null = null;
            if (item.documentPath) {
                const signed = await getDietDocumentUrlByKey(item.documentPath, 300, undefined, item.documentType ?? undefined);
                documentUrl = signed.url;
                documentUrlExpiresAt = signed.expiresAt;
            }

            const { documentPath: _dp, documentType: _dt, documentSize: _ds, ...rest } = item;

            return reply.code(200).send({
                diet: { ...rest, documentUrl, documentUrlExpiresAt },
                permissions: link.permissions,
            });
        } catch (err) {
            if (err instanceof NotFoundError) return reply.code(404).send({ error: err.message });
            console.error("[ClientTrainingDietController] getDietForClient error:", err);
            return reply.code(500).send({ error: "Erro ao buscar dieta" });
        }
    };

    deleteDietForClient = async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            const professionalId = req.auth!.subjectId;
            const { userId, id: dietId } = dietParamSchema.parse(req.params);

            await this.verifyLinkAndPermission(professionalId, userId, "edit_diet");
            await this.dietService.deleteByProfessional(dietId, professionalId);

            return reply.code(200).send({ success: true });
        } catch (err) {
            if (err instanceof ZodError) return reply.code(400).send({ error: "Dados inválidos", details: err.issues });
            if (err instanceof NotFoundError) return reply.code(404).send({ error: err.message });
            if (err instanceof ForbiddenError) return reply.code(403).send({ error: err.message });
            console.error("[ClientTrainingDietController] deleteDietForClient error:", err);
            return reply.code(500).send({ error: "Erro ao excluir dieta" });
        }
    };

    updateDietForClient = async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            const professionalId = req.auth!.subjectId;
            const { userId, id: dietId } = dietParamSchema.parse(req.params);

            await this.verifyLinkAndPermission(professionalId, userId, "edit_diet");

            const isMulti = typeof req.isMultipart === "function" && req.isMultipart();
            let bodyObj: unknown;
            let doc: { buffer: Buffer; contentType?: string; originalName?: string } | undefined;

            if (isMulti) {
                const parsed = await this.parseMultipartBody(req, "meals");
                bodyObj = parsed.bodyObj;
                doc = parsed.doc;
            } else {
                bodyObj = req.body;
            }

            const body = dietUpdateSchema.parse(bodyObj);
            const updated = await this.dietService.updateByProfessional(dietId, userId, professionalId, body, doc);
            if (!updated) return reply.code(404).send({ error: "Dieta não encontrada ou você não é o criador" });

            let documentUrl: string | null = null;
            let documentUrlExpiresAt: string | null = null;
            if (updated.documentPath) {
                const signed = await getDietDocumentUrlByKey(updated.documentPath, 300, undefined, updated.documentType ?? undefined);
                documentUrl = signed.url;
                documentUrlExpiresAt = signed.expiresAt;
            }

            const { documentPath: _dp, documentType: _dt, documentSize: _ds, ...rest } = updated;
            return reply.code(200).send({ ...rest, documentUrl, documentUrlExpiresAt });
        } catch (err) {
            if (err instanceof ZodError) return reply.code(400).send({ error: "Dados inválidos", details: err.issues });
            if (err instanceof NotFoundError) return reply.code(404).send({ error: err.message });
            if (err instanceof ForbiddenError) return reply.code(403).send({ error: err.message });
            console.error("[ClientTrainingDietController] updateDietForClient error:", err);
            return reply.code(500).send({ error: "Erro ao atualizar dieta" });
        }
    };
}
