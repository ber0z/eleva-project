// src/services/metricsService.ts
import { prisma } from "../lib/prismaClient";
import { Prisma } from "@prisma/client";
import { redis } from "../lib/redis";
import { recifeDayStr, todayDateOnlyUTC } from "../utils/dateKey";

type SubjectType = "user" | "professional" | "admin";

class MetricsService {
    // upsert + increment nos agregados diários
    private async bump(
        date: Date,
        inc: { signups?: number; logins?: number; activeUsers?: number },
        tx?: Prisma.TransactionClient
    ) {
        const client = (tx ?? prisma) as typeof prisma;
        await client.dailyMetric.upsert({
            where: { date },
            create: {
                date,
                signups: inc.signups ?? 0,
                activeUsers: inc.activeUsers ?? 0,
            },
            update: {
                signups: inc.signups ? { increment: inc.signups } : undefined,
                activeUsers: inc.activeUsers ? { increment: inc.activeUsers } : undefined,
            },
        });
    }

    // Marca usuário como ativo no dia usando Redis NX (dedupe por dia)
    async trackActiveUserDayRedis(userId: number, subjectType: SubjectType = "user") {
        // 1) Se não houver Redis configurado, apenas não deduplica
        if (!redis) return;

        // chave diária por usuário (timezone Recife)
        const day = recifeDayStr();
        const key = `dau:${day}:${subjectType}:${userId}`;

        // TTL 2 dias para atravessar mudanças de dia/atrasos de clock
        // ioredis: SET key value NX EX seconds
        const res = await redis.set(key, "1", "EX", 2 * 24 * 60 * 60, "NX"); // "EX" vem antes de "NX"


        if (res === "OK") {
            // primeira atividade do dia → incrementa o agregado
            const date = todayDateOnlyUTC();
            await this.bump(date, { activeUsers: 1 });
        }
        // se res !== "OK", já contamos esse usuário hoje — não faz nada
    }

    // (já que você quer só ativos agora, deixei os outros como placeholders)
    async trackSignupTx(tx: Prisma.TransactionClient) {
        await this.bump(todayDateOnlyUTC(), { signups: 1 }, tx);
    }
}

export const metricsService = new MetricsService();
