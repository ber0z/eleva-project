"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { clientRecordsApi } from "../_lib/clientRecordsApi";
import DateRangeFilter from "../_components/DateRangeFilter";
import { Loader2, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    LineChart,
    Line,
} from "recharts";

function formatDate(d: Date): string {
    return d.toISOString().slice(0, 10);
}

type MealDay = {
    id: number;
    date: string;
    adherence: number | null;
    totalKcal: number | null;
    protein: number;
    carbs: number;
    fat: number;
    waterMl: number | null;
    notes: string | null;
};

export default function MealsRecordPage() {
    const params = useParams();
    const userId = params.userId as string;

    const [dateFrom, setDateFrom] = useState(() => formatDate(new Date(Date.now() - 30 * 86400000)));
    const [dateTo, setDateTo] = useState(() => formatDate(new Date()));

    const [days, setDays] = useState<MealDay[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);

    const fetchList = useCallback(() => {
        setLoading(true);
        clientRecordsApi
            .listMealDays(userId, { page, pageSize: 20, dateFrom, dateTo })
            .then((res) => {
                const d = res.data;
                setDays(d.items ?? d.data ?? []);
                setTotalPages(d.meta?.totalPages ?? (d.total && d.pageSize ? Math.ceil(d.total / d.pageSize) : 1));
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [userId, page, dateFrom, dateTo]);

    useEffect(() => { fetchList(); }, [fetchList]);

    function handleDateChange(from: string, to: string) {
        setDateFrom(from);
        setDateTo(to);
        setPage(1);
    }

    // Prepare chart data from list (ordered by date)
    const chartData = [...days]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((d) => ({
            date: new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
            kcal: d.totalKcal ?? 0,
            adherence: d.adherence ?? 0,
        }));

    const avgAdherence = days.length > 0
        ? Math.round(days.reduce((s, d) => s + (d.adherence ?? 0), 0) / days.length)
        : 0;
    const avgKcal = days.length > 0
        ? Math.round(days.reduce((s, d) => s + (d.totalKcal ?? 0), 0) / days.length)
        : 0;

    const basePath = `/pro/clients/${userId}/records/meals`;

    return (
        <div className="space-y-6">
            <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChange={handleDateChange} />

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="rounded-xl border border-border/30 bg-card p-4 text-center">
                    <p className="text-2xl font-bold">{days.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">Dias registrados</p>
                </div>
                <div className="rounded-xl border border-border/30 bg-card p-4 text-center">
                    <p className="text-2xl font-bold">{avgAdherence}%</p>
                    <p className="text-xs text-muted-foreground mt-1">Aderencia media</p>
                </div>
                <div className="rounded-xl border border-border/30 bg-card p-4 text-center">
                    <p className="text-2xl font-bold">{avgKcal}</p>
                    <p className="text-xs text-muted-foreground mt-1">Kcal medio</p>
                </div>
            </div>

            {/* Charts */}
            {chartData.length > 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-border/30 bg-card p-4">
                        <h4 className="text-sm font-semibold mb-3">Calorias por dia</h4>
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Bar dataKey="kcal" fill="#F2994A" radius={[4, 4, 0, 0]} name="Kcal" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/30 bg-card p-4">
                        <h4 className="text-sm font-semibold mb-3">Aderencia (%)</h4>
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="adherence" stroke="#2ECC71" strokeWidth={2} dot={{ r: 3 }} name="Aderencia %" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Meal Day List */}
            <div className="rounded-2xl border border-border/30 bg-card shadow-sm">
                <div className="p-4 border-b border-border/20">
                    <h4 className="text-sm font-semibold">Dias de alimentacao</h4>
                </div>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : days.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">Nenhum registro encontrado</p>
                ) : (
                    <div className="divide-y divide-border/20">
                        {days.map((d) => (
                            <Link
                                key={d.id}
                                href={`${basePath}/${d.id}`}
                                className="flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition"
                            >
                                <div>
                                    <p className="text-sm font-medium">
                                        {new Date(d.date).toLocaleDateString("pt-BR")}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {d.totalKcal ?? 0} kcal - P:{d.protein}g C:{d.carbs}g G:{d.fat}g
                                        {d.waterMl ? ` - ${d.waterMl}ml agua` : ""}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {d.adherence != null && (
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                            d.adherence >= 80 ? "bg-emerald-500/10 text-emerald-500" :
                                            d.adherence >= 50 ? "bg-amber-500/10 text-amber-500" :
                                            "bg-red-500/10 text-red-500"
                                        }`}>
                                            {d.adherence}%
                                        </span>
                                    )}
                                    <ChevronDown className="h-4 w-4 text-muted-foreground -rotate-90" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 p-3 border-t border-border/20">
                        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="p-1 rounded-lg hover:bg-accent disabled:opacity-30">
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
                        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1 rounded-lg hover:bg-accent disabled:opacity-30">
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
