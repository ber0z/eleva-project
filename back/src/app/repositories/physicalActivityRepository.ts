import { Prisma, PhysicalActivity } from "@prisma/client";
import { prisma } from "../lib/prismaClient";

export type CreatePhysicalActivityInput = {
  idUser: number;
  name: string;
  type?: string | null;
  duration: number;
  calories?: number | null;
  observations?: string | null;
  date: Date; // já convertido
  trainingWorkoutId?: number | null;
};

export type UpdatePhysicalActivityInput = Partial<Omit<CreatePhysicalActivityInput, "idUser" | "date">> & {
  date?: Date;
};

const APP_TZ = "America/Recife";

export type TotalsRow = {
  totalRecords: number;
  totalDurationMin: number;
  totalCalories: number;
};

export type SeriesRow = {
  bucket: string;
  count: number;
  durationMin: number;
  calories: number;
};

export type ByTypeRow = {
  type: string | null;
  count: number;
  durationMin: number;
  calories: number;
};

export type ByWeekdayRow = {
  weekday: number;
  count: number;
  durationMin: number;
};

export type ByHourRow = {
  hour: number;
  count: number;
  durationMin: number;
};

export type GroupBy = "day" | "week" | "month";

type DistinctDayRow = { day: string };

export class PhysicalActivityRepository {
  async create(data: CreatePhysicalActivityInput, tx?: Prisma.TransactionClient): Promise<PhysicalActivity> {
    const db = tx ?? prisma;
    return db.physicalActivity.create({ data });
  } 

  async updateOwned(
    id: number,
    idUser: number,
    data: UpdatePhysicalActivityInput,
    tx?: Prisma.TransactionClient
  ): Promise<PhysicalActivity | null> {
    const db = tx ?? prisma;
    const res = await db.physicalActivity.updateMany({
      where: { id, idUser },
      data,
    });
    if (res.count === 0) return null;
    return db.physicalActivity.findUnique({ where: { id } });
  }

  async deleteOwned(id: number, idUser: number, tx?: Prisma.TransactionClient): Promise<boolean> {
    const db = tx ?? prisma;
    const res = await db.physicalActivity.deleteMany({ where: { id, idUser } });
    return res.count > 0;
  }

  async findByIdOwned(id: number, idUser: number, tx?: Prisma.TransactionClient): Promise<PhysicalActivity | null> {
    const db = tx ?? prisma;
    return db.physicalActivity.findFirst({ where: { id, idUser } });
  }

