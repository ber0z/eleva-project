"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { clientRecordsApi } from "../_lib/clientRecordsApi";
import DateRangeFilter from "../_components/DateRangeFilter";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    PieChart,
    Pie,
    Cell,
    Legend,
} from "recharts";

const TYPE_COLORS: Record<string, string> = {
    strength: "#2ECC71",
    cardio: "#2D9CDB",
    sports: "#F2C94C",
    mobility: "#9B51E0",
    yoga_pilates: "#56CCF2",
    recovery: "#F2994A",
    other: "#EB5757",
};

const TYPE_LABELS: Record<string, string> = {
    strength: "Forca",
    cardio: "Cardio",
    sports: "Esportes",
    mobility: "Mobilidade",
    yoga_pilates: "Yoga/Pilates",
    recovery: "Recuperacao",
    other: "Outro",
};

function formatDate(d: Date): string {
    return d.toISOString().slice(0, 10);
}

type Activity = {
    id: number;
    name: string;
    type: string | null;
    duration: number;
    calories: number | null;
    date: string;
};

type StatsData = {
    totals: { totalRecords: number; totalDurationMin: number; totalCalories: number; avgDurationMin: number };
    series: { bucket: string; durationMin: number; count: number }[];
    byType: { type: string; durationMin: number; count: number }[];
};

export default function ActivitiesRecordPage() {
    const params = useParams();
    const userId = params.userId as string;

    const [dateFrom, setDateFrom] = useState(() => formatDate(new Date(Date.now() - 30 * 86400000)));
    const [dateTo, setDateTo] = useState(() => formatDate(new Date()));
    const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");

    const [stats, setStats] = useState<StatsData | null>(null);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadingList, setLoadingList] = useState(true);

    const fetchStats = useCallback(() => {
        setLoading(true);
        clientRecordsApi
            .getActivityStats(userId, { dateFrom, dateTo, groupBy })
            .then((res) => setStats(res.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [userId, dateFrom, dateTo, groupBy]);

    const fetchList = useCallback(() => {
        setLoadingList(true);
        clientRecordsApi
            .listActivities(userId, { page, pageSize: 10, dateFrom, dateTo })
            .then((res) => {
                const d = res.data;
                setActivities(d.items ?? d.data ?? []);
                setTotalPages(d.meta?.totalPages ?? (d.total && d.pageSize ? Math.ceil(d.total / d.pageSize) : 1));
            })
            .catch(() => {})
            .finally(() => setLoadingList(false));
    }, [userId, page, dateFrom, dateTo]);

    useEffect(() => { fetchStats(); }, [fetchStats]);
    useEffect(() => { fetchList(); }, [fetchList]);

    function handleDateChange(from: string, to: string) {
        setDateFrom(from);
        setDateTo(to);
        setPage(1);
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChange={handleDateChange} />
                <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value as "day" | "week" | "month")}
                    className="rounded-lg border border-border/30 bg-background px-2.5 py-1.5 text-xs"
                >
                    <option value="day">Por dia</option>
                    <option value="week">Por semana</option>
                    <option value="month">Por mes</option>
                </select>
            </div>

            {loading ? (
                <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : stats ? (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { label: "Total", value: stats.totals.totalRecords },
                            { label: "Duracao total", value: `${stats.totals.totalDurationMin} min` },
                            { label: "Calorias", value: stats.totals.totalCalories },
                            { label: "Duracao media", value: `${stats.totals.avgDurationMin} min` },
                        ].map((s, i) => (
                            <div key={i} className="rounded-xl border border-border/30 bg-card p-4 text-center">
                                <p className="text-2xl font-bold">{s.value}</p>
                                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Bar Chart */}
                        {stats.series.length > 0 && (
                            <div className="rounded-2xl border border-border/30 bg-card p-4">
                                <h4 className="text-sm font-semibold mb-3">Duracao por periodo</h4>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats.series}>
                                            <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                                            <YAxis tick={{ fontSize: 11 }} />
                                            <Tooltip />
                                            <Bar dataKey="durationMin" fill="#2ECC71" radius={[4, 4, 0, 0]} name="Duracao (min)" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Pie Chart */}
                        {stats.byType.length > 0 && (
                            <div className="rounded-2xl border border-border/30 bg-card p-4">
                                <h4 className="text-sm font-semibold mb-3">Por tipo de atividade</h4>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={stats.byType}
                                                dataKey="durationMin"
                                                nameKey="type"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={80}
                                                label={({ payload }) => { const t = (payload as { type?: string })?.type; return TYPE_LABELS[t ?? ""] ?? t; }}
                                            >
                                                {stats.byType.map((entry, i) => (
                                                    <Cell key={i} fill={TYPE_COLORS[entry.type] ?? "#888"} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(val) => `${val ?? 0} min`} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            ) : null}

            {/* Activity List */}
            <div className="rounded-2xl border border-border/30 bg-card shadow-sm">
                <div className="p-4 border-b border-border/20">
                    <h4 className="text-sm font-semibold">Atividades</h4>
                </div>

                {loadingList ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : activities.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">Nenhuma atividade encontrada</p>
                ) : (
                    <div className="divide-y divide-border/20">
                        {activities.map((a) => (
                            <div key={a.id} className="flex items-center justify-between px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="h-2.5 w-2.5 rounded-full"
                                        style={{ backgroundColor: TYPE_COLORS[a.type ?? "other"] ?? "#888" }}
                                    />
                                    <div>
                                        <p className="text-sm font-medium">{a.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(a.date).toLocaleDateString("pt-BR")} - {a.duration} min
                                            {a.calories ? ` - ${a.calories} kcal` : ""}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-xs text-muted-foreground capitalize">
                                    {TYPE_LABELS[a.type ?? "other"] ?? a.type}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 p-3 border-t border-border/20">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="p-1 rounded-lg hover:bg-accent disabled:opacity-30"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-xs text-muted-foreground">
                            {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="p-1 rounded-lg hover:bg-accent disabled:opacity-30"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
