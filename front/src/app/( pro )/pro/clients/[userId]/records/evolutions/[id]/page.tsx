"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { clientRecordsApi } from "../../_lib/clientRecordsApi";
import { ArrowLeft, Loader2 } from "lucide-react";

type EvolutionImage = {
    id: number;
    position: number;
    url: string;
};

type EvolutionDetail = {
    id: number;
    date: string;
    weight: number;
    height: number;
    goal?: string;
    rightBiceps?: number | null;
    leftBiceps?: number | null;
    rightThigh?: number | null;
    leftThigh?: number | null;
    waist?: number | null;
    hips?: number | null;
    chest?: number | null;
    shoulder?: number | null;
    rightCalf?: number | null;
    leftCalf?: number | null;
    rightForearm?: number | null;
    leftForearm?: number | null;
    message?: string | null;
    EvolutionImages: EvolutionImage[];
};

const POSITION_LABELS: Record<number, string> = {
    1: "Frente",
    2: "Lateral",
    3: "Costas",
};

const MEASUREMENTS: { key: keyof EvolutionDetail; label: string }[] = [
    { key: "weight", label: "Peso (kg)" },
    { key: "height", label: "Altura (cm)" },
    { key: "chest", label: "Peito (cm)" },
    { key: "shoulder", label: "Ombro (cm)" },
    { key: "waist", label: "Cintura (cm)" },
    { key: "hips", label: "Quadril (cm)" },
    { key: "rightBiceps", label: "Biceps D (cm)" },
    { key: "leftBiceps", label: "Biceps E (cm)" },
    { key: "rightForearm", label: "Antebraco D (cm)" },
    { key: "leftForearm", label: "Antebraco E (cm)" },
    { key: "rightThigh", label: "Coxa D (cm)" },
    { key: "leftThigh", label: "Coxa E (cm)" },
    { key: "rightCalf", label: "Panturrilha D (cm)" },
    { key: "leftCalf", label: "Panturrilha E (cm)" },
];

export default function EvolutionDetailPage() {
    const params = useParams();
    const userId = params.userId as string;
    const evoId = Number(params.id);

    const [evo, setEvo] = useState<EvolutionDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        clientRecordsApi
            .getEvolution(userId, evoId)
            .then((res) => setEvo(res.data))
            .catch(() => setError("Erro ao carregar evolucao"))
            .finally(() => setLoading(false));
    }, [userId, evoId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !evo) {
        return (
            <div>
                <Link href={`/pro/clients/${userId}/records/evolutions`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
                    <ArrowLeft className="h-4 w-4" /> Voltar
                </Link>
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">
                    {error ?? "Evolucao nao encontrada"}
                </div>
            </div>
        );
    }

    const images = evo.EvolutionImages?.sort((a, b) => a.position - b.position) ?? [];

    return (
        <div className="space-y-6">
            <Link href={`/pro/clients/${userId}/records/evolutions`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" /> Voltar
            </Link>

            {/* Header */}
            <div className="rounded-2xl border border-border/30 bg-card shadow-sm p-5">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-semibold">
                        {new Date(evo.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                    </h2>
                    {evo.goal && (
                        <span className="rounded-full bg-purple-500/10 text-purple-500 px-3 py-1 text-xs font-medium">
                            {evo.goal}
                        </span>
                    )}
                </div>
                {evo.message && (
                    <p className="text-sm text-muted-foreground italic">{evo.message}</p>
                )}
            </div>

            {/* Photos */}
            {images.length > 0 && (
                <div className="rounded-2xl border border-border/30 bg-card shadow-sm p-5">
                    <h3 className="text-sm font-semibold mb-4">Fotos</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {images.map((img) => (
                            <div key={img.id} className="text-center">
                                <img
                                    src={img.url}
                                    alt={POSITION_LABELS[img.position] ?? `Posicao ${img.position}`}
                                    className="rounded-xl w-full aspect-[3/4] object-cover bg-muted"
                                />
                                <p className="text-xs text-muted-foreground mt-2">
                                    {POSITION_LABELS[img.position] ?? `Posicao ${img.position}`}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Measurements */}
            <div className="rounded-2xl border border-border/30 bg-card shadow-sm p-5">
                <h3 className="text-sm font-semibold mb-4">Medidas</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {MEASUREMENTS.map(({ key, label }) => {
                        const val = evo[key];
                        if (val == null) return null;
                        return (
                            <div key={key} className="rounded-xl bg-muted/50 p-3 text-center">
                                <p className="text-lg font-bold">{val as string | number}</p>
                                <p className="text-xs text-muted-foreground">{label}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