  async listByUser(
    idUser: number,
    params: { page: number; pageSize: number; dateFrom?: Date; dateTo?: Date; type?: string; trainingWorkoutId?: number },
    tx?: Prisma.TransactionClient
  ) {
    const db = tx ?? prisma;
    const { page, pageSize, dateFrom, dateTo, type, trainingWorkoutId } = params;
    const skip = (page - 1) * pageSize;

    const where: Prisma.PhysicalActivityWhereInput = {
      idUser,
      AND: [
        dateFrom ? { date: { gte: dateFrom } } : {},
        dateTo ? { date: { lte: dateTo } } : {},
        type ? { type: { equals: type } } : {},
        trainingWorkoutId ? { trainingWorkoutId } : {},
      ],
    };

    const [items, total] = await Promise.all([
      db.physicalActivity.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      }),
      db.physicalActivity.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async trainingWorkoutExists(
    id: number,
    tx?: Prisma.TransactionClient
  ): Promise<boolean> {
    const db = tx ?? prisma;
    const tw = await db.trainingWorkout.findUnique({
      where: { id },
      select: { id: true },
    });
    return !!tw;
  }

  

  //stats -----------------

  private buildWhere(
    idUser: number,
    from: Date,
    toExclusive: Date,
    typeFilter?: string | null
  ) {
    return Prisma.sql`
      WHERE "idUser" = ${idUser}
        AND "date" >= ${from}
        AND "date" < ${toExclusive}
        ${typeFilter ? Prisma.sql`AND "type" = ${typeFilter}` : Prisma.empty}
    `;
  }

  async totalsByUser(
    idUser: number,
    p: { from: Date; toExclusive: Date; typeFilter?: string | null },
    tx?: Prisma.TransactionClient
  ): Promise<TotalsRow> {
    const db = tx ?? prisma;
    const where = this.buildWhere(idUser, p.from, p.toExclusive, p.typeFilter);

    const rows = await db.$queryRaw<TotalsRow[]>(Prisma.sql`
      SELECT
        COUNT(*)::int                           AS "totalRecords",
        COALESCE(SUM("duration"), 0)::int       AS "totalDurationMin",
        COALESCE(SUM("calories"), 0)::int       AS "totalCalories"
      FROM "PhysicalActivity"
      ${where}
    `);

    return rows[0] ?? { totalRecords: 0, totalDurationMin: 0, totalCalories: 0 };
  }

  async seriesByUser(
    idUser: number,
    p: { from: Date; toExclusive: Date; groupBy: GroupBy; typeFilter?: string | null },
    tx?: Prisma.TransactionClient
  ): Promise<SeriesRow[]> {
    const db = tx ?? prisma;
    const where = this.buildWhere(idUser, p.from, p.toExclusive, p.typeFilter);

    const bucketExpr =
      p.groupBy === "day"
        ? Prisma.sql`to_char(date_trunc('day',  timezone(${APP_TZ}, "date")), 'YYYY-MM-DD')`
        : p.groupBy === "week"
        ? Prisma.sql`to_char(date_trunc('week', timezone(${APP_TZ}, "date")), 'YYYY-MM-DD')`
        : Prisma.sql`to_char(date_trunc('month', timezone(${APP_TZ}, "date")), 'YYYY-MM')`;

    return db.$queryRaw<SeriesRow[]>(Prisma.sql`
      SELECT
        ${bucketExpr}                           AS "bucket",
        COUNT(*)::int                           AS "count",
        COALESCE(SUM("duration"), 0)::int       AS "durationMin",
        COALESCE(SUM("calories"), 0)::int       AS "calories"
      FROM "PhysicalActivity"
      ${where}
      GROUP BY 1
      ORDER BY 1
    `);
  }

  async byType(
    idUser: number,
    p: { from: Date; toExclusive: Date; typeFilter?: string | null },
    tx?: Prisma.TransactionClient
  ): Promise<ByTypeRow[]> {
    const db = tx ?? prisma;
    const where = this.buildWhere(idUser, p.from, p.toExclusive, p.typeFilter);

    return db.$queryRaw<ByTypeRow[]>(Prisma.sql`
      SELECT
        "type"                                   AS "type",
        COUNT(*)::int                             AS "count",
        COALESCE(SUM("duration"), 0)::int         AS "durationMin",
        COALESCE(SUM("calories"), 0)::int         AS "calories"
      FROM "PhysicalActivity"
      ${where}
      GROUP BY "type"
      ORDER BY "count" DESC, "durationMin" DESC
    `);
  }

  async byWeekday(
    idUser: number,
    p: { from: Date; toExclusive: Date; typeFilter?: string | null },
    tx?: Prisma.TransactionClient
  ): Promise<ByWeekdayRow[]> {
    const db = tx ?? prisma;
    const where = this.buildWhere(idUser, p.from, p.toExclusive, p.typeFilter);

    return db.$queryRaw<ByWeekdayRow[]>(Prisma.sql`
      SELECT
        (EXTRACT(ISODOW FROM timezone(${APP_TZ}, "date")) - 1)::int AS "weekday",
        COUNT(*)::int                                              AS "count",
        COALESCE(SUM("duration"), 0)::int                          AS "durationMin"
      FROM "PhysicalActivity"
      ${where}
      GROUP BY 1
      ORDER BY 1
    `);
  }

  async byHour(
    idUser: number,
    p: { from: Date; toExclusive: Date; typeFilter?: string | null },
    tx?: Prisma.TransactionClient
  ): Promise<ByHourRow[]> {
    const db = tx ?? prisma;
    const where = this.buildWhere(idUser, p.from, p.toExclusive, p.typeFilter);

    return db.$queryRaw<ByHourRow[]>(Prisma.sql`
      SELECT
        EXTRACT(HOUR FROM timezone(${APP_TZ}, "date"))::int        AS "hour",
        COUNT(*)::int                                              AS "count",
        COALESCE(SUM("duration"), 0)::int                          AS "durationMin"
      FROM "PhysicalActivity"
      ${where}
      GROUP BY 1
      ORDER BY 1
    `);
  }

  async topActivities(
    idUser: number,
    p: { from: Date; toExclusive: Date; typeFilter?: string | null; top: number },
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? prisma;

    return client.physicalActivity.findMany({
      where: {
        idUser,
        date: { gte: p.from, lt: p.toExclusive },
        ...(p.typeFilter ? { type: p.typeFilter } : {}),
      },
      orderBy: [{ duration: "desc" }, { calories: "desc" }, { date: "desc" }],
      take: p.top,
      select: {
        id: true,
        name: true,
        type: true,
        date: true,
        duration: true,
        calories: true,
      },
    });
  }

  async distinctDaysDesc(
    idUser: number,
    p: { from: Date; toExclusive: Date; typeFilter?: string | null },
    tx?: Prisma.TransactionClient
  ): Promise<string[]> {
    const db = tx ?? prisma;
    const where = this.buildWhere(idUser, p.from, p.toExclusive, p.typeFilter);

    const rows = await db.$queryRaw<DistinctDayRow[]>(Prisma.sql`
      SELECT DISTINCT
        to_char(date_trunc('day', timezone(${APP_TZ}, "date")), 'YYYY-MM-DD') AS "day"
      FROM "PhysicalActivity"
      ${where}
      ORDER BY "day" DESC
    `);

    return rows.map((r) => r.day);
  }

  // Para "best_day" e streak funcionar mesmo se groupBy=week/month
  async daySeriesForInsights(
    idUser: number,
    p: { from: Date; toExclusive: Date; typeFilter?: string | null },
    tx?: Prisma.TransactionClient
  ): Promise<SeriesRow[]> {
    return this.seriesByUser(
      idUser,
      { ...p, groupBy: "day" },
      tx
    );
  }

}
