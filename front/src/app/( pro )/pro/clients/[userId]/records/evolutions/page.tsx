"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { clientRecordsApi } from "../_lib/clientRecordsApi";
import { Loader2, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
} from "recharts";

type EvolutionBasic = {
    id: number;
    date: string;
    weight: number;
};

export default function EvolutionsRecordPage() {
    const params = useParams();
    const userId = params.userId as string;

    const [evolutions, setEvolutions] = useState<EvolutionBasic[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);

    const fetchList = useCallback(() => {
        setLoading(true);
        clientRecordsApi
            .listEvolutions(userId, { page, pageSize: 20 })
            .then((res) => {
                setEvolutions(res.data.data);
                setTotalPages(res.data.totalPages ?? 1);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [userId, page]);

    useEffect(() => { fetchList(); }, [fetchList]);

    // Chart data (oldest first)
    const chartData = [...evolutions]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((e) => ({
            date: new Date(e.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
            weight: e.weight,
        }));

    const basePath = `/pro/clients/${userId}/records/evolutions`;

    return (
        <div className="space-y-6">
            {/* Weight Chart */}
            {chartData.length > 1 && (
                <div className="rounded-2xl border border-border/30 bg-card p-4">
                    <h4 className="text-sm font-semibold mb-3">Peso ao longo do tempo</h4>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} domain={["dataMin - 2", "dataMax + 2"]} />
                                <Tooltip formatter={(val: number) => `${val} kg`} />
                                <Line
                                    type="monotone"
                                    dataKey="weight"
                                    stroke="#9B51E0"
                                    strokeWidth={2}
                                    dot={{ r: 4, fill: "#9B51E0" }}
                                    name="Peso (kg)"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Evolution List */}
            <div className="rounded-2xl border border-border/30 bg-card shadow-sm">
                <div className="p-4 border-b border-border/20">
                    <h4 className="text-sm font-semibold">Evolucoes</h4>
                </div>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : evolutions.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">Nenhuma evolucao encontrada</p>
                ) : (
                    <div className="divide-y divide-border/20">
                        {evolutions.map((evo) => (
                            <Link
                                key={evo.id}
                                href={`${basePath}/${evo.id}`}
                                className="flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition"
                            >
                                <div>
                                    <p className="text-sm font-medium">
                                        {new Date(evo.date).toLocaleDateString("pt-BR")}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {evo.weight} kg
                                    </p>
                                </div>
                                <ChevronDown className="h-4 w-4 text-muted-foreground -rotate-90" />
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
