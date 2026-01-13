import { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { dietCreateSchema, dietIdParamSchema, dietListQuerySchema, dietUpdateSchema } from "../schemas/dietSchema";
import { DietService } from "../services/dietService";
import { getDietDocumentUrlByKey } from "../services/uploadService";
import { unwrapMultipartBody } from "../utils/multiparty";
import { isAllowedDoc } from "../utils/mime";
import { promises as fs } from "fs";
import type { MultipartFile } from "@fastify/multipart";
interface SavedFile extends MultipartFile { filepath: string }

export class DietController {
  private service = new DietService();

  create = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!req.auth?.subjectType || req.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário pode criar dieta" });
      }
      const userId = req.auth.subjectId;

      const isMulti = typeof req.isMultipart === "function" && req.isMultipart();
      let bodyObj: unknown;
      let doc: { buffer: Buffer; contentType?: string; originalName?: string } | undefined;

      if (isMulti) {
        const files = (await req.saveRequestFiles({ limits: { fileSize: 5 * 1024 * 1024 } })) as SavedFile[];

        const raw = req.body as Record<string, unknown>;
        const unwrapped = unwrapMultipartBody(raw);
        if (typeof unwrapped.meals === "string") {
          try { unwrapped.meals = JSON.parse(unwrapped.meals); }
          catch {
            await Promise.all(files.map(f => fs.unlink(f.filepath).catch(() => {})));
            return reply.code(400).send({ error: "Campo 'meals' deve ser JSON válido" });
          }
        }
        bodyObj = unwrapped;

        const file = files.find(f => f.fieldname === "document");
        try {
          if (file) {
            if (!isAllowedDoc(file.mimetype, file.filename)) {
              await fs.unlink(file.filepath).catch(() => {});
              return reply.code(400).send({ error: "Tipo de arquivo não permitido" });
            }
            const buffer = await fs.readFile(file.filepath);
            doc = { buffer, contentType: file.mimetype, originalName: file.filename };
          }
        } finally {
          await Promise.all(files.map(f => fs.unlink(f.filepath).catch(() => {})));
        }
      } else {
        bodyObj = req.body;
      }

      const body = dietCreateSchema.parse(bodyObj);
      const created = await this.service.createOwned(userId, body, doc);
      return reply.code(201).send(created);
    } catch (err) {
      if (err instanceof ZodError) {
        return reply.code(400).send({ error: "Dados inválidos", details: err.issues });
      }
      return reply.code(500).send({ error: "Erro ao criar dieta" });
    }
  };

  getOne = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!req.auth?.subjectType || req.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário pode acessar dieta" });
      }
      const userId = req.auth.subjectId;
      const { id } = dietIdParamSchema.parse(req.params);

      const item = await this.service.getByIdOwned(id, userId);
      if (!item) return reply.code(404).send({ error: "Dieta não encontrada" });

      // gerar URL assinada se houver doc
      let documentUrl: string | null = null;
      let documentUrlExpiresAt: string | null = null;
      if (item.documentPath) {
        const signed = await getDietDocumentUrlByKey(item.documentPath, 300, undefined, item.documentType ?? undefined);
        documentUrl = signed.url;
        documentUrlExpiresAt = signed.expiresAt;
      }

      const { documentPath: _dp, documentType: _dt, documentSize: _ds, ...rest } = item;
      return reply.code(200).send({ ...rest, documentUrl, documentUrlExpiresAt });
    } catch {
      return reply.code(500).send({ error: "Erro ao buscar dieta" });
    }
  };

  list = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!req.auth?.subjectType || req.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário pode listar dietas" });
      }
      const userId = req.auth.subjectId;
      const { page, pageSize, dateFrom, dateTo } = dietListQuerySchema.parse(req.query);

      const result = await this.service.listByUser(userId, { page, pageSize, dateFrom, dateTo });
      // sem campos de documento
      return reply.code(200).send(result);
    } catch (err) {
      if (err instanceof ZodError) {
        return reply.code(400).send({ error: "Query inválida", details: err.issues });
      }
      return reply.code(500).send({ error: "Erro ao listar dietas" });
    }
  };

  update = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!req.auth?.subjectType || req.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário pode editar dieta" });
      }
      const userId = req.auth.subjectId;
      const { id } = dietIdParamSchema.parse(req.params);

      const isMulti = typeof req.isMultipart === "function" && req.isMultipart();
      let bodyObj: unknown;
      let doc: { buffer: Buffer; contentType?: string; originalName?: string } | undefined;

      if (isMulti) {
        const files = (await req.saveRequestFiles({ limits: { fileSize: 5 * 1024 * 1024 } })) as SavedFile[];
        const raw = req.body as Record<string, unknown>;
        const unwrapped = unwrapMultipartBody(raw);
        if (typeof unwrapped.meals === "string") {
          try { unwrapped.meals = JSON.parse(unwrapped.meals); }
          catch {
            await Promise.all(files.map(f => fs.unlink(f.filepath).catch(() => {})));
            return reply.code(400).send({ error: "Campo 'meals' deve ser JSON válido" });
          }
        }
        bodyObj = unwrapped;

        const file = files.find(f => f.fieldname === "document");
        try {
          if (file) {
            if (!isAllowedDoc(file.mimetype, file.filename)) {
              await fs.unlink(file.filepath).catch(() => {});
              return reply.code(400).send({ error: "Tipo de arquivo não permitido" });
            }
            const buffer = await fs.readFile(file.filepath);
            doc = { buffer, contentType: file.mimetype, originalName: file.filename };
          }
        } finally {
          await Promise.all(files.map(f => fs.unlink(f.filepath).catch(() => {})));
        }
      } else {
        bodyObj = req.body;
      }

      const body = dietUpdateSchema.parse(bodyObj);
      const updated = await this.service.updateOwned(id, userId, body, doc);
      if (!updated) return reply.code(404).send({ error: "Dieta não encontrada" });

      // também retorno a URL assinada (igual ao getOne)
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
      if (err instanceof ZodError) {
        return reply.code(400).send({ error: "Dados inválidos", details: err.issues });
      }
      return reply.code(500).send({ error: "Erro ao atualizar dieta" });
    }
  };

  delete = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!req.auth?.subjectType || req.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário pode deletar dieta" });
      }
      const userId = req.auth.subjectId;
      const { id } = dietIdParamSchema.parse(req.params);

      const ok = await this.service.deleteOwned(id, userId);
      if (!ok) return reply.code(404).send({ error: "Dieta não encontrada" });
      return reply.code(204).send();
    } catch {
      return reply.code(500).send({ error: "Erro ao deletar dieta" });
    }
  };
}
