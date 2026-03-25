import { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { ClientRecordService } from "../services/clientRecordService";
import { NotFoundError, ForbiddenError } from "../errors/appErrors";
import { ForbiddenError as TypesForbiddenError } from "../types/errors";
import {
    clientUserIdParamSchema,
    clientRecordIdParamSchema,
    clientActivitiesQuerySchema,
    clientActivityStatsQuerySchema,
    clientSleepQuerySchema,
    clientSleepStatsQuerySchema,
    clientMealsQuerySchema,
    clientEvolutionsQuerySchema,
} from "../schemas/clientRecordSchema";
import { toDateOnly } from "../utils/sleepTime";

export class ClientRecordController {
    private service = new ClientRecordService();

    // ===================== Overview =====================

    getOverview = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const professionalId = request.auth!.subjectId;
            const { userId } = clientUserIdParamSchema.parse(request.params);
            const result = await this.service.getOverview(professionalId, userId);
            return reply.code(200).send(result);
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao buscar resumo do cliente");
        }
    };

    // ===================== Activities =====================

    listActivities = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const professionalId = request.auth!.subjectId;
            const { userId } = clientUserIdParamSchema.parse(request.params);
            const query = clientActivitiesQuerySchema.parse(request.query);

            const result = await this.service.listActivities(professionalId, userId, {
                page: query.page,
                pageSize: query.pageSize,
                dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
                dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
                type: query.type,
            });
            return reply.code(200).send(result);
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao listar atividades do cliente");
        }
    };

    getActivityStats = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const professionalId = request.auth!.subjectId;
            const { userId } = clientUserIdParamSchema.parse(request.params);
            const query = clientActivityStatsQuerySchema.parse(request.query);

            const result = await this.service.getActivityStats(professionalId, userId, {
                dateFrom: query.dateFrom,
                dateTo: query.dateTo,
                groupBy: query.groupBy,
                typeFilter: query.type ?? null,
                top: query.top,
            });
            return reply.code(200).send(result);
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao buscar stats de atividades");
        }
    };

    // ===================== Sleep =====================

    listSleep = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const professionalId = request.auth!.subjectId;
            const { userId } = clientUserIdParamSchema.parse(request.params);
            const query = clientSleepQuerySchema.parse(request.query);

            const result = await this.service.listSleep(professionalId, userId, {
                page: query.page,
                pageSize: query.pageSize,
                dateFrom: query.dateFrom ? toDateOnly(query.dateFrom) : undefined,
                dateTo: query.dateTo ? toDateOnly(query.dateTo) : undefined,
            });
            return reply.code(200).send(result);
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao listar sono do cliente");
        }
    };

    getSleepStats = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const professionalId = request.auth!.subjectId;
            const { userId } = clientUserIdParamSchema.parse(request.params);
            const query = clientSleepStatsQuerySchema.parse(request.query);

            const result = await this.service.getSleepStats(professionalId, userId, {
                dateFrom: toDateOnly(query.dateFrom),
                dateTo: toDateOnly(query.dateTo),
            });
            return reply.code(200).send({
                dateFrom: query.dateFrom,
                dateTo: query.dateTo,
                ...result,
            });
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao buscar stats de sono");
        }
    };

    // ===================== Meals =====================

    listMealDays = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const professionalId = request.auth!.subjectId;
            const { userId } = clientUserIdParamSchema.parse(request.params);
            const query = clientMealsQuerySchema.parse(request.query);

            const result = await this.service.listMealDays(professionalId, userId, {
                page: query.page,
                pageSize: query.pageSize,
                dateFrom: query.dateFrom,
                dateTo: query.dateTo,
            });
            return reply.code(200).send(result);
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao listar refeições do cliente");
        }
    };

    getMealDay = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const professionalId = request.auth!.subjectId;
            const { userId, id } = clientRecordIdParamSchema.parse(request.params);
            const result = await this.service.getMealDay(professionalId, userId, id);
            return reply.code(200).send(result);
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao buscar refeição do cliente");
        }
    };

    // ===================== Evolutions =====================

    listEvolutions = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const professionalId = request.auth!.subjectId;
            const { userId } = clientUserIdParamSchema.parse(request.params);
            const query = clientEvolutionsQuerySchema.parse(request.query);

            const result = await this.service.listEvolutions(professionalId, userId, query.page, query.pageSize);
            return reply.code(200).send(result);
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao listar evoluções do cliente");
        }
    };

    getEvolution = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const professionalId = request.auth!.subjectId;
            const { userId, id } = clientRecordIdParamSchema.parse(request.params);
            const result = await this.service.getEvolution(professionalId, userId, String(id));
            if (!result) return reply.code(404).send({ error: "Evolução não encontrada" });
            return reply.code(200).send(result);
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao buscar evolução do cliente");
        }
    };

    // ===================== Error Handler =====================

    private handleError(error: unknown, reply: FastifyReply, defaultMessage: string) {
        if (error instanceof ZodError) {
            return reply.code(400).send({ error: "Dados inválidos", details: error.issues });
        }
        if (error instanceof NotFoundError) {
            return reply.code(404).send({ error: error.message });
        }
        if (error instanceof ForbiddenError || error instanceof TypesForbiddenError) {
            return reply.code(403).send({ error: error.message });
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2025") {
                return reply.code(404).send({ error: "Registro não encontrado" });
            }
        }
        return reply.code(500).send({ error: defaultMessage, details: String(error) });
    }
}
