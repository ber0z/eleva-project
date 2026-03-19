"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Flag,
  Loader2,
  PlayCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

/* ===== Tipos ===== */
type TrainingExercise = {
  id: number;
  exerciseId?: number | null;
  name: string;
  technique?: string | null;
  sets: number;
  reps?: number | null;
  weight?: number | null;
  restTime?: number | null;
  type?: string | null;
  notes?: string | null;
};

type TrainingWorkout = {
  id: number;
  title: string;
  dayOfWeek: string;
  notes?: string | null;
  exercises: TrainingExercise[];
  training: { id: number; title?: string | null };
};

type SetLog = {
  setNumber: number;
  reps: string;
  weight: string;
  completed: boolean;
};

type ExerciseLog = {
  exercise: TrainingExercise;
  sets: SetLog[];
};

type CatalogExercise = {
  id: number;
  videoUrl?: string | null;
  description?: string | null;
};

/* ===== Helpers ===== */
const DOW_LABEL: Record<string, string> = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo",
};

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatRestTime(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}min ${s}s` : `${m}min`;
}

function buildInitialLogs(workout: TrainingWorkout): ExerciseLog[] {
  return workout.exercises.map((exercise) => ({
    exercise,
    sets: Array.from({ length: Math.max(1, exercise.sets) }, (_, i) => ({
      setNumber: i + 1,
      reps: String(exercise.reps ?? ""),
      weight: String(exercise.weight ?? ""),
      completed: false,
    })),
  }));
}

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/
  );
  return match?.[1] ?? null;
}

/* ===== Componente ===== */
export default function ExecuteWorkoutPage() {
  const params = useParams();
  const router = useRouter();
  const workoutId = Number(params.workoutId);

  const [workout, setWorkout] = useState<TrainingWorkout | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);

  // Quais exercícios estão expandidos
  const [openExercises, setOpenExercises] = useState<Record<number, boolean>>({});

  // Cache de dados do catálogo (busca lazy)
  const [catalogCache, setCatalogCache] = useState<Record<number, CatalogExercise | null>>({});
  const [loadingCatalog, setLoadingCatalog] = useState<Record<number, boolean>>({});

  // Vídeo modal
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Stopwatch
  const [started, setStarted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startTimeRef = useRef<number>(0);

  // Rest timer
  const [restTimer, setRestTimer] = useState<{
    remaining: number;
    total: number;
  } | null>(null);

  // Rest timer: visibilidade inline via IntersectionObserver
  const restTimerSentinelRef = useRef<HTMLDivElement>(null);
  const [restTimerInView, setRestTimerInView] = useState(true);

  // Finalização
  const [showSummary, setShowSummary] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finishErr, setFinishErr] = useState<string | null>(null);

  const storageKey = `workout_session_${workoutId}`;

  // Carregar workout
  useEffect(() => {
    if (!workoutId) return;
    api
      .get(`/training/workout/${workoutId}`)
      .then((res) => {
        setWorkout(res.data);
        setExerciseLogs(buildInitialLogs(res.data));

        // Restaurar sessão salva (caso o browser tenha descarregado a aba)
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const savedAt = Number(saved);
          const SIX_HOURS = 6 * 60 * 60 * 1000;
          if (Date.now() - savedAt < SIX_HOURS) {
            startTimeRef.current = savedAt;
            setStarted(true);
            setElapsedSeconds(Math.floor((Date.now() - savedAt) / 1000));
          } else {
            localStorage.removeItem(storageKey);
          }
        }
      })
      .catch((err) => {
        setLoadErr(isAxiosError(err) ? err.message : "Erro ao carregar treino");
      })
      .finally(() => setLoading(false));
  }, [workoutId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cronômetro — só inicia quando started === true
  useEffect(() => {
    if (!started) return;
    // Só define o início se não foi restaurado do localStorage
    if (startTimeRef.current === 0) {
      startTimeRef.current = Date.now();
    }
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [started]);

  // IntersectionObserver para sentinela do rest timer
  useEffect(() => {
    const el = restTimerSentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setRestTimerInView(entry.isIntersecting),
      { threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Countdown de descanso
  useEffect(() => {
    if (!restTimer) return;
    if (restTimer.remaining <= 0) {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
      setRestTimer(null);
      return;
    }
    const t = setTimeout(() => {
      setRestTimer((prev) =>
        prev ? { ...prev, remaining: prev.remaining - 1 } : null
      );
    }, 1000);
    return () => clearTimeout(t);
  }, [restTimer]);

  function toggleExercise(exerciseIdx: number) {
    setOpenExercises((prev) => {
      const isOpen = !!prev[exerciseIdx];
      const next = { ...prev, [exerciseIdx]: !isOpen };

      // Busca dados do catálogo ao abrir pela primeira vez
      if (!isOpen) {
        const ex = exerciseLogs[exerciseIdx]?.exercise;
        if (
          ex?.exerciseId != null &&
          !(ex.exerciseId in catalogCache) &&
          !loadingCatalog[ex.exerciseId]
        ) {
          setLoadingCatalog((p) => ({ ...p, [ex.exerciseId!]: true }));
          api
            .get(`/exercise/${ex.exerciseId}`)
            .then((res) =>
              setCatalogCache((p) => ({ ...p, [ex.exerciseId!]: res.data }))
            )
            .catch(() =>
              setCatalogCache((p) => ({ ...p, [ex.exerciseId!]: null }))
            )
            .finally(() =>
              setLoadingCatalog((p) => ({ ...p, [ex.exerciseId!]: false }))
            );
        }
      }

      return next;
    });
  }

  function toggleSet(exerciseIdx: number, setIdx: number) {
    const wasCompleted = exerciseLogs[exerciseIdx]?.sets[setIdx]?.completed;

    setExerciseLogs((prev) => {
      const next = prev.map((el, ei) =>
        ei !== exerciseIdx
          ? el
          : {
              ...el,
              sets: el.sets.map((s, si) =>
                si !== setIdx ? s : { ...s, completed: !s.completed }
              ),
            }
      );

      // Auto-colapso se todas as séries foram completadas
      const updatedEl = next[exerciseIdx];
      if (updatedEl && updatedEl.sets.every((s) => s.completed)) {
        setOpenExercises((p) => ({ ...p, [exerciseIdx]: false }));
      }

      return next;
    });

    if (!wasCompleted) {
      const restTime = exerciseLogs[exerciseIdx]?.exercise.restTime;
      if (restTime && restTime > 0) {
        setRestTimer({ remaining: restTime, total: restTime });
      }
    } else {
      setRestTimer(null);
    }
  }

  function markAllSets(exerciseIdx: number) {
    setExerciseLogs((prev) =>
      prev.map((el, ei) =>
        ei !== exerciseIdx
          ? el
          : { ...el, sets: el.sets.map((s) => ({ ...s, completed: true })) }
      )
    );

    // Inicia rest timer com o restTime do exercício
    const restTime = exerciseLogs[exerciseIdx]?.exercise.restTime;
    if (restTime && restTime > 0) {
      setRestTimer({ remaining: restTime, total: restTime });
    }

    // Auto-colapso
    setOpenExercises((p) => ({ ...p, [exerciseIdx]: false }));
  }

  function updateSetField(
    exerciseIdx: number,
    setIdx: number,
    field: "reps" | "weight",
    value: string
  ) {
    setExerciseLogs((prev) =>
      prev.map((el, ei) =>
        ei !== exerciseIdx
          ? el
          : {
              ...el,
              sets: el.sets.map((s, si) =>
                si !== setIdx ? s : { ...s, [field]: value }
              ),
            }
      )
    );
  }

  async function finishWorkout() {
    if (!workout) return;
    setFinishing(true);
    setFinishErr(null);

    const durationMinutes = Math.max(1, Math.floor(elapsedSeconds / 60));

    const exerciseLogsPayload = exerciseLogs.flatMap((el) =>
      el.sets.map((s) => ({
        trainingExerciseId: el.exercise.id,
        name: el.exercise.name,
        setNumber: s.setNumber,
        reps: s.reps !== "" ? Number(s.reps) : null,
        weight: s.weight !== "" ? Number(s.weight) : null,
        completed: s.completed,
      }))
    );

    try {
      const { data } = await api.post("/physical-activities", {
        name: workout.title,
        type: "strength",
        duration: durationMinutes,
        date: new Date().toISOString(),
        trainingWorkoutId: workout.id,
        exerciseLogs: exerciseLogsPayload,
      });
      localStorage.removeItem(storageKey);
      router.push(`/app/activities/physical/${data.id}`);
    } catch (err) {
      setFinishErr(isAxiosError(err) ? err.message : "Falha ao salvar treino");
      setFinishing(false);
    }
  }

  const totalSets = exerciseLogs.reduce((acc, el) => acc + el.sets.length, 0);
  const completedSets = exerciseLogs.reduce(
    (acc, el) => acc + el.sets.filter((s) => s.completed).length,
    0
  );

  /* ===== Loading / Error ===== */
  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadErr || !workout) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background px-4">
        <p className="text-sm text-destructive">{loadErr ?? "Treino não encontrado"}</p>
        <Button variant="outline" onClick={() => router.back()}>
          Voltar
        </Button>
      </div>
    );
  }

  /* ===== UI ===== */
  return (
    <div className="min-h-svh bg-background pb-28">
      <div className="mx-auto max-w-2xl px-4 py-5">

        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer gap-1.5"
            onClick={() => { localStorage.removeItem(storageKey); router.back(); }}
            disabled={finishing}
          >
            <ArrowLeft className="h-4 w-4" />
            Sair
          </Button>

          <span className="font-mono text-xl font-bold tabular-nums">
            {formatElapsed(elapsedSeconds)}
          </span>
        </div>

        {/* Card do treino */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <p className="text-lg font-semibold leading-tight">{workout.title}</p>
            <p className="text-xs text-muted-foreground">
              {DOW_LABEL[workout.dayOfWeek] ?? workout.dayOfWeek}
              {" · "}
              {workout.exercises.length} exercício
              {workout.exercises.length !== 1 ? "s" : ""}
            </p>
            {workout.notes && (
              <p className="mt-1 text-xs text-muted-foreground/70">{workout.notes}</p>
            )}
          </CardContent>
        </Card>

        {/* Sentinela para IntersectionObserver do rest timer */}
        <div ref={restTimerSentinelRef} className="h-0" />

        {/* Banner de descanso inline (só quando visível no viewport) */}
        {restTimer && restTimerInView && (
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3">
            <span className="text-sm font-medium">Descanso</span>
            <span className="font-mono text-2xl font-bold text-primary">
              {formatRestTime(restTimer.remaining)}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="cursor-pointer"
              onClick={() => setRestTimer(null)}
            >
              Pular
            </Button>
          </div>
        )}

        {/* Cards de exercício */}
        {exerciseLogs.map((el, exerciseIdx) => {
          const isOpen = !!openExercises[exerciseIdx];
          const completedCount = el.sets.filter((s) => s.completed).length;
          const totalCount = el.sets.length;
          const allDone = completedCount === totalCount;

          const catalogId = el.exercise.exerciseId;
          const catalog = catalogId != null ? catalogCache[catalogId] : undefined;
          const isLoadingCatalog = catalogId != null && !!loadingCatalog[catalogId];

          const presetParts: string[] = [];
          if (el.exercise.sets) presetParts.push(`${el.exercise.sets}x`);
          if (el.exercise.reps) presetParts.push(`${el.exercise.reps} reps`);
          if (el.exercise.weight) presetParts.push(`${el.exercise.weight}kg`);
          if (el.exercise.restTime)
            presetParts.push(`${formatRestTime(el.exercise.restTime)} desc.`);
          const presetSummary = presetParts.join(" · ");

          return (
            <Card
              key={el.exercise.id}
              className={`mb-3 transition-all ${allDone ? "opacity-70" : ""}`}
            >
              {/* Cabeçalho clicável */}
              <button
                type="button"
                className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left"
                onClick={() => toggleExercise(exerciseIdx)}
                disabled={finishing}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{el.exercise.name}</p>
                  {presetSummary && (
                    <p className="truncate text-xs text-muted-foreground">{presetSummary}</p>
                  )}
                </div>
                <div className="ml-3 flex shrink-0 items-center gap-2">
                  <span
                    className={`text-xs font-medium tabular-nums ${
                      allDone ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {completedCount}/{totalCount}
                    {allDone && <Check className="ml-1 inline h-3 w-3" />}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Conteúdo expandido */}
              {isOpen && (
                <CardContent className="border-t border-border/30 px-4 pb-4 pt-3">
                  {/* Técnica e notas */}
                  {(el.exercise.technique || el.exercise.notes) && (
                    <div className="mb-3 space-y-0.5">
                      {el.exercise.technique && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Técnica:</span> {el.exercise.technique}
                        </p>
                      )}
                      {el.exercise.notes && (
                        <p className="text-xs text-muted-foreground/70">{el.exercise.notes}</p>
                      )}
                    </div>
                  )}

                  {/* Botão de vídeo (lazy catalog) */}
                  {isLoadingCatalog && (
                    <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Carregando detalhes…
                    </div>
                  )}
                  {catalog?.videoUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mb-3 cursor-pointer gap-1.5"
                      onClick={() => setVideoUrl(catalog.videoUrl!)}
                    >
                      <PlayCircle className="h-4 w-4" />
                      Ver vídeo
                    </Button>
                  )}

                  {/* Cabeçalho das colunas */}
                  <div className="mb-1 grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 px-1 text-xs text-muted-foreground">
                    <span className="text-center">#</span>
                    <span className="text-center">Peso (kg)</span>
                    <span className="text-center">Reps</span>
                    <span />
                  </div>

                  {/* Linhas de séries */}
                  <div className="space-y-2">
                    {el.sets.map((set, setIdx) => (
                      <div
                        key={set.setNumber}
                        className={`grid grid-cols-[2rem_1fr_1fr_2.5rem] items-center gap-2 rounded-xl px-2 py-1.5 transition-colors ${
                          set.completed ? "bg-primary/8" : "bg-muted/30"
                        }`}
                      >
                        <span className="text-center text-sm font-medium text-muted-foreground">
                          {set.setNumber}
                        </span>

                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step={0.5}
                          value={set.weight}
                          placeholder="—"
                          onChange={(e) =>
                            updateSetField(exerciseIdx, setIdx, "weight", e.target.value)
                          }
                          disabled={!started || finishing}
                          className="w-full rounded-md border border-border/40 bg-background px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50"
                        />

                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={set.reps}
                          placeholder="—"
                          onChange={(e) =>
                            updateSetField(exerciseIdx, setIdx, "reps", e.target.value)
                          }
                          disabled={!started || finishing}
                          className="w-full rounded-md border border-border/40 bg-background px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50"
                        />

                        {/* Checkbox circular */}
                        <button
                          type="button"
                          onClick={() => toggleSet(exerciseIdx, setIdx)}
                          disabled={!started || finishing}
                          className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 transition-colors disabled:opacity-50 ${
                            set.completed
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background"
                          }`}
                        >
                          {set.completed && <Check className="h-4 w-4" />}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Botão "Marcar todas as séries" */}
                  {!allDone && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full cursor-pointer gap-1.5"
                      onClick={() => markAllSets(exerciseIdx)}
                      disabled={!started || finishing}
                    >
                      <CheckCheck className="h-4 w-4" />
                      Marcar todas as séries
                    </Button>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}

        {/* Erro de finalização */}
        {finishErr && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {finishErr}
          </div>
        )}
      </div>

      {/* Barra fixa inferior */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border/30 bg-background/95 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl">
          {!started ? (
            <Button
              className="w-full cursor-pointer gap-2"
              onClick={() => {
                const now = Date.now();
                localStorage.setItem(storageKey, String(now));
                setStarted(true);
              }}
            >
              <PlayCircle className="h-4 w-4" />
              Iniciar treino
            </Button>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">
                {completedSets}/{totalSets} séries
              </span>
              <Button
                className="cursor-pointer gap-2"
                onClick={() => setShowSummary(true)}
                disabled={finishing}
              >
                <Flag className="h-4 w-4" />
                Finalizar treino
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Sticky pill do rest timer (quando fora do viewport) */}
      {restTimer && !restTimerInView && (
        <div className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-3 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-primary/30 bg-background/95 px-4 py-2 shadow-lg backdrop-blur-sm">
            <span className="text-xs text-muted-foreground">Descanso</span>
            <span className="font-mono text-lg font-bold text-primary tabular-nums">
              {formatRestTime(restTimer.remaining)}
            </span>
            <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-1000"
                style={{ width: `${(restTimer.remaining / restTimer.total) * 100}%` }}
              />
            </div>
            <button
              type="button"
              onClick={() => setRestTimer(null)}
              className="cursor-pointer text-xs text-muted-foreground hover:text-foreground"
            >
              Pular
            </button>
          </div>
        </div>
      )}

      {/* AlertDialog de confirmação */}
      <AlertDialog
        open={showSummary}
        onOpenChange={(o) => !finishing && setShowSummary(o)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar treino</AlertDialogTitle>
            <AlertDialogDescription>
              {completedSets === 0
                ? "Nenhuma série marcada como concluída."
                : `${completedSets} de ${totalSets} série${totalSets !== 1 ? "s" : ""} concluída${completedSets !== 1 ? "s" : ""}.`}{" "}
              Duração: {formatElapsed(elapsedSeconds)}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={finishing}>Continuar</AlertDialogCancel>
            <AlertDialogAction onClick={finishWorkout} disabled={finishing}>
              {finishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Salvar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de vídeo */}
      <AlertDialog open={!!videoUrl} onOpenChange={(o) => !o && setVideoUrl(null)}>
        <AlertDialogContent className="max-w-lg p-0 overflow-hidden">
          <AlertDialogHeader className="px-4 pt-4">
            <AlertDialogTitle>Vídeo do exercício</AlertDialogTitle>
          </AlertDialogHeader>
          {videoUrl && (() => {
            const ytId = getYouTubeId(videoUrl);
            return ytId ? (
              <div className="aspect-video w-full">
                <iframe
                  src={`https://www.youtube.com/embed/${ytId}`}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="px-4 py-2">
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary underline"
                >
                  {videoUrl}
                </a>
              </div>
            );
          })()}
          <AlertDialogFooter className="px-4 pb-4">
            <AlertDialogCancel onClick={() => setVideoUrl(null)}>Fechar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
