import { z } from "zod";

const YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// ===================== Params =====================

export const clientUserIdParamSchema = z.object({
    userId: z.coerce.number().int().positive(),
});

export const clientRecordIdParamSchema = z.object({
    userId: z.coerce.number().int().positive(),
    id: z.coerce.number().int().positive(),
});

// ===================== Activities =====================

export const clientActivitiesQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    dateFrom: z.string().refine((v) => !Number.isNaN(Date.parse(v))).optional(),
    dateTo: z.string().refine((v) => !Number.isNaN(Date.parse(v))).optional(),
    type: z.string().max(64).optional(),
});

export const clientActivityStatsQuerySchema = z
    .object({
        dateFrom: z.string().regex(YMD_REGEX, "dateFrom inválido (YYYY-MM-DD)"),
        dateTo: z.string().regex(YMD_REGEX, "dateTo inválido (YYYY-MM-DD)"),
        groupBy: z.enum(["day", "week", "month"]).optional().default("day"),
        type: z.string().trim().max(64).optional(),
        top: z.coerce.number().int().min(1).max(50).optional().default(10),
    })
    .refine(
        (v) => new Date(v.dateFrom).getTime() <= new Date(v.dateTo).getTime(),
        { message: "dateFrom não pode ser maior que dateTo", path: ["dateFrom"] }
    );

// ===================== Sleep =====================

export const clientSleepQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(10),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
});

export const clientSleepStatsQuerySchema = z
    .object({
        dateFrom: z.string().regex(YMD_REGEX, "dateFrom inválido (YYYY-MM-DD)"),
        dateTo: z.string().regex(YMD_REGEX, "dateTo inválido (YYYY-MM-DD)"),
    })
    .refine(
        (v) => new Date(v.dateFrom).getTime() <= new Date(v.dateTo).getTime(),
        { message: "dateFrom não pode ser maior que dateTo", path: ["dateFrom"] }
    );

// ===================== Meals =====================

export const clientMealsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(10),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
});

// ===================== Evolutions =====================

export const clientEvolutionsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(10),
});
