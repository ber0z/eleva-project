import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { anamnesisSchema } from "../schemas/anamnesisSchema";
import { AnamnesisService } from "../services/anamnesisService";

export class AnamnesisController {
  private service = new AnamnesisService();

  getAnamnesis = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = req.auth!.subjectId;
      const anamnesis = await this.service.getAnamnesis(userId);
      if (!anamnesis) return reply.status(404).send({ error: "Anamnese não encontrada" });
      return reply.send(anamnesis);
    } catch {
      return reply.status(500).send({ error: "Falha ao buscar anamnese" });
    }
  };

  createAnamnesis = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = req.auth!.subjectId;
      const body = anamnesisSchema.parse(req.body);
      const anamnesis = await this.service.createAnamnesis(userId, body);
      return reply.status(201).send(anamnesis);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: "Dados inválidos", details: error.errors });
      }
      if (error instanceof Error && error.message === "ALREADY_EXISTS") {
        return reply.status(409).send({ error: "Anamnese já preenchida. Use PUT para atualizar." });
      }
      return reply.status(500).send({ error: "Falha ao criar anamnese" });
    }
  };

  updateAnamnesis = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = req.auth!.subjectId;
      const body = anamnesisSchema.parse(req.body);
      const anamnesis = await this.service.updateAnamnesis(userId, body);
      if (!anamnesis) return reply.status(404).send({ error: "Anamnese não encontrada. Use POST para criar." });
      return reply.send(anamnesis);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: "Dados inválidos", details: error.errors });
      }
      return reply.status(500).send({ error: "Falha ao atualizar anamnese" });
    }
  };
}
