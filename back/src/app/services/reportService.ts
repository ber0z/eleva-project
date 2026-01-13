import { prisma } from "../lib/prismaClient";

const TZ = "America/Recife";

function recifeDayStr(d = new Date(), tz = TZ) {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(d); // "YYYY-MM-DD"
}

export function todayDateOnlyUTC(d = new Date(), tz = TZ) {
    const day = recifeDayStr(d, tz);
    return new Date(`${day}T00:00:00.000Z`);
}


export class ReportService {

    async getSummary({ from, to }: { from: Date; to: Date }) {
        const [totalUsers, signupsAgg, activeAgg] = await Promise.all([
            prisma.user.count(),

            prisma.dailyMetric.aggregate({
                _sum: { signups: true },
                where: { date: { gte: from, lte: to } },
            }),

            prisma.dailyMetric.aggregate({
                _sum: { activeUsers: true },
                where: { date: { gte: from, lte: to } },
            }),
        ]);

        return {
            totalUsers,
            newUsers: signupsAgg._sum.signups ?? 0,
            activeUsers: activeAgg._sum.activeUsers ?? 0,
        };
    }

}
