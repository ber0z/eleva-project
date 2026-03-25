"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { clientRecordsApi } from "../../_lib/clientRecordsApi";
import { ArrowLeft, Loader2, Droplets } from "lucide-react";

type MealEntry = {
    id: number;
    title: string | null;
    time: string | null;
    description: string | null;
    notes: string | null;
    kcal: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
};

type MealDayDetail = {
    id: number;
    date: string;
    adherence: number | null;
    totalKcal: number | null;
    protein: number;
    carbs: number;
    fat: number;
    waterMl: number | null;
    notes: string | null;
    entries: MealEntry[];
};

export default function MealDayDetailPage() {
    const params = useParams();
    const userId = params.userId as string;
    const dayId = Number(params.id);

    const [day, setDay] = useState<MealDayDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        clientRecordsApi
            .getMealDay(userId, dayId)
            .then((res) => setDay(res.data))
            .catch(() => setError("Erro ao carregar registro"))
            .finally(() => setLoading(false));
    }, [userId, dayId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !day) {
        return (
            <div>
                <Link href={`/pro/clients/${userId}/records/meals`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
                    <ArrowLeft className="h-4 w-4" /> Voltar
                </Link>
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">
                    {error ?? "Registro nao encontrado"}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Link href={`/pro/clients/${userId}/records/meals`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" /> Voltar
            </Link>

            {/* Header */}
            <div className="rounded-2xl border border-border/30 bg-card shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">
                        {new Date(day.date).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                    </h2>
                    {day.adherence != null && (
                        <span className={`rounded-full px-3 py-1 text-sm font-medium ${
                            day.adherence >= 80 ? "bg-emerald-500/10 text-emerald-500" :
                            day.adherence >= 50 ? "bg-amber-500/10 text-amber-500" :
                            "bg-red-500/10 text-red-500"
                        }`}>
                            {day.adherence}% aderencia
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="rounded-xl bg-muted/50 p-3 text-center">
                        <p className="text-lg font-bold">{day.totalKcal ?? 0}</p>
                        <p className="text-xs text-muted-foreground">Kcal</p>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-3 text-center">
                        <p className="text-lg font-bold">{day.protein}g</p>
                        <p className="text-xs text-muted-foreground">Proteina</p>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-3 text-center">
                        <p className="text-lg font-bold">{day.carbs}g</p>
                        <p className="text-xs text-muted-foreground">Carboidrato</p>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-3 text-center">
                        <p className="text-lg font-bold">{day.fat}g</p>
                        <p className="text-xs text-muted-foreground">Gordura</p>
                    </div>
                    {day.waterMl != null && (
                        <div className="rounded-xl bg-muted/50 p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                                <Droplets className="h-4 w-4 text-blue-500" />
                                <p className="text-lg font-bold">{day.waterMl}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">ml agua</p>
                        </div>
                    )}
                </div>

                {day.notes && (
                    <p className="mt-3 text-sm text-muted-foreground italic">{day.notes}</p>
                )}
            </div>

            {/* Entries */}
            <div className="rounded-2xl border border-border/30 bg-card shadow-sm">
                <div className="p-4 border-b border-border/20">
                    <h4 className="text-sm font-semibold">Refeicoes ({day.entries?.length ?? 0})</h4>
                </div>

                {!day.entries || day.entries.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">Nenhuma refeicao registrada</p>
                ) : (
                    <div className="divide-y divide-border/20">
                        {day.entries.map((entry) => (
                            <div key={entry.id} className="px-4 py-3">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-sm font-medium">{entry.title ?? "Refeicao"}</p>
                                    {entry.time && (
                                        <span className="text-xs text-muted-foreground">{entry.time}</span>
                                    )}
                                </div>
                                {entry.description && (
                                    <p className="text-xs text-muted-foreground mb-1">{entry.description}</p>
                                )}
                                <div className="flex gap-3 text-xs text-muted-foreground">
                                    {entry.kcal != null && <span>{entry.kcal} kcal</span>}
                                    {entry.protein != null && <span>P:{entry.protein}g</span>}
                                    {entry.carbs != null && <span>C:{entry.carbs}g</span>}
                                    {entry.fat != null && <span>G:{entry.fat}g</span>}
                                </div>
                                {entry.notes && (
                                    <p className="text-xs text-muted-foreground mt-1 italic">{entry.notes}</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
