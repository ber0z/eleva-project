import { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import {
  mealLogDayCreateSchema,
  mealLogDayUpdateSchema,
  mealLogDayIdParamSchema,
  mealLogDayListQuerySchema,
} from "../schemas/mealLogSchema";
import { MealLogService } from "../services/mealLogService";

export class MealLogController {
  private service = new MealLogService();

  create = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!req.auth?.subjectType || req.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário pode criar log de refeição" });
      }
      const idUser = req.auth.subjectId;

      const body = mealLogDayCreateSchema.parse(req.body);

      const created = await this.service.createDayOwned(idUser, body);
      if (!created) {
        // já existe MealLogDay nesse date pra esse user
        return reply.code(409).send({ error: "Já existe registro de refeição nesse dia" });
      }

      return reply.code(201).send(created);
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        return reply.code(400).send({ error: "Dados inválidos", details: err.issues });
      }
      return reply.code(500).send({ error: "Erro ao criar MealLogDay" });
    }
  };

  getOne = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!req.auth?.subjectType || req.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário pode acessar log de refeição" });
      }
      const idUser = req.auth.subjectId;
      const { id } = mealLogDayIdParamSchema.parse(req.params);

      const day = await this.service.getDayOwned(id, idUser);
      if (!day) return reply.code(404).send({ error: "Registro não encontrado" });

      // day já vem com entries e info básica de diet
      return reply.code(200).send(day);
    } catch {
      return reply.code(500).send({ error: "Erro ao buscar MealLogDay" });
    }
  };

  list = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!req.auth?.subjectType || req.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário pode listar logs de refeição" });
      }
      const idUser = req.auth.subjectId;
      const { page, pageSize, dateFrom, dateTo } = mealLogDayListQuerySchema.parse(req.query);

      const result = await this.service.listDaysOwned(idUser, {
        page,
        pageSize,
        dateFrom,
        dateTo,
      });

      // aqui não retornamos entries, só o resumo de cada dia
      return reply.code(200).send(result);
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        return reply.code(400).send({ error: "Query inválida", details: err.issues });
      }
      return reply.code(500).send({ error: "Erro ao listar MealLogDay" });
    }
  };

  update = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!req.auth?.subjectType || req.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário pode editar log de refeição" });
      }
      const idUser = req.auth.subjectId;
      const { id } = mealLogDayIdParamSchema.parse(req.params);

      // JSON normal, não precisamos multipart aqui
      const body = mealLogDayUpdateSchema.parse(req.body);

      const updated = await this.service.updateDayOwned(id, idUser, body);
      if (!updated) return reply.code(404).send({ error: "Registro não encontrado ou Diet inválida" });

      return reply.code(200).send(updated);
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        return reply.code(400).send({ error: "Dados inválidos", details: err.issues });
      }
      return reply.code(500).send({ error: "Erro ao atualizar MealLogDay" });
    }
  };

  delete = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!req.auth?.subjectType || req.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário pode deletar log de refeição" });
      }
      const idUser = req.auth.subjectId;
      const { id } = mealLogDayIdParamSchema.parse(req.params);

      const ok = await this.service.deleteDayOwned(id, idUser);
      if (!ok) return reply.code(404).send({ error: "Registro não encontrado" });

      return reply.code(204).send();
    } catch {
      return reply.code(500).send({ error: "Erro ao deletar MealLogDay" });
    }
  };
}
