"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { clientRecordsApi } from "./_lib/clientRecordsApi";
import { Loader2, Dumbbell, Moon, Utensils, TrendingUp, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

type OverviewData = {
    activities: { countLast7Days: number; totalDurationMin: number; totalCalories: number };
    sleep: { countLast7Days: number; avgHours: number | null };
    meals: { daysLast7: number; avgAdherence: number | null; avgKcal: number | null };
    evolution: { latestDate: string; weight: number; height: number; weightChange: number | null } | null;
};

export default function RecordsOverviewPage() {
    const params = useParams();
    const userId = params.userId as string;

    const [data, setData] = useState<OverviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        clientRecordsApi
            .getOverview(userId)
            .then((res) => setData(res.data))
            .catch(() => setError("Erro ao carregar resumo"))
            .finally(() => setLoading(false));
    }, [userId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">
                {error ?? "Erro ao carregar dados"}
            </div>
        );
    }

    const basePath = `/pro/clients/${userId}/records`;

    const cards = [
        {
            title: "Atividades",
            href: `${basePath}/activities`,
            icon: <Dumbbell className="h-5 w-5" />,
            color: "text-emerald-500 bg-emerald-500/10",
            stats: [
                { label: "Ultimos 7 dias", value: data.activities.countLast7Days },
                { label: "Duracao total", value: `${data.activities.totalDurationMin} min` },
                { label: "Calorias", value: data.activities.totalCalories },
            ],
        },
        {
            title: "Sono",
            href: `${basePath}/sleep`,
            icon: <Moon className="h-5 w-5" />,
            color: "text-blue-500 bg-blue-500/10",
            stats: [
                { label: "Ultimos 7 dias", value: data.sleep.countLast7Days },
                { label: "Media horas", value: data.sleep.avgHours != null ? `${data.sleep.avgHours}h` : "-" },
            ],
        },
        {
            title: "Alimentacao",
            href: `${basePath}/meals`,
            icon: <Utensils className="h-5 w-5" />,
            color: "text-amber-500 bg-amber-500/10",
            stats: [
                { label: "Dias registrados (7d)", value: data.meals.daysLast7 },
                { label: "Aderencia media", value: data.meals.avgAdherence != null ? `${data.meals.avgAdherence}%` : "-" },
                { label: "Kcal medio", value: data.meals.avgKcal ?? "-" },
            ],
        },
        {
            title: "Evolucao",
            href: `${basePath}/evolutions`,
            icon: <TrendingUp className="h-5 w-5" />,
            color: "text-purple-500 bg-purple-500/10",
            stats: data.evolution
                ? [
                    { label: "Peso atual", value: `${data.evolution.weight} kg` },
                    { label: "Altura", value: `${data.evolution.height} cm` },
                    {
                        label: "Variacao",
                        value: data.evolution.weightChange != null
                            ? `${data.evolution.weightChange > 0 ? "+" : ""}${data.evolution.weightChange} kg`
                            : "-",
                        icon: data.evolution.weightChange != null
                            ? data.evolution.weightChange > 0
                                ? <ArrowUpRight className="h-3.5 w-3.5 text-red-500" />
                                : data.evolution.weightChange < 0
                                    ? <ArrowDownRight className="h-3.5 w-3.5 text-emerald-500" />
                                    : <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                            : null,
                    },
                ]
                : [{ label: "Sem registros", value: "-" }],
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cards.map((card) => (
                <Link
                    key={card.title}
                    href={card.href}
                    className="rounded-2xl border border-border/30 bg-card shadow-sm p-5 hover:border-border/60 transition group"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`grid h-9 w-9 place-items-center rounded-xl ${card.color}`}>
                            {card.icon}
                        </div>
                        <h3 className="font-semibold">{card.title}</h3>
                    </div>
                    <div className="space-y-2">
                        {card.stats.map((stat, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{stat.label}</span>
                                <span className="font-medium flex items-center gap-1">
                                    {"icon" in stat && stat.icon}
                                    {stat.value}
                                </span>
                            </div>
                        ))}
                    </div>
                </Link>
            ))}
        </div>
    );
}
