// src/controllers/trainingController.ts
import { FastifyRequest, FastifyReply } from "fastify";
import type { MultipartFile } from "@fastify/multipart";
import fs from "fs/promises";
import { ZodError } from "zod";
import { unwrapMultipartBody } from "../utils/multiparty";
import { getTrainingDocumentUrlByKey } from "../services/uploadService"
import { TrainingService } from "../services/trainingService";
import { isAllowedDoc } from "../utils/mime";
import {
    trainingCreateSchema,
    trainingUpdateSchema,
    trainingIdParamSchema,
    trainingListQuerySchema
} from "../schemas/trainingSchema";

// tipo local para usar filepath com saveRequestFiles()
interface SavedFile extends MultipartFile { filepath: string; }


export class TrainingController {
    private service = new TrainingService();

    create = async (req: FastifyRequest, reply: FastifyReply) => {
        if (!req.auth?.subjectType || req.auth.subjectType !== "user") {
            return reply.code(403).send({ error: "Apenas usuário pode criar treino" });
        }
        const userId = req.auth.subjectId;

        const isMulti = typeof req.isMultipart === "function" && req.isMultipart();
        let doc: { buffer: Buffer; contentType?: string; originalName?: string } | undefined;
        let bodyObj: unknown;

        if (isMulti) {
            const files = (await req.saveRequestFiles({
                limits: { fileSize: 5 * 1024 * 1024 } // 5MB por arquivo
            })) as SavedFile[];

            const raw = req.body as Record<string, unknown>;
            const unwrapped = unwrapMultipartBody(raw);

            if (typeof unwrapped.workouts === "string") {
                try {
                    unwrapped.workouts = JSON.parse(unwrapped.workouts);
                } catch {
                    await Promise.all(files.map(f => fs.unlink(f.filepath).catch(() => { })));
                    return reply.code(400).send({ error: "Campo 'workouts' deve ser JSON válido" });
                }
            }
            bodyObj = unwrapped;

            const file = files.find(f => f.fieldname === "document");
            try {
                if (file) {
                    if (!isAllowedDoc(file.mimetype, file.filename)) {
                        await fs.unlink(file.filepath).catch(() => { });
                        return reply.code(400).send({ error: "Tipo de arquivo não permitido" });
                    }
                    const buffer = await fs.readFile(file.filepath);
                    doc = { buffer, contentType: file.mimetype, originalName: file.filename };
                }
            } finally {
                await Promise.all(files.map(f => fs.unlink(f.filepath).catch(() => { })));
            }
        } else {
            bodyObj = req.body;
        }

        const body = trainingCreateSchema.parse(bodyObj);
        const created = await this.service.createOwned(userId, body, doc);
        return reply.code(201).send(created);
    };


    getOne = async (req: FastifyRequest, reply: FastifyReply) => {
        if (!req.auth?.subjectType || req.auth.subjectType !== "user") {
            return reply.code(403).send({ error: "Apenas usuário pode ver treino" });
        }
        const userId = req.auth.subjectId;
        const { id } = trainingIdParamSchema.parse(req.params);

        const item = await this.service.getByIdOwned(id, userId);
        if (!item) return reply.code(404).send({ error: "Treino não encontrado" });

        // se houver documento, gera link assinado (300s por padrão)
        let documentUrl: string | null = null;
        let documentUrlExpiresAt: string | null = null;

        if (item.documentPath) {
            const signed = await getTrainingDocumentUrlByKey(
                item.documentPath,
                300, // TTL (ajuste se quiser)
      // opcional: se você tiver nome do arquivo original, passe aqui
      /* filename */ undefined,
                item.documentType ?? undefined
            );
            documentUrl = signed.url;
            documentUrlExpiresAt = signed.expiresAt;
        }

        // remove campos de documento do payload e injeta as URLs
        const {
            documentPath: _documentPath,
            documentType: _documentType,
            documentSize: _documentSize,
            ...rest
        } = item;

        return reply.code(200).send({
            ...rest,
            documentUrl,
            documentUrlExpiresAt,
        });
    };

