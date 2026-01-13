import { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { ExerciseService } from "../services/exerciseService";
import { createExerciseSchema, updateExerciseSchema, listExercisesQuerySchema, idParamSchema } from "../schemas/exerciseSchema";

export class ExerciseController {
    private service = new ExerciseService();

    create = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const data = createExerciseSchema.parse(request.body);
            const created = await this.service.create(data);
            return reply.code(201).send(created);
        } catch (error: unknown) {
            if (error instanceof ZodError) {
                return reply.code(400).send({ error: "Dados inválidos", details: error.issues });
            }
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                return reply.code(409).send({ error: "Nome de exercício já existe" });
            }
            return reply.code(500).send({ error: "Erro ao criar exercício" });
        }
    };

    update = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { id } = idParamSchema.parse(request.params);  // ✅ sem any
            if (Number.isNaN(id)) return reply.code(400).send({ error: "ID inválido" });

            const data = updateExerciseSchema.parse(request.body);
            const updated = await this.service.update(id, data);
            return reply.code(200).send(updated);
        } catch (error: unknown) {
            if (error instanceof ZodError) {
                return reply.code(400).send({ error: "Dados inválidos", details: error.issues });
            }
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") return reply.code(409).send({ error: "Nome de exercício já existe" });
                if (error.code === "P2025") return reply.code(404).send({ error: "Exercício não encontrado" });
            }
            return reply.code(500).send({ error: "Erro ao atualizar exercício" });
        }
    };

    delete = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { id } = idParamSchema.parse(request.params);  // ✅ sem any
            if (Number.isNaN(id)) return reply.code(400).send({ error: "ID inválido" });

            await this.service.delete(id);
            return reply.code(204).send();
        } catch (error: unknown) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
                return reply.code(404).send({ error: "Exercício não encontrado" });
            }
            return reply.code(500).send({ error: "Erro ao deletar exercício" });
        }
    };

    getOne = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { id } = idParamSchema.parse(request.params);  // ✅ sem any
            if (Number.isNaN(id)) return reply.code(400).send({ error: "ID inválido" });

            const exercise = await this.service.getById(id);
            if (!exercise) return reply.code(404).send({ error: "Exercício não encontrado" });
            return reply.code(200).send(exercise);
        } catch {
            return reply.code(500).send({ error: "Erro ao buscar exercício" });
        }
    };

    list = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { page, pageSize, q } = listExercisesQuerySchema.parse(request.query);
            const result = await this.service.list(page, pageSize, q);
            return reply.code(200).send(result);
        } catch (error: unknown) {
            if (error instanceof ZodError) {
                return reply.code(400).send({ error: "Query inválida", details: error.issues });
            }
            return reply.code(500).send({ error: "Erro ao listar exercícios" });
        }
    };
}
