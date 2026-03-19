"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";
import {
    ArrowLeft,
    Dumbbell,
    ExternalLink,
    PlayCircle,
    Pencil,
    Trash2,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";


type ExerciseItem = {
    id: number;
    name: string;
    muscleGroup: string | null;
    equipment: string | null;
    difficultyLevel: string | null;
    type: string | null;
    description?: string | null;
    videoUrl?: string | null;
    createdAt: string;
    updatedAt: string;
};

function compactLine(parts: Array<string | null | undefined>) {
    return parts.filter((p) => (p ?? "").toString().trim().length > 0).join(" • ");
}

function toEmbedUrl(url: string) {
    const u = (url || "").trim();
    if (!u) return null;

    if (u.includes("youtube.com/embed/")) return u;

    const watch = u.match(/[?&]v=([^&]+)/);
    if (watch?.[1]) return `https://www.youtube.com/embed/${watch[1]}`;

    const short = u.match(/youtu\.be\/([^?&/]+)/);
    if (short?.[1]) return `https://www.youtube.com/embed/${short[1]}`;

    const shorts = u.match(/youtube\.com\/shorts\/([^?&/]+)/);
    if (shorts?.[1]) return `https://www.youtube.com/embed/${shorts[1]}`;

    return null;
}


function InfoRow({ label, value }: { label: string; value?: string | null }) {
    return (
        <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-sm font-medium truncate">{value?.trim() ? value : "—"}</p>
        </div>
    );
}

export default function ExerciseDetailsPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();

    const exerciseId = Number(params?.id);

    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [data, setData] = useState<ExerciseItem | null>(null);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const embedUrl = useMemo(() => (data?.videoUrl ? toEmbedUrl(data.videoUrl) : null), [data?.videoUrl]);

    async function fetchDetails() {
        setLoading(true);
        setErr(null);

        if (!Number.isFinite(exerciseId) || exerciseId <= 0) {
            setErr("Exercício inválido.");
            setLoading(false);
            return;
        }

        try {
            // ✅ Se sua API for diferente, ajuste aqui:
            const res = await api.get<ExerciseItem>(`/exercise/${exerciseId}`);
            setData(res.data);
        } catch (e) {
            if (isAxiosError(e)) setErr(e.response?.data?.message || e.message || "Falha ao carregar exercício");
            else setErr("Falha ao carregar exercício");
            setData(null);
        } finally {
            setLoading(false);
        }
    }

    async function onDeleteConfirmed() {
        if (!data?.id || deleting) return;

        setDeleting(true);
        setErr(null);

        try {
            // ✅ Se sua API for diferente, ajuste aqui:
            await api.delete(`/exercise/${data.id}`);
            router.push("/admin/exercises");
        } catch (e) {
            if (isAxiosError(e)) setErr(e.response?.data?.message || e.message || "Falha ao excluir exercício");
            else setErr("Falha ao excluir exercício");
        } finally {
            setDeleting(false);
            setDeleteOpen(false);
        }
    }

    useEffect(() => {
        fetchDetails();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [exerciseId]);

    return (
        <div className="min-h-svh bg-background text-foreground overflow-x-hidden">
            <div className="mx-auto w-full max-w-3xl px-3 sm:px-4 py-5 sm:py-6 pb-28">
                {/* Top bar */}
                <div className="mb-3 sm:mb-4 flex flex-wrap items-center justify-between gap-2">
                    <Button variant="outline" className="bg-card cursor-pointer" onClick={() => router.push("/admin/exercises")}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar
                    </Button>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            className="bg-card cursor-pointer"
                            disabled={!data?.id || loading}
                            onClick={() => router.push(`/admin/exercises/${exerciseId}/edit`)}
                        >
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                        </Button>

                        <Button
                            variant="outline"
                            className="cursor-pointer border-destructive/40 text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={!data?.id || loading}
                            onClick={() => setDeleteOpen(true)}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="grid gap-3">
                        <Card>
                            <CardHeader className="space-y-2">
                                <Skeleton className="h-5 w-56" />
                                <Skeleton className="h-3 w-72" />
                            </CardHeader>
                            <CardContent className="grid gap-3">
                                <Skeleton className="h-10 w-full rounded-xl" />
                                <Skeleton className="h-24 w-full rounded-xl" />
                                <Skeleton className="h-40 w-full rounded-xl" />
                            </CardContent>
                        </Card>
                    </div>
                ) : err ? (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {err}
                        <div className="mt-2 flex gap-2">
                            <Button size="sm" variant="outline" onClick={fetchDetails}>
                                Tentar novamente
                            </Button>
                            <Button size="sm" variant="outline" className="bg-card" onClick={() => router.push("/admin/exercises")}>
                                Voltar à lista
                            </Button>
                        </div>
                    </div>
                ) : !data ? (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Dumbbell className="h-5 w-5" />
                                Exercício não encontrado
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                            Não foi possível carregar os dados.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-3">
                        {/* Cabeçalho com destaque */}
                        <Card className="overflow-hidden">
                            <div className="bg-primary/10 px-4 sm:px-6 py-4 border-b border-border/30">
                                <h1 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                                    <Dumbbell className="h-4 w-4 text-primary" />
                                    {data.name}
                                </h1>
                                <p className="text-xs text-muted-foreground">
                                    {compactLine([data.muscleGroup, data.equipment, data.difficultyLevel, data.type]) || "—"}
                                </p>
                            </div>

                            <CardContent className="pt-5 px-4 sm:px-6 grid gap-4">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <InfoRow label="Grupo muscular" value={data.muscleGroup} />
                                    <InfoRow label="Equipamento" value={data.equipment} />
                                    <InfoRow label="Dificuldade" value={data.difficultyLevel} />
                                    <InfoRow label="Tipo" value={data.type} />
                                </div>

                                {data.description ? (
                                    <div className="rounded-xl bg-muted/30 p-3">
                                        <p className="text-xs text-muted-foreground mb-1">Descrição</p>
                                        <p className="text-sm leading-relaxed">{data.description}</p>
                                    </div>
                                ) : (
                                    <div className="rounded-xl bg-muted/20 p-3 text-sm text-muted-foreground">
                                        Sem descrição.
                                    </div>
                                )}


                            </CardContent>
                        </Card>

                        {/* Vídeo */}
                        <Card className="overflow-hidden">
                            <div className="bg-card px-4 sm:px-6 py-4 border-b border-border/30">
                                <h2 className="text-sm font-semibold flex items-center gap-2">
                                    <PlayCircle className="h-4 w-4 text-primary" />
                                    Vídeo
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    {data.videoUrl ? "Preview quando suportado pelo link." : "Nenhum vídeo informado."}
                                </p>
                            </div>

                            <CardContent className="pt-4 px-4 sm:px-6">
                                {!data.videoUrl ? (
                                    <div className="rounded-xl bg-muted/20 p-3 text-sm text-muted-foreground">Sem vídeo.</div>
                                ) : (
                                    <div className="grid gap-3">
                                        <div className="grid gap-2 sm:grid-cols-[auto_1fr] sm:items-center">
                                            <Button asChild variant="outline" className="bg-card cursor-pointer w-full sm:w-auto">
                                                <a href={data.videoUrl} target="_blank" rel="noreferrer">
                                                    Abrir link <ExternalLink className="ml-2 h-4 w-4" />
                                                </a>
                                            </Button>

                                            <p className="min-w-0 text-xs text-muted-foreground truncate">
                                                {data.videoUrl}
                                            </p>
                                        </div>


                                        {embedUrl ? (
                                            <div className="aspect-video w-full overflow-hidden rounded-xl bg-black/10">
                                                <iframe
                                                    className="h-full w-full"
                                                    src={embedUrl}
                                                    title={`Vídeo - ${data.name}`}
                                                    loading="lazy"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                    referrerPolicy="strict-origin-when-cross-origin"
                                                    allowFullScreen
                                                />
                                            </div>
                                        ) : (
                                            <div className="rounded-xl bg-muted/20 p-3 text-sm text-muted-foreground">
                                                Preview não disponível para esse link. Use “Abrir link”.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            {/* Modal confirmação delete */}
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent className="w-[calc(100svw-2rem)] max-w-[560px] p-4 sm:p-6 rounded-2xl sm:rounded-xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir exercício</AlertDialogTitle>
                        <AlertDialogDescription>
                            {data?.name ? (
                                <>
                                    Você tem certeza que deseja excluir <strong>{data.name}</strong>?
                                    <br />
                                    Essa ação não pode ser desfeita.
                                </>
                            ) : (
                                "Você tem certeza que deseja excluir este exercício? Essa ação não pode ser desfeita."
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer" disabled={deleting}>
                            Cancelar
                        </AlertDialogCancel>

                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:opacity-90"
                            onClick={(e) => {
                                e.preventDefault();
                                onDeleteConfirmed();
                            }}
                            disabled={deleting}
                        >
                            {deleting ? "Excluindo..." : "Excluir"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
