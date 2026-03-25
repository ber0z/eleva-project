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
} from "recharts";

const QUALITY_COLORS: Record<string, string> = {
    excellent: "#2ECC71",
    good: "#27AE60",
    average: "#F2C94C",
    poor: "#F2994A",
    very_poor: "#EB5757",
};

const QUALITY_LABELS: Record<string, string> = {
    excellent: "Excelente",
    good: "Bom",
    average: "Regular",
    poor: "Ruim",
    very_poor: "Muito ruim",
};

function formatDate(d: Date): string {
    return d.toISOString().slice(0, 10);
}

type SleepRecord = {
    id: number;
    date: string;
    startTime: string;
    endTime: string;
    duration: number;
    sleepQuality: string | null;
    notes: string | null;
};

type SleepStats = {
    totalRecords: number;
    avgSleepHours: number;
    qualityDistribution: { quality: string; count: number }[];
    dailySeries: { date: string; durationHours: number }[];
};

export default function SleepRecordPage() {
    const params = useParams();
    const userId = params.userId as string;

    const [dateFrom, setDateFrom] = useState(() => formatDate(new Date(Date.now() - 30 * 86400000)));
    const [dateTo, setDateTo] = useState(() => formatDate(new Date()));

    const [stats, setStats] = useState<SleepStats | null>(null);
    const [records, setRecords] = useState<SleepRecord[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadingList, setLoadingList] = useState(true);

    const fetchStats = useCallback(() => {
        setLoading(true);
        clientRecordsApi
            .getSleepStats(userId, { dateFrom, dateTo })
            .then((res) => {
                const d = res.data;
                setStats({
                    totalRecords: d.totalRecords ?? 0,
                    avgSleepHours: d.avgSleepHours ?? 0,
                    qualityDistribution: d.qualityDistribution ?? [],
                    dailySeries: d.dailySeries ?? [],
                });
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [userId, dateFrom, dateTo]);

    const fetchList = useCallback(() => {
        setLoadingList(true);
        clientRecordsApi
            .listSleep(userId, { page, pageSize: 10, dateFrom, dateTo })
            .then((res) => {
                const d = res.data;
                setRecords(d.items ?? d.data ?? []);
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
            <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChange={handleDateChange} />

            {loading ? (
                <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : stats ? (
                <>
                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-border/30 bg-card p-4 text-center">
                            <p className="text-2xl font-bold">{stats.totalRecords}</p>
                            <p className="text-xs text-muted-foreground mt-1">Registros</p>
                        </div>
                        <div className="rounded-xl border border-border/30 bg-card p-4 text-center">
                            <p className="text-2xl font-bold">{Math.round(stats.avgSleepHours * 10) / 10}h</p>
                            <p className="text-xs text-muted-foreground mt-1">Media de sono</p>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {stats.dailySeries.length > 0 && (
                            <div className="rounded-2xl border border-border/30 bg-card p-4">
                                <h4 className="text-sm font-semibold mb-3">Horas de sono por dia</h4>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats.dailySeries}>
                                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                            <YAxis tick={{ fontSize: 11 }} />
                                            <Tooltip formatter={(val: number | undefined) => `${Math.round((val ?? 0) * 10) / 10}h`} />
                                            <Bar dataKey="durationHours" fill="#2D9CDB" radius={[4, 4, 0, 0]} name="Horas" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {stats.qualityDistribution.length > 0 && (
                            <div className="rounded-2xl border border-border/30 bg-card p-4">
                                <h4 className="text-sm font-semibold mb-3">Qualidade do sono</h4>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={stats.qualityDistribution}
                                                dataKey="count"
                                                nameKey="quality"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={80}
                                                label={({ payload }) => { const q = (payload as { quality?: string })?.quality; return QUALITY_LABELS[q ?? ""] ?? q; }}
                                            >
                                                {stats.qualityDistribution.map((entry, i) => (
                                                    <Cell key={i} fill={QUALITY_COLORS[entry.quality] ?? "#888"} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            ) : null}

            {/* Sleep List */}
            <div className="rounded-2xl border border-border/30 bg-card shadow-sm">
                <div className="p-4 border-b border-border/20">
                    <h4 className="text-sm font-semibold">Registros de sono</h4>
                </div>

                {loadingList ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : records.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">Nenhum registro encontrado</p>
                ) : (
                    <div className="divide-y divide-border/20">
                        {records.map((r) => (
                            <div key={r.id} className="flex items-center justify-between px-4 py-3">
                                <div>
                                    <p className="text-sm font-medium">
                                        {new Date(r.date).toLocaleDateString("pt-BR")}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {r.startTime} - {r.endTime} ({Math.round(r.duration * 10) / 10}h)
                                    </p>
                                </div>
                                {r.sleepQuality && (
                                    <span
                                        className="rounded-full px-2.5 py-1 text-xs font-medium"
                                        style={{
                                            backgroundColor: `${QUALITY_COLORS[r.sleepQuality] ?? "#888"}20`,
                                            color: QUALITY_COLORS[r.sleepQuality] ?? "#888",
                                        }}
                                    >
                                        {QUALITY_LABELS[r.sleepQuality] ?? r.sleepQuality}
                                    </span>
                                )}
                            </div>
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
