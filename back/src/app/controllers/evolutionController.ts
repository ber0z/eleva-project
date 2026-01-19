import { FastifyRequest, FastifyReply } from "fastify";
import { EvolutionService } from "../services/evolutionService";
import { evolutionSchema, EvolutionInput, idParamSchema, compareEvolutionsParamsSchema, evolutionUpdateSchema, querySchema, idSchema } from "../schemas/evolutionSchema";
import { ForbiddenError, NotFoundError } from '../types/errors'
import { ImageField, EvolutionUpdateInputFixed, ImgBuffer } from "../types/evolution";

import { z, ZodError } from "zod";
import fs from "fs/promises";




const IMAGE_FIELDS: readonly ImageField[] = ["imageFront", "imageSide", "imageBack"] as const;
function isImageField(name: string): name is ImageField {
  return (IMAGE_FIELDS as readonly string[]).includes(name);
}





export class EvolutionController {
  private evolutionService = new EvolutionService();

  private normalizeBody = (body: Record<string, unknown>): Record<string, unknown> => {
    const normalized: Record<string, unknown> = {};

    for (const key in body) {
      let value = body[key];

      // Pular campos de arquivo
      if (['imageFront', 'imageSide', 'imageBack'].includes(key)) {
        continue;
      }

      if (value && typeof value === "object" && "value" in value) {
        value = (value as { value: unknown }).value;
      }

      if (typeof value === "string" && !isNaN(Number(value))) {
        normalized[key] = Number(value);
      } else {
        normalized[key] = value;
      }
    }

    return normalized;
  };

