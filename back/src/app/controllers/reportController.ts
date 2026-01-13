// src/controllers/sleepController.ts
import { FastifyReply, FastifyRequest } from "fastify";
import { ReportService, todayDateOnlyUTC } from "../services/reportService";
import { z, ZodError } from "zod";

const querySchema = z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD
});

function toUtcDay(s?: string) {
    if (!s) return undefined;
    // DailyMetric.date é @db.Date -> sempre grava 00:00:00Z do dia de Recife
    return new Date(`${s}T00:00:00.000Z`);
}

export class ReportController {
    private service = new ReportService();

    dashboard = async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            const { from, to } = querySchema.parse(req.query);

            const toDate = toUtcDay(to) ?? todayDateOnlyUTC();
            const fromDate = toUtcDay(from) ?? new Date(toDate.getTime() - 29 * 24 * 60 * 60 * 1000);

            if (fromDate > toDate) {
                return reply.code(400).send({ error: "Parâmetros inválidos: 'from' não pode ser maior que 'to'." });
            }

            const data = await this.service.getSummary({ from: fromDate, to: toDate });

            return reply.code(200).send({
                
                    totalUsers: data.totalUsers,
                    newUsers: {
                        count: data.newUsers,
                       
                    },
                    activeUsers: {
                        count: data.activeUsers,
                        
                    },
            
            });
        } catch (e) {
            if (e instanceof ZodError) {
                return reply.code(400).send({ error: "Parâmetros inválidos", details: e.issues });
            }
            req.log.error(e);
            return reply.code(500).send({ error: "Erro ao obter resumo" });
        }

    };
}
