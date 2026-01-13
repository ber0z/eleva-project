// src/controllers/sleepController.ts
import { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { SleepService } from "../services/sleepService";
import {
  createSleepSchema,
  updateSleepSchema,
  sleepIdParamSchema,
  listSleepQuerySchema,
} from "../schemas/sleepSchema";
import { toDateOnly } from "../utils/sleepTime";

export class SleepController {
  private service = new SleepService();

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.auth?.subjectType || request.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário pode criar sleep" });
      }
      const userId = request.auth.subjectId;

      const body = createSleepSchema.parse(request.body);
      const created = await this.service.create({
        idUser: userId,
        date: toDateOnly(body.date),
        startTime: body.startTime,
        endTime: body.endTime,
        sleepQuality: body.sleepQuality ?? null,
        notes: body.notes ?? null,
      });

      return reply.code(201).send(created);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: "Dados inválidos", details: error.issues });
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        return reply.code(500).send({ error: "Erro Prisma", code: error.code });
      }
      return reply.code(500).send({ error: "Erro ao criar sleep" });
    }
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.auth?.subjectType || request.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário pode editar sleep" });
      }
      const userId = request.auth.subjectId;
      const { id } = sleepIdParamSchema.parse(request.params);
      const body = updateSleepSchema.parse(request.body);

      const updated = await this.service.updateOwned(id, userId, {
        date: body.date ? toDateOnly(body.date) : undefined,
        startTime: body.startTime,
        endTime: body.endTime,
        sleepQuality: body.sleepQuality,
        notes: body.notes,
      });

      if (!updated) return reply.code(404).send({ error: "Registro não encontrado" });
      return reply.code(200).send(updated);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: "Dados inválidos", details: error.issues });
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        return reply.code(404).send({ error: "Registro não encontrado" });
      }
      return reply.code(500).send({ error: "Erro ao atualizar sleep" });
    }
  };

  delete = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.auth?.subjectType || request.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário pode deletar sleep" });
      }
      const userId = request.auth.subjectId;
      const { id } = sleepIdParamSchema.parse(request.params);

      const ok = await this.service.deleteOwned(id, userId);
      if (!ok) return reply.code(404).send({ error: "Registro não encontrado" });
      return reply.code(204).send();
    } catch {
      return reply.code(500).send({ error: "Erro ao deletar sleep" });
    }
  };

  getOne = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.auth?.subjectType || request.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário pode acessar sleep" });
      }
      const userId = request.auth.subjectId;
      const { id } = sleepIdParamSchema.parse(request.params);

      const item = await this.service.getByIdOwned(id, userId);
      if (!item) return reply.code(404).send({ error: "Registro não encontrado" });
      return reply.code(200).send(item);
    } catch {
      return reply.code(500).send({ error: "Erro ao buscar sleep" });
    }
  };

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.auth?.subjectType || request.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário pode listar sleep" });
      }
      const userId = request.auth.subjectId;
      const { page, pageSize, dateFrom, dateTo } = listSleepQuerySchema.parse(request.query);

      const result = await this.service.listByUser(userId, {
        page,
        pageSize,
        dateFrom: dateFrom ? toDateOnly(dateFrom) : undefined,
        dateTo: dateTo ? toDateOnly(dateTo) : undefined,
      });

      return reply.code(200).send(result);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: "Query inválida", details: error.issues });
      }
      return reply.code(500).send({ error: "Erro ao listar sleep" });
    }
  };
}
