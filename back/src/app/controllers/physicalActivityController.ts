import { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { PhysicalActivityService } from "../services/physicalActivityService";
import { NotFoundError } from "../errors/appErrors";
import {
  createPhysicalActivitySchema,
  updatePhysicalActivitySchema,
  idParamSchema,
  listPhysicalActivitiesQuerySchema,
  activityStatsQuerySchema,
} from "../schemas/physicalActivitySchema";

function toDateOnly(d: string): Date {
  // interpreta "YYYY-MM-DD" como data local
  return new Date(d);
}

export class PhysicalActivityController {
  private service = new PhysicalActivityService();

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.auth?.subjectType || request.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário pode criar atividade" });
      }
      const userId = request.auth.subjectId;

      const body = createPhysicalActivitySchema.parse(request.body);
      const created = await this.service.create({
        idUser: userId,
        name: body.name,
        type: body.type ?? null,
        duration: body.duration,
        calories: body.calories ?? null,
        observations: body.observations ?? null,
        date: new Date(body.date),
        trainingWorkoutId: body.trainingWorkoutId ?? null,
        exerciseLogs: body.exerciseLogs ?? [],
      });

      return reply.code(201).send(created);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: "Dados inválidos", details: error.issues });
      }
      if (error instanceof NotFoundError) {
        return reply.code(404).send({ error: error.message, field: error.field });
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        return reply.code(500).send({ error: "Erro Prisma", code: error.code });
      }
      return reply.code(500).send({ error: "Erro ao criar atividade" });
    }
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.auth?.subjectType || request.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário pode editar atividade" });
      }
      const userId = request.auth.subjectId;
      const { id } = idParamSchema.parse(request.params);
      const body = updatePhysicalActivitySchema.parse(request.body);

      const updated = await this.service.updateOwned(id, userId, {
        name: body.name,
        type: body.type ?? undefined,
        duration: body.duration,
        calories: body.calories,
        observations: body.observations,
        date: body.date ? toDateOnly(body.date) : undefined,
        trainingWorkoutId: body.trainingWorkoutId,
      });

      if (!updated) return reply.code(404).send({ error: "Atividade não encontrada" });
      return reply.code(200).send(updated);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: "Dados inválidos", details: error.issues });
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        return reply.code(404).send({ error: "Atividade não encontrada" });
      }
      return reply.code(500).send({ error: "Erro ao atualizar atividade" });
    }
  };

  delete = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.auth?.subjectType || request.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário pode deletar atividade" });
      }
      const userId = request.auth.subjectId;
      const { id } = idParamSchema.parse(request.params);

      const ok = await this.service.deleteOwned(id, userId);
      if (!ok) return reply.code(404).send({ error: "Atividade não encontrada" });
      return reply.code(204).send();
    } catch {
      return reply.code(500).send({ error: "Erro ao deletar atividade" });
    }
  };

  getOne = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.auth?.subjectType || request.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário pode acessar atividade" });
      }
      const userId = request.auth.subjectId;
      const { id } = idParamSchema.parse(request.params);

      const item = await this.service.getByIdOwned(id, userId);
      if (!item) return reply.code(404).send({ error: "Atividade não encontrada" });
      return reply.code(200).send(item);
    } catch {
      return reply.code(500).send({ error: "Erro ao buscar atividade" });
    }
  };

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.auth?.subjectType || request.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário pode listar atividades" });
      }
      const userId = request.auth.subjectId;
      const { page, pageSize, dateFrom, dateTo, type, trainingWorkoutId } =
        listPhysicalActivitiesQuerySchema.parse(request.query);

      const result = await this.service.listByUser(userId, {
        page,
        pageSize,
        dateFrom: dateFrom ? toDateOnly(dateFrom) : undefined,
        dateTo: dateTo ? toDateOnly(dateTo) : undefined,
        type,
        trainingWorkoutId,
      });

      return reply.code(200).send(result);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: "Query inválida", details: error.issues });
      }
      return reply.code(500).send({ error: "Erro ao listar atividades" });
    }
  };


  stats = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.auth?.subjectType || request.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário pode acessar stats" });
      }
      const userId = request.auth.subjectId;

      const q = activityStatsQuerySchema.parse(request.query);

      const result = await this.service.statsByUser(userId, {
        dateFrom: q.dateFrom,
        dateTo: q.dateTo,
        groupBy: q.groupBy,
        typeFilter: q.type ?? null,
        top: q.top,
      });

      return reply.code(200).send(result);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: "Query inválida", details: error.issues });
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        return reply.code(500).send({ error: "Erro Prisma", code: error.code });
      }
      return reply.code(500).send({ error: "Erro ao buscar stats" });
    }
  };
}