  createEvolution = async (req: FastifyRequest, reply: FastifyReply) => {
    console.log("entrou na rota")
    try {
      if (!req.auth?.subjectType || req.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário pode criar evolução" });
      }
      const userId = req.auth.subjectId;

      // agora os campos estão no body porque attachFieldsToBody/addToBody está true
      const rawBody = req.body as Record<string, unknown>;
      const body: EvolutionInput = evolutionSchema.parse(this.normalizeBody(rawBody));

      // salva todos os arquivos (consome os streams)
      const files = await req.saveRequestFiles();

      const images: Record<"imageFront" | "imageSide" | "imageBack", Buffer | undefined> = {
        imageFront: undefined, imageSide: undefined, imageBack: undefined,
      };

      for (const file of files) {
        if (["imageFront", "imageSide", "imageBack"].includes(file.fieldname)) {
          images[file.fieldname as keyof typeof images] = await fs.readFile(file.filepath);
        } else {
          // opcional: se vier algum arquivo inesperado, ignore
        }
      }

      const evolutionData = { idUser: userId, ...body, images };
      const evolution = await this.evolutionService.createEvolution(evolutionData);
      return reply.code(201).send(evolution);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: "Invalid data", details: error.errors });
      }
      req.log.error(error);
      return reply.status(500).send({ error: "Failed to create evolution" });
    }
  };

  getEvolution = async (req: FastifyRequest, reply: FastifyReply) => {
    try {

      if (!req.auth?.subjectType || req.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário pode acessar evoluções" });
      }
      const userId = req.auth.subjectId;
      const { id } = idParamSchema.parse(req.params);


      const evolution = await this.evolutionService.getEvolutionById(userId, id);

      if (!evolution) {
        return reply.status(404).send({ error: "Evolution not found" });
      }

      return reply.send(evolution);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: "Invalid parameters", details: error.errors });
      }
      if (error instanceof ForbiddenError) {
        return reply.status(403).send({ error: "Forbidden" });
      }
      req.log?.error?.(error);
      return reply.status(500).send({ error: "Failed to fetch evolution" });
    }
  };

  updateEvolution = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!req.auth?.subjectType || req.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário pode acessar evoluções" });
      }
      const userId = Number(req.auth.subjectId);
      const { id } = idParamSchema.parse(req.params);

      // valida dados "primitivos"
      const rawBody = req.body as Record<string, unknown>;
      const normalized = this.normalizeBody(rawBody);
      const parsed = evolutionUpdateSchema.parse(normalized); // aqui image* são Buffer<ArrayBuffer>

      // lê arquivos multipart
      const files = await req.saveRequestFiles();
      const buffersByField: Partial<Record<ImageField, ImgBuffer>> = {};

      for (const file of files) {
        if (isImageField(file.fieldname)) {
          const buf = await fs.readFile(file.filepath);     // Buffer<ArrayBufferLike>
          buffersByField[file.fieldname] = buf;              // tipado como ImgBuffer
          await fs.unlink(file.filepath);
        }
      }

      // ⚠️ Remover os image* de 'parsed' para evitar conflito de generics
      const {
        imageFront: _dropFront,
        imageSide: _dropSide,
        imageBack: _dropBack,
        ...base
      } = parsed;

      // Agora monte o payload final com image* apenas dos buffers lidos
      const finalUpdateData: EvolutionUpdateInputFixed = {
        ...base,
        ...buffersByField,
      };

      const updated = await this.evolutionService.updateEvolution(userId, id, finalUpdateData);
      return reply.code(200).send(updated);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ error: "Invalid data", details: error.errors });
      }
      req.log?.error?.(error);
      return reply.status(500).send({ error: "Failed to update evolution" });
    }
  };

  deleteEvolution = async (req: FastifyRequest, reply: FastifyReply) => {
    try {

      if (!req.auth?.subjectType || req.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário pode criar atividade" });
      }
      const userId = req.auth.subjectId;
      const { id } = idSchema.parse(req.params);

      await this.evolutionService.deleteEvolution(userId, id);
      return reply.status(204).send();
    } catch (err) {
      if (err instanceof ZodError) {
        return reply.status(400).send({ error: "ID inválido", details: err.issues });
      }
      if (err instanceof NotFoundError) {
        return reply.status(404).send({ error: err.message });
      }
      if (err instanceof ForbiddenError) {
        return reply.status(403).send({ error: err.message });
      }
      req.log?.error?.(err);
      return reply.status(500).send({ error: "Falha ao deletar evolução" });
    }
  };

  getAllEvolutions = async (req: FastifyRequest, reply: FastifyReply) => {
    try {

      if (!req.auth?.subjectType || req.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário pode listar as suas evoluções." });
      }
      const userId = req.auth.subjectId;
      const { page, pageSize } = querySchema.parse(req.query);

      const evolutions = await this.evolutionService.getAllEvolutions(userId, page, pageSize);
      return reply.send(evolutions);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: "Invalid parameters",
          details: error.errors,
        });
      }
      console.error(error);
      return reply.status(500).send({ error: "Failed to fetch evolutions" });
    }
  };

  getLastEvolutions = async (
    req: FastifyRequest,
    reply: FastifyReply
  ) => {
    try {
      if (!req.auth?.subjectType || req.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário pode listar as suas evoluções." });
      }
      const userId = req.auth.subjectId;

      const evolutions = await this.evolutionService.getLastEvolutions(userId);

      return reply.code(200).send(evolutions);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.code(400).send({ error: "Parâmetro inválido", details: err.issues });
      }
      // caso o usuário não possua evoluções, devolve array vazio (200)
      return reply.code(500).send({ error: "Erro ao buscar evoluções", details: err });
    }
  }

  getLastTwoEvolutions = async (
    req: FastifyRequest,
    reply: FastifyReply
  ) => {
    try {
      if (!req.auth?.subjectType || req.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário pode listar as suas evoluções." });
      }
      const userId = req.auth.subjectId;

      const evolutions = await this.evolutionService.getLastTwoEvolutions(userId);

      return reply.code(200).send(evolutions);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.code(400).send({ error: "Parâmetro inválido", details: err.issues });
      }
      // caso o usuário não possua evoluções, devolve array vazio (200)
      return reply.code(500).send({ error: "Erro ao buscar evoluções", details: err });
    }
  }


  compareEvolutions = async (req: FastifyRequest, reply: FastifyReply) => {
    try {

      if (!req.auth?.subjectType || req.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário pode comparar as suas evoluções." });
      }
      const userId = req.auth.subjectId;

      // Valida os parâmetros da rota
      const params = compareEvolutionsParamsSchema.parse(req.params);
      const { evo1Id, evo2Id } = params; 

      // Chama o service para comparar as evoluções
      const result = await this.evolutionService.compareEvolutions(userId, evo1Id, evo2Id);

      return reply.code(200).send(result);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: "Invalid parameters",
          details: error.errors,
        });
      }
      console.error(error);
      return reply.status(500).send({ error: "Failed to compare evolutions" });
    }
  };


}