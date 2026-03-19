"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";
import { ArrowLeft, Dumbbell, Save, Link as LinkIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";




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

const inputBase =
    "w-full max-w-full rounded-md border border-border/30 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1 min-w-0">
            <label className="text-xs text-muted-foreground">{label}</label>
            {children}
        </div>
    );
}

function toNullable(v: string) {
    const s = (v ?? "").trim();
    return s.length ? s : null;
}

function isValidUrlOrEmpty(v: string) {
    const s = (v ?? "").trim();
    if (!s) return true;
    try {
        new URL(s);
        return true;
    } catch {
        return false;
    }
}

export default function ExerciseEditPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const exerciseId = Number(params?.id);

    // load
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [data, setData] = useState<ExerciseItem | null>(null);

    // form
    const [name, setName] = useState("");
    const [muscleGroup, setMuscleGroup] = useState("");
    const [equipment, setEquipment] = useState("");
    const [difficultyLevel, setDifficultyLevel] = useState("");
    const [type, setType] = useState("");
    const [description, setDescription] = useState("");
    const [videoUrl, setVideoUrl] = useState("");

    const [saving, setSaving] = useState(false);
    const [saveErr, setSaveErr] = useState<string | null>(null);
    const [touched, setTouched] = useState(false);

    const canSave = useMemo(() => name.trim().length > 0 && name.trim().length <= 255, [name]);
    const videoUrlOk = useMemo(() => isValidUrlOrEmpty(videoUrl), [videoUrl]);

    const nameError = useMemo(() => {
        const s = name.trim();
        if (!touched) return null;
        if (!s) return "Nome é obrigatório.";
        if (s.length > 255) return "Nome muito longo (máx. 255).";
        return null;
    }, [name, touched]);

    const videoError = useMemo(() => {
        if (!touched) return null;
        if (!videoUrlOk) return "URL inválida.";
        if (videoUrl.trim().length > 1024) return "URL muito longa (máx. 1024).";
        return null;
    }, [videoUrlOk, videoUrl, touched]);

    function buildPayload() {
        return {
            name: name.trim(),
            muscleGroup: toNullable(muscleGroup),
            equipment: toNullable(equipment),
            difficultyLevel: toNullable(difficultyLevel),
            type: toNullable(type),
            description: toNullable(description),
            videoUrl: toNullable(videoUrl),
        };
    }

    function fillForm(ex: ExerciseItem) {
        setName(ex.name ?? "");
        setMuscleGroup(ex.muscleGroup ?? "");
        setEquipment(ex.equipment ?? "");
        setDifficultyLevel(ex.difficultyLevel ?? "");
        setType(ex.type ?? "");
        setDescription(ex.description ?? "");
        setVideoUrl(ex.videoUrl ?? "");
    }

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
            fillForm(res.data);
            setTouched(false);
            setSaveErr(null);
        } catch (e) {
            if (isAxiosError(e)) setErr(e.response?.data?.message || e.message || "Falha ao carregar exercício");
            else setErr("Falha ao carregar exercício");
            setData(null);
        } finally {
            setLoading(false);
        }
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setTouched(true);
        if (!data?.id) return;
        if (!canSave || !videoUrlOk) return;

        setSaving(true);
        setSaveErr(null);

        try {
            const payload = buildPayload();


            await api.put(`/exercise/${data.id}`, payload);

            router.push(`/admin/exercises/${data.id}`);
        } catch (error) {
            if (isAxiosError(error)) setSaveErr(error.response?.data?.message || error.message || "Falha ao salvar");
            else setSaveErr("Falha ao salvar");
        } finally {
            setSaving(false);
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
                    <Button
                        variant="outline"
                        className="bg-card cursor-pointer"
                        onClick={() => router.push(data?.id ? `/admin/exercise/${data.id}` : "")}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar
                    </Button>

                    <Button type="submit" className="cursor-pointer" form="exercise-edit-form" disabled={saving || loading || !canSave || !videoUrlOk}>
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? "Salvando..." : "Salvar"}
                    </Button>
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
                        <CardContent className="text-sm text-muted-foreground">Não foi possível carregar os dados.</CardContent>
                    </Card>
                ) : (
                    <form id="exercise-edit-form" onSubmit={onSubmit} className="grid gap-3">
                        {/* Cabeçalho */}
                        <Card className="overflow-hidden">
                            <div className="bg-primary/10 px-4 sm:px-6 py-4 border-b border-border/30">
                                <h2 className="text-sm font-semibold flex items-center gap-2">
                                    <Dumbbell className="h-4 w-4 text-primary" />
                                    Editar exercício <span className="text-xs text-muted-foreground"></span>
                                </h2>

                            </div>

                            <CardContent className="grid gap-4 pt-5 px-4 sm:px-6">
                                {saveErr ? (
                                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                        {saveErr}
                                    </div>
                                ) : null}

                                <div className="grid gap-3">
                                    <Field label="Nome *">
                                        <input
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            onBlur={() => setTouched(true)}
                                            className="w-full max-w-full rounded-md border border-border/30 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                                            placeholder="Ex.: Agachamento Livre"
                                            maxLength={255}
                                        />
                                        {nameError ? (
                                            <p className="mt-1 text-xs text-destructive">{nameError}</p>
                                        ) : (
                                            <p className="mt-1 text-xs text-muted-foreground">{name.trim().length}/255</p>
                                        )}
                                    </Field>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <Field label="Grupo muscular (opcional)">
                                            <input
                                                value={muscleGroup}
                                                onChange={(e) => setMuscleGroup(e.target.value)}
                                                className={inputBase}
                                                placeholder="Ex.: Quadríceps"
                                                maxLength={64}
                                            />
                                            <p className="mt-1 text-xs text-muted-foreground">{muscleGroup.trim().length}/64</p>
                                        </Field>

                                        <Field label="Equipamento (opcional)">
                                            <input
                                                value={equipment}
                                                onChange={(e) => setEquipment(e.target.value)}
                                                className={inputBase}
                                                placeholder="Ex.: Barra"
                                                maxLength={64}
                                            />
                                            <p className="mt-1 text-xs text-muted-foreground">{equipment.trim().length}/64</p>
                                        </Field>
                                    </div>
                                </div>


                            </CardContent>
                        </Card>

                        {/* Detalhes / mídia */}
                        <Card className="overflow-hidden">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <LinkIcon className="h-4 w-4 text-primary" />
                                    Detalhes e mídia
                                </CardTitle>
                                <p className="text-xs text-muted-foreground">
                                    Campos opcionais do catálogo.
                                </p>
                            </CardHeader>

                            <CardContent className="grid gap-4">
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <Field label="Dificuldade (opcional)">
                                        <input
                                            value={difficultyLevel}
                                            onChange={(e) => setDifficultyLevel(e.target.value)}
                                            className={inputBase}
                                            placeholder="Ex.: Intermediário"
                                            maxLength={64}
                                        />
                                        <p className="mt-1 text-xs text-muted-foreground">{difficultyLevel.trim().length}/64</p>
                                    </Field>

                                    <Field label="Tipo (opcional)">
                                        <input
                                            value={type}
                                            onChange={(e) => setType(e.target.value)}
                                            className={inputBase}
                                            placeholder="Ex.: Força"
                                            maxLength={64}
                                        />
                                        <p className="mt-1 text-xs text-muted-foreground">{type.trim().length}/64</p>
                                    </Field>

                                    <Field label="Vídeo URL (opcional)">
                                        <input
                                            value={videoUrl}
                                            onChange={(e) => setVideoUrl(e.target.value)}
                                            onBlur={() => setTouched(true)}
                                            className={inputBase}
                                            placeholder="https://..."
                                            maxLength={1024}
                                            inputMode="url"
                                        />
                                        {videoError ? (
                                            <p className="mt-1 text-xs text-destructive">{videoError}</p>
                                        ) : (
                                            <p className="mt-1 text-xs text-muted-foreground">{videoUrl.trim().length}/1024</p>
                                        )}
                                    </Field>
                                </div>

                                <Field label="Descrição (opcional)">
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className={`${inputBase} min-h-28`}
                                        placeholder="Exercício composto focado em quadríceps e glúteos..."
                                        maxLength={1024}
                                    />
                                    <p className="mt-1 text-xs text-muted-foreground">{description.trim().length}/1024</p>
                                </Field>

                            </CardContent>
                        </Card>
                    </form>
                )}
            </div>
        </div>
    );
}
