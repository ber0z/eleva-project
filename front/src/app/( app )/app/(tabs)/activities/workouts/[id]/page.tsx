"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";
import {
  ArrowLeft,
  Dumbbell,
  Calendar,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Trash2,
  Pencil,
  PlayCircle,
  UserCheck,
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

type Exercise = {
  id: number;
  idWorkout: number;
  exerciseId: number | null;
  name: string;
  technique: string | null;
  restTime: number | null; // ✅
  sets: number | null;
  reps: number | null;
  weight: number | null;
  type: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type Workout = {
  id: number;
  idTraining: number;
  title: string;
  notes: string | null;
  dayOfWeek:
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday";
  createdAt: string;
  updatedAt: string;
  exercises: Exercise[];
};

type TrainingDetails = {
  id: number;
  idUser: number;
  title: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  idProfessional: number | null;
  professional?: { id: number; name: string } | null;
  workouts: Workout[];
  documentUrl?: string | null;
  documentUrlExpiresAt?: string | null;
};

type ExerciseDetails = {
  id: number;
  name: string;
  muscleGroup: string | null;
  equipment: string | null;
  difficultyLevel: string | null;
  type: string | null;
  description: string | null;
  videoUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

const DOW_LABEL: Record<Workout["dayOfWeek"], string> = {
  monday: "Segunda",
  tuesday: "Terça",
  wednesday: "Quarta",
  thursday: "Quinta",
  friday: "Sexta",
  saturday: "Sábado",
  sunday: "Domingo",
};

const DOW_ORDER: Record<Workout["dayOfWeek"], number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7,
};

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

export default function TrainingDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const trainingId = Number(params?.id);

  const [data, setData] = useState<TrainingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // workout abre/fecha com a seta
  const [openWorkouts, setOpenWorkouts] = useState<Record<number, boolean>>({});

  // ✅ exercício: seta abre detalhes do treino (technique/notes/restTime)
  const [openExerciseTraining, setOpenExerciseTraining] = useState<Record<number, boolean>>({});

  // ✅ exercício: botão "Detalhes" abre detalhes do catálogo (/exercise/:id)
  const [openExerciseCatalog, setOpenExerciseCatalog] = useState<Record<number, boolean>>({});

  // delete training
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  // cache detalhes do catálogo por exerciseId
  const [exerciseDetailsById, setExerciseDetailsById] = useState<Record<number, ExerciseDetails>>({});
  const [exerciseLoadingById, setExerciseLoadingById] = useState<Record<number, boolean>>({});
  const [exerciseErrById, setExerciseErrById] = useState<Record<number, string>>({});

  // vídeo modal
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoModal, setVideoModal] = useState<{
    url: string;
    embedUrl: string | null;
    title: string;
  } | null>(null);

  function openVideoModal(url: string, title: string) {
    setVideoModal({ url, embedUrl: toEmbedUrl(url), title });
    setVideoModalOpen(true);
  }

  function formatDateTime(iso: string) {
    try {
      const fmt = new Intl.DateTimeFormat("pt-BR", {
        timeZone: "UTC",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      return fmt.format(new Date(iso));
    } catch {
      return iso;
    }
  }

  function formatNumber(n: number) {
    if (Number.isInteger(n)) return String(n);
    return String(n);
  }

  // ✅ formata descanso (assumindo segundos)
  function formatRestTime(sec: number) {
    if (!Number.isFinite(sec) || sec < 0) return "—";
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s ? `${m}min ${String(s).padStart(2, "0")}s` : `${m}min`;
  }

  const workoutsSorted = useMemo(() => {
    const w = data?.workouts ?? [];
    return [...w].sort((a, b) => (DOW_ORDER[a.dayOfWeek] ?? 99) - (DOW_ORDER[b.dayOfWeek] ?? 99));
  }, [data?.workouts]);

  const totalWorkouts = data?.workouts?.length ?? 0;

  async function fetchDetails() {
    setLoading(true);
    setErr(null);

    if (!Number.isFinite(trainingId) || trainingId <= 0) {
      setErr("Treino inválido.");
      setLoading(false);
      return;
    }

    try {
      const res = await api.get<TrainingDetails>(`/training/${trainingId}`);
      setData(res.data);
      setErr(null);

      // mantém estados
      setOpenWorkouts((prev) => {
        const next: Record<number, boolean> = {};
        for (const wk of res.data.workouts ?? []) next[wk.id] = prev[wk.id] ?? false;
        return next;
      });

      setOpenExerciseTraining((prev) => {
        const next = { ...prev };
        for (const wk of res.data.workouts ?? []) {
          for (const ex of wk.exercises ?? []) next[ex.id] = prev[ex.id] ?? false;
        }
        return next;
      });

      setOpenExerciseCatalog((prev) => {
        const next = { ...prev };
        for (const wk of res.data.workouts ?? []) {
          for (const ex of wk.exercises ?? []) next[ex.id] = prev[ex.id] ?? false;
        }
        return next;
      });
    } catch (error) {
      if (isAxiosError(error)) setErr(error.response?.data?.message || error.message || "Falha ao carregar treino");
      else setErr("Falha ao carregar treino");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainingId]);

  async function ensureExerciseDetails(exerciseId: number) {
    if (exerciseDetailsById[exerciseId]) return;
    if (exerciseLoadingById[exerciseId]) return;

    setExerciseLoadingById((p) => ({ ...p, [exerciseId]: true }));
    setExerciseErrById((p) => {
      const n = { ...p };
      delete n[exerciseId];
      return n;
    });

    try {
      const { data } = await api.get<ExerciseDetails>(`/exercise/${exerciseId}`);
      setExerciseDetailsById((p) => ({ ...p, [exerciseId]: data }));
    } catch (e) {
      const msg = isAxiosError(e) ? e.response?.data?.message || e.message : "Falha ao carregar exercício";
      setExerciseErrById((p) => ({ ...p, [exerciseId]: msg }));
    } finally {
      setExerciseLoadingById((p) => ({ ...p, [exerciseId]: false }));
    }
  }

  function toggleWorkout(idWorkout: number) {
    setOpenWorkouts((prev) => ({ ...prev, [idWorkout]: !prev[idWorkout] }));
  }

  // ✅ seta do exercício: abre detalhes do treino (technique/notes/restTime)
  function toggleExerciseTraining(exId: number) {
    setOpenExerciseTraining((prev) => ({ ...prev, [exId]: !prev[exId] }));
  }

  // ✅ botão detalhes: abre detalhes do catálogo e busca /exercise/:id
  function toggleExerciseCatalog(exId: number, exerciseId: number | null) {
    setOpenExerciseCatalog((prev) => {
      const nextOpen = !prev[exId];
      return { ...prev, [exId]: nextOpen };
    });
    if (exerciseId) void ensureExerciseDetails(exerciseId);
  }

  function openDeleteDialog() {
    setDeleteErr(null);
    setDeleteOpen(true);
  }

  async function doDelete() {
    if (!data?.id) return;
    setDeleting(true);
    setDeleteErr(null);

    try {
      await api.delete(`/training/${data.id}`);
      setDeleteOpen(false);
      router.push("/app/activities/workouts");
    } catch (error) {
      if (isAxiosError(error)) setDeleteErr(error.response?.data?.message || error.message || "Falha ao excluir treino");
      else setDeleteErr("Falha ao excluir treino");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-svh bg-background text-foreground overflow-x-hidden">
      <div className="mx-auto w-full max-w-3xl px-3 sm:px-4 py-5 sm:py-6 pb-28">
        {/* Top bar */}
        <div className="mb-3 sm:mb-4 flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            className="bg-card cursor-pointer"
            onClick={() => router.push("/app/activities/workouts")}
            title="Voltar"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          {!loading && data ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" className="bg-card cursor-pointer">
                <Link href={`/app/activities/workouts/${data.id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Link>
              </Button>

              <Button
                variant="outline"
                className="cursor-pointer border-destructive/40 text-destructive hover:text-destructive hover:bg-destructive/10 bg-card"
                onClick={openDeleteDialog}
                title="Excluir treino"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            </div>
          ) : null}
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
                <Skeleton className="h-16 w-full rounded-xl" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Skeleton className="h-4 w-40" />
              </CardHeader>
              <CardContent className="grid gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </CardContent>
            </Card>
          </div>
        ) : err ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {err}
            <div className="mt-2">
              <Button size="sm" variant="outline" onClick={fetchDetails} className="bg-card cursor-pointer">
                Tentar novamente
              </Button>
            </div>
          </div>
        ) : !data ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5" />
                Treino não encontrado
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Não foi possível carregar os dados desse treino.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {/* Header */}
            <Card className="overflow-hidden">
              <div className="bg-primary/10 px-4 sm:px-6 py-4 border-b border-border/30">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-primary" />
                  {data.title}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Atualizado em {formatDateTime(data.updatedAt)}
                  </span>
                  <span className="text-muted-foreground/60">•</span>
                  <span>
                    {totalWorkouts} {totalWorkouts === 1 ? "treino" : "treinos"}
                  </span>
                  {data.idProfessional != null && (
                    <>
                      <span className="text-muted-foreground/60">•</span>
                      <span className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-400">
                        <UserCheck className="h-3.5 w-3.5" />
                        Passado por {data.professional?.name ?? "profissional"}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <CardContent className="px-4 sm:px-6 py-4 space-y-3">
                {data.notes ? (
                  <div className="rounded-xl bg-muted/40 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Notas: </span>
                    {data.notes}
                  </div>
                ) : null}

                {data.documentUrl ? (
                  <div className="rounded-xl bg-muted/40 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          Documento
                        </p>
                        
                      </div>

                      <Button asChild variant="outline" className="bg-background cursor-pointer">
                        <a href={data.documentUrl} target="_blank" rel="noreferrer">
                          Abrir <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* Workouts */}
            <div className="grid gap-3">
              <div className="px-1">
                <h2 className="text-sm font-semibold">Treinos</h2>
              </div>

              {workoutsSorted.length === 0 ? (
                <Card>
                  <CardContent className="py-6 text-sm text-muted-foreground">Nenhum treino cadastrado ainda.</CardContent>
                </Card>
              ) : (
                workoutsSorted.map((w) => {
                  const open = !!openWorkouts[w.id];
                  const exCount = w.exercises?.length ?? 0;

                  const headerMeta = [DOW_LABEL[w.dayOfWeek], w.notes ? w.notes : null, `${exCount} exercícios`]
                    .filter(Boolean)
                    .join(" • ");

                  return (
                    <Card key={w.id} className="overflow-hidden">
                      <div className="relative px-4 sm:px-6 py-4 flex flex-wrap items-start justify-between gap-2 bg-card">
                        <div className="absolute left-0 top-0 h-full w-1 bg-primary/35" />
                        <div className="min-w-0 flex-1 pl-2">
                          <p className="text-sm font-semibold truncate">{w.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{headerMeta}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            asChild
                            variant="default"
                            size="sm"
                            className="cursor-pointer gap-1.5"
                            title="Iniciar treino"
                          >
                            <Link href={`/app/activities/workouts/execute/${w.id}`}>
                              <PlayCircle className="h-4 w-4" />
                              <span className="hidden sm:inline">Iniciar</span>
                            </Link>
                          </Button>

                          <Button
                            type="button"
                            variant={open ? "secondary" : "outline"}
                            className="cursor-pointer px-3"
                            onClick={() => toggleWorkout(w.id)}
                          >
                            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <span className="ml-2 hidden sm:inline">{open ? "Fechar" : "Exibir"}</span>
                          </Button>
                        </div>
                      </div>

                      {open ? (
                        <CardContent className="px-3 sm:px-4 py-4 bg-muted/20">
                          <div className="rounded-2xl bg-background/70 p-3 sm:p-4">
                            <p className="text-sm font-semibold">
                              Exercícios{" "}
                              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                                {exCount}
                              </span>
                            </p>

                            {exCount === 0 ? (
                              <p className="mt-3 text-sm text-muted-foreground">Sem exercícios neste treino.</p>
                            ) : (
                              <div className="mt-3 grid gap-3">
                                {w.exercises.map((ex) => {
                                  const trainOpen = !!openExerciseTraining[ex.id];
                                  const catOpen = !!openExerciseCatalog[ex.id];

                                  // ✅ restTime entra no resumo
                                  const exMeta = [
                                    ex.type ? ex.type : null,
                                    ex.sets != null ? `${ex.sets} séries` : null,
                                    ex.reps != null ? `${ex.reps} reps` : null,
                                    ex.weight != null ? `${formatNumber(ex.weight)} kg` : null,
                                    ex.restTime != null ? `descanso ${formatRestTime(ex.restTime)}` : null,
                                  ]
                                    .filter(Boolean)
                                    .join(" • ");

                                  const catalogId = ex.exerciseId;

                                  return (
                                    <div key={ex.id} className="relative overflow-hidden rounded-2xl bg-card shadow-sm">
                                      <div className="absolute left-0 top-0 h-full w-1.5 bg-primary/70" />

                                      <div className="p-3 sm:p-4 pl-4 sm:pl-5">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                          <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold truncate">{ex.name}</p>
                                            <p className="text-xs text-muted-foreground truncate">{exMeta || "—"}</p>
                                          </div>

                                          <div className="flex flex-wrap items-center justify-end gap-2">
                                            {/* ✅ Seta: detalhes do TREINO (technique/notes/restTime) */}
                                            <Button
                                              type="button"
                                              variant={trainOpen ? "secondary" : "outline"}
                                              className="cursor-pointer px-3"
                                              onClick={() => toggleExerciseTraining(ex.id)}
                                              title={trainOpen ? "Fechar detalhes do treino" : "Abrir detalhes do treino"}
                                            >
                                              {trainOpen ? (
                                                <ChevronDown className="h-4 w-4" />
                                              ) : (
                                                <ChevronRight className="h-4 w-4" />
                                              )}
                                              <span className="ml-2 hidden sm:inline">{trainOpen ? "Fechar" : "Treino"}</span>
                                            </Button>
                                          </div>
                                        </div>

                                        {/* ✅ Painel do TREINO (abre pela seta) */}
                                        {trainOpen ? (
                                          <div className="mt-4 rounded-xl bg-muted/40 p-3 sm:p-4">
                                            {ex.technique ? (
                                              <p className="text-sm">
                                                <span className="text-muted-foreground">Técnica: </span>
                                                {ex.technique}
                                              </p>
                                            ) : null}

                                            {/* ✅ restTime aqui também */}
                                            {ex.restTime != null ? (
                                              <p className={`text-sm ${ex.technique ? "mt-2" : ""}`}>
                                                <span className="text-muted-foreground">Descanso: </span>
                                                {formatRestTime(ex.restTime)}
                                              </p>
                                            ) : null}

                                            {ex.notes ? (
                                              <p className={`text-sm ${ex.technique || ex.restTime != null ? "mt-2" : ""}`}>
                                                <span className="text-muted-foreground">Notas: </span>
                                                {ex.notes}
                                              </p>
                                            ) : null}

                                            {!ex.technique && ex.restTime == null && !ex.notes ? (
                                              <p className="text-sm text-muted-foreground">Sem detalhes adicionais do treino.</p>
                                            ) : null}

                                            <Button
                                              type="button"
                                              variant={catOpen ? "secondary" : "outline"}
                                              className="cursor-pointer px-3 mt-6"
                                              onClick={() => toggleExerciseCatalog(ex.id, catalogId)}
                                              disabled={!catalogId}
                                              title={!catalogId ? "Sem ID do catálogo" : "Ver detalhes do catálogo"}
                                            >
                                              <span className="hidden sm:inline">{catOpen ? "Fechar" : "Detalhes do exercício"}</span>
                                              <span className="sm:hidden">{catOpen ? "Fechar" : "Detalhes"}</span>
                                            </Button>
                                          </div>
                                        ) : null}

                                        {/* ✅ Painel do CATÁLOGO (abre pelo botão "Detalhes") */}
                                        {catOpen ? (
                                          <div className="mt-4 rounded-xl bg-muted/40 p-3 sm:p-4">
                                            {!catalogId ? (
                                              <p className="text-sm text-muted-foreground">
                                                Este exercício não possui ID do catálogo.
                                              </p>
                                            ) : exerciseLoadingById[catalogId] ? (
                                              <p className="text-sm text-muted-foreground">Carregando detalhes do catálogo...</p>
                                            ) : exerciseErrById[catalogId] ? (
                                              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                                {exerciseErrById[catalogId]}
                                                <div className="mt-2">
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="bg-card cursor-pointer"
                                                    onClick={() => ensureExerciseDetails(catalogId)}
                                                  >
                                                    Tentar novamente
                                                  </Button>
                                                </div>
                                              </div>
                                            ) : (() => {
                                                const d = exerciseDetailsById[catalogId];
                                                if (!d) return <p className="text-sm text-muted-foreground">Sem detalhes disponíveis.</p>;

                                                return (
                                                  <div className="grid gap-3">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                      {d.muscleGroup ? (
                                                        <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                                                          {d.muscleGroup}
                                                        </span>
                                                      ) : null}
                                                      {d.equipment ? (
                                                        <span className="rounded-full bg-muted px-2 py-1 text-xs text-foreground">
                                                          {d.equipment}
                                                        </span>
                                                      ) : null}
                                                      {d.difficultyLevel ? (
                                                        <span className="rounded-full bg-muted px-2 py-1 text-xs text-foreground">
                                                          {d.difficultyLevel}
                                                        </span>
                                                      ) : null}
                                                      {d.type ? (
                                                        <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                                                          {d.type}
                                                        </span>
                                                      ) : null}
                                                    </div>

                                                    {d.description ? (
                                                      <p className="text-sm text-foreground/90 whitespace-pre-line">{d.description}</p>
                                                    ) : null}

                                                    {d.videoUrl ? (
                                                      <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="bg-card cursor-pointer w-full sm:w-auto"
                                                        onClick={() => openVideoModal(d.videoUrl!, d.name)}
                                                      >
                                                        <PlayCircle className="mr-2 h-4 w-4" />
                                                        Vídeo
                                                      </Button>
                                                    ) : null}
                                                  </div>
                                                );
                                              })()}
                                          </div>
                                        ) : null}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      ) : null}
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal excluir treino */}
      <AlertDialog open={deleteOpen} onOpenChange={(open) => !deleting && setDeleteOpen(open)}>
        <AlertDialogContent className="w-[calc(100svw-2rem)] max-w-[560px] p-4 sm:p-6 rounded-2xl sm:rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir treino</AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai remover o treino e seus treinos/dias associados. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteErr ? (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-600 dark:text-rose-300">
              {deleteErr}
            </div>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="cursor-pointer">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                doDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:opacity-90"
              title="Confirmar exclusão"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal vídeo */}
      <AlertDialog open={videoModalOpen} onOpenChange={setVideoModalOpen}>
        <AlertDialogContent className="w-[calc(100svw-2rem)] max-w-[820px] p-4 sm:p-6 rounded-2xl sm:rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{videoModal?.title ?? "Vídeo"}</AlertDialogTitle>
            <AlertDialogDescription>
              {videoModal?.embedUrl ? "Assista ao vídeo abaixo." : "Este link não suporta preview aqui. Use o botão para abrir."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="mt-3">
            {videoModal?.embedUrl ? (
              <div className="aspect-video w-full overflow-hidden rounded-xl bg-black/10">
                <iframe
                  className="h-full w-full"
                  src={videoModal.embedUrl}
                  title={videoModal.title}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">
                Preview não disponível para esse link.
              </div>
            )}

            {videoModal?.url ? (
              <div className="mt-3">
                <Button asChild variant="outline" className="w-full sm:w-auto bg-card cursor-pointer">
                  <a href={videoModal.url} target="_blank" rel="noreferrer">
                    Abrir no link <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            ) : null}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Fechar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