    list = async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            if (!req.auth?.subjectType || req.auth.subjectType !== "user") {
                return reply.code(403).send({ error: "Apenas usuário pode listar treinos" });
            }
            const userId = req.auth.subjectId;
            const { page, pageSize, dayOfWeek } = trainingListQuerySchema.parse(req.query);

            const result = await this.service.listByUser(userId, { page, pageSize, dayOfWeek });

            // remove documentPath/documentType/documentSize de cada item
            const sanitized = {
                ...result,
                items: result.items.map(({
                    documentPath: _dp,
                    documentType: _dt,
                    documentSize: _ds,
                    ...rest
                }) => rest),
            };

            return reply.code(200).send(sanitized);
        } catch (err) {
            if (err instanceof ZodError) {
                return reply.code(400).send({ error: "Query inválida", details: err.issues });
            }
            return reply.code(500).send({ error: "Erro ao listar treinos" });
        }
    };

    update = async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            if (!req.auth?.subjectType || req.auth.subjectType !== "user") {
                return reply.code(403).send({ error: "Apenas usuário pode editar treino" });
            }
            const userId = req.auth.subjectId;
            const { id } = trainingIdParamSchema.parse(req.params);

            const isMulti = typeof req.isMultipart === "function" && req.isMultipart();
            let bodyObj: unknown;
            let doc: { buffer: Buffer; contentType?: string; originalName?: string } | undefined;

            if (isMulti) {
                const files = (await req.saveRequestFiles({
                    limits: { fileSize: 5 * 1024 * 1024 } // 5MB por arquivo (mesmo do create)
                })) as SavedFile[];

                // 1) normaliza campos do multipart
                const raw = req.body as Record<string, unknown>;
                const unwrapped = unwrapMultipartBody(raw);

                // 2) se workouts vier como string, parse para JSON
                if (typeof unwrapped.workouts === "string") {
                    try {
                        unwrapped.workouts = JSON.parse(unwrapped.workouts);
                    } catch {
                        await Promise.all(files.map(f => fs.unlink(f.filepath).catch(() => { })));
                        return reply.code(400).send({ error: "Campo 'workouts' deve ser JSON válido" });
                    }
                }
                bodyObj = unwrapped;

                // 3) captura arquivo opcional "document"
                const file = files.find(f => f.fieldname === "document");
                try {
                    if (file) {
                        if (!isAllowedDoc(file.mimetype, file.filename)) {
                            await fs.unlink(file.filepath).catch(() => { });
                            return reply.code(400).send({ error: "Tipo de arquivo não permitido" });
                        }
                        const buffer = await fs.readFile(file.filepath);
                        doc = { buffer, contentType: file.mimetype, originalName: file.filename };
                    }
                } finally {
                    await Promise.all(files.map(f => fs.unlink(f.filepath).catch(() => { })));
                }
            } else {
                // JSON normal
                bodyObj = req.body;
            }

            // 4) valida com Zod (coerções de boolean já são tratadas no schema)
            const body = trainingUpdateSchema.parse(bodyObj);

            // 5) atualiza
            const updated = await this.service.updateOwned(id, userId, body, doc);
            if (!updated) return reply.code(404).send({ error: "Treino não encontrado" });
            return reply.code(200).send(updated);
        } catch (err) {
            if (err instanceof ZodError) {
                return reply.code(400).send({ error: "Dados inválidos", details: err.issues });
            }
            return reply.code(500).send({ error: "Erro ao atualizar treino" });
        }
    };

    delete = async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            if (!req.auth?.subjectType || req.auth.subjectType !== "user") {
                return reply.code(403).send({ error: "Apenas usuário pode deletar treino" });
            }
            const userId = req.auth.subjectId;
            const { id } = trainingIdParamSchema.parse(req.params);

            const ok = await this.service.deleteOwned(id, userId);
            if (!ok) return reply.code(404).send({ error: "Treino não encontrado" });
            return reply.code(204).send();
        } catch {
            return reply.code(500).send({ error: "Erro ao deletar treino" });
        }
    };

}
