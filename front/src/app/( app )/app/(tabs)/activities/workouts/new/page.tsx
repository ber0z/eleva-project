"use client";

import { useEffect, useMemo, useState, type ReactNode, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";
import {
  ArrowLeft,
  Dumbbell,
  FileText,
  ExternalLink,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Save,
  Search,
  PlayCircle,
  X,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

// ✅ ajuste o import conforme seu projeto (alias recomendado)
// import Modal from "@/components/ui/Modal";
import Modal from "../../../../../../../components/ui/Modal";

/** ===== Types ===== */
type ExerciseCatalogItem = {
  id: number;
  name: string;
  muscleGroup?: string | null;
  equipment?: string | null;
  difficultyLevel?: string | null;
  type?: string | null;
  description?: string | null;
  videoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

type ExercisesResponse = {
  items: ExerciseCatalogItem[];
  total: number;
  page: number;
  pageSize: number;
};

type UiExercise = {
  __key: string;
  // create: sem id
  exerciseId: number | null;
  name: string;
  technique: string;
  sets: string;
  reps: string;
  weight: string;
  type: string;
  notes: string;
};

type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

type UiWorkout = {
  __key: string;
  // create: sem id
  title: string;
  dayOfWeek: DayOfWeek;
  notes: string;
  exercises: UiExercise[];
};

type TrainingExerciseCreateBody = {
  exerciseId?: number;
  name?: string;
  technique?: string;
  sets?: number;
  reps?: number;
  weight?: number;
  type?: string;
  notes?: string;
};

type TrainingWorkoutCreateBody = {
  title: string;
  dayOfWeek: DayOfWeek;
  notes?: string;
  exercises: TrainingExerciseCreateBody[];
};

type TrainingCreateBody = {
  title?: string;
  notes?: string;
  workouts: TrainingWorkoutCreateBody[];
};

const DOW_LABEL: Record<DayOfWeek, string> = {
  monday: "Segunda",
  tuesday: "Terça",
  wednesday: "Quarta",
  thursday: "Quinta",
  friday: "Sexta",
  saturday: "Sábado",
  sunday: "Domingo",
};

function uid(prefix = "k") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

const inputBase =
  "w-full max-w-full rounded-md border border-border/30 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40";


function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-1 min-w-0">
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

const toIntOrUndef = (v: string): number | undefined => {
  const s = (v ?? "").trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) && Number.isInteger(n) ? n : undefined;
};

const toNumOrUndef = (v: string): number | undefined => {
  const s = (v ?? "").trim();
  if (!s) return undefined;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
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

/** ===== Page ===== */
export default function TrainingCreatePage() {
  const router = useRouter();

  // main fields
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  // document
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  // workouts
  const [workouts, setWorkouts] = useState<UiWorkout[]>([]);
  const [openWorkouts, setOpenWorkouts] = useState<Record<string, boolean>>({});
  const [openExercises, setOpenExercises] = useState<Record<string, boolean>>({});

  // confirmation delete workout
  const [deleteWorkoutOpen, setDeleteWorkoutOpen] = useState(false);
  const [deleteWorkoutKey, setDeleteWorkoutKey] = useState<string | null>(null);

  const deleteWorkoutLabel = useMemo(() => {
    if (!deleteWorkoutKey) return null;
    const w = workouts.find((x) => x.__key === deleteWorkoutKey);
    if (!w) return null;
    return w.title?.trim() ? w.title : "Treino sem título";
  }, [deleteWorkoutKey, workouts]);

  // catalog
  const [exCatalog, setExCatalog] = useState<ExerciseCatalogItem[]>([]);
  const [exPage, setExPage] = useState(1);
  const [exTotal, setExTotal] = useState<number | null>(null);
  const [exLoading, setExLoading] = useState(false);
  const [exErr, setExErr] = useState<string | null>(null);
  const EX_PAGE_SIZE = 50;

  const exHasMore = useMemo(() => {
    if (exTotal == null) return true;
    return exCatalog.length < exTotal;
  }, [exCatalog.length, exTotal]);

  const exById = useMemo(() => {
    const map = new Map<number, ExerciseCatalogItem>();
    for (const e of exCatalog) map.set(e.id, e);
    return map;
  }, [exCatalog]);

  // ✅ Modal catálogo (novo)
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [catalogModalTarget, setCatalogModalTarget] = useState<{ workoutKey: string; exKey: string } | null>(null);
  const [catalogModalQuery, setCatalogModalQuery] = useState("");

  function openCatalogModal(workoutKey: string, exKey: string) {
    setCatalogModalTarget({ workoutKey, exKey });
    setCatalogModalQuery("");
    setCatalogModalOpen(true);
  }

  function closeCatalogModal() {
    setCatalogModalOpen(false);
    setCatalogModalTarget(null);
    setCatalogModalQuery("");
  }

  const filteredCatalogModal = useMemo(() => {
    const q = catalogModalQuery.trim().toLowerCase();
    if (!q) return exCatalog;
    return exCatalog.filter((it) => it.name.toLowerCase().includes(q));
  }, [catalogModalQuery, exCatalog]);

  const selectedExerciseIdInModal = useMemo(() => {
    if (!catalogModalTarget) return null;
    const w = workouts.find((x) => x.__key === catalogModalTarget.workoutKey);
    const ex = w?.exercises.find((e) => e.__key === catalogModalTarget.exKey);
    return ex?.exerciseId ?? null;
  }, [catalogModalTarget, workouts]);

  // submit
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  // video modal
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoModal, setVideoModal] = useState<{ url: string; embedUrl: string | null; title: string } | null>(null);

  function openVideoModal(url: string, t: string) {
    setVideoModal({ url, embedUrl: toEmbedUrl(url), title: t });
    setVideoModalOpen(true);
  }

  async function fetchExercises(targetPage: number, reset = false) {
    setExLoading(true);
    setExErr(null);
    try {
      const { data } = await api.get<ExercisesResponse>("/exercise", {
        params: { page: targetPage, pageSize: EX_PAGE_SIZE },
      });

      setExPage(data.page);
      setExTotal(data.total);

      setExCatalog((prev) => {
        const merged = reset ? data.items : [...prev, ...data.items];
        const seen = new Set<number>();
        return merged.filter((it) => {
          if (seen.has(it.id)) return false;
          seen.add(it.id);
          return true;
        });
      });
    } catch (e) {
      if (isAxiosError(e)) setExErr(e.response?.data?.message || e.message || "Falha ao carregar exercícios");
      else setExErr("Falha ao carregar exercícios");
    } finally {
      setExLoading(false);
    }
  }

  useEffect(() => {
    void fetchExercises(1, true);
  }, []);

  // ===== UI helpers =====
  function toggleWorkoutOpen(key: string) {
    setOpenWorkouts((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleExerciseOpen(exKey: string) {
    setOpenExercises((prev) => ({ ...prev, [exKey]: !prev[exKey] }));
  }

  function requestDeleteWorkout(workoutKey: string) {
    setDeleteWorkoutKey(workoutKey);
    setDeleteWorkoutOpen(true);
  }

  function removeWorkoutNow(workoutKey: string) {
    const w = workouts.find((x) => x.__key === workoutKey);
    const exKeys = w?.exercises?.map((e) => e.__key) ?? [];

    setWorkouts((prev) => prev.filter((w2) => w2.__key !== workoutKey));

    setOpenWorkouts((prev) => {
      const next = { ...prev };
      delete next[workoutKey];
      return next;
    });

    setOpenExercises((prev) => {
      const next = { ...prev };
      for (const k of exKeys) delete next[k];
      return next;
    });

    if (catalogModalTarget && catalogModalTarget.workoutKey === workoutKey) {
      closeCatalogModal();
    }
  }

  function confirmDeleteWorkout() {
    if (!deleteWorkoutKey) return;
    removeWorkoutNow(deleteWorkoutKey);
    setDeleteWorkoutOpen(false);
    setDeleteWorkoutKey(null);
  }

  function addWorkout() {
    const exKey = uid("ex");
    const wKey = uid("w");

    const firstEx: UiExercise = {
      __key: exKey,
      exerciseId: null,
      name: "",
      technique: "",
      sets: "",
      reps: "",
      weight: "",
      type: "",
      notes: "",
    };

    const w: UiWorkout = {
      __key: wKey,
      title: "",
      dayOfWeek: "monday",
      notes: "",
      exercises: [firstEx],
    };

    setWorkouts((prev) => [w, ...prev]);
    setOpenWorkouts((prev) => ({ ...prev, [wKey]: true }));
    setOpenExercises((prev) => ({ ...prev, [exKey]: true }));
  }

  function updateWorkout(workoutKey: string, patch: Partial<UiWorkout>) {
    setWorkouts((prev) => prev.map((w) => (w.__key === workoutKey ? { ...w, ...patch } : w)));
  }

  function addExercise(workoutKey: string) {
    const exKey = uid("ex");
    const ex: UiExercise = {
      __key: exKey,
      exerciseId: null,
      name: "",
      technique: "",
      sets: "",
      reps: "",
      weight: "",
      type: "",
      notes: "",
    };

    setWorkouts((prev) =>
      prev.map((w) => (w.__key === workoutKey ? { ...w, exercises: [ex, ...w.exercises] } : w))
    );

    setOpenWorkouts((prev) => ({ ...prev, [workoutKey]: true }));
    setOpenExercises((prev) => ({ ...prev, [exKey]: true }));
  }

  function moveExercise(workoutKey: string, exKey: string, direction: "up" | "down") {
    setWorkouts((prev) =>
      prev.map((w) => {
        if (w.__key !== workoutKey) return w;
        const idx = w.exercises.findIndex((ex) => ex.__key === exKey);
        if (idx === -1) return w;
        const targetIdx = direction === "up" ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= w.exercises.length) return w;
        const next = [...w.exercises];
        [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
        return { ...w, exercises: next };
      })
    );
  }

  function removeExercise(workoutKey: string, exKey: string) {
    setWorkouts((prev) =>
      prev.map((w) =>
        w.__key === workoutKey ? { ...w, exercises: w.exercises.filter((ex) => ex.__key !== exKey) } : w
      )
    );

    setOpenExercises((prev) => {
      const next = { ...prev };
      delete next[exKey];
      return next;
    });

    if (catalogModalTarget && catalogModalTarget.exKey === exKey) {
      closeCatalogModal();
    }
  }

  function updateExercise(workoutKey: string, exKey: string, patch: Partial<UiExercise>) {
    setWorkouts((prev) =>
      prev.map((w) => {
        if (w.__key !== workoutKey) return w;
        return {
          ...w,
          exercises: w.exercises.map((ex) => (ex.__key === exKey ? { ...ex, ...patch } : ex)),
        };
      })
    );
  }

  function selectCatalogExercise(workoutKey: string, exKey: string, exerciseId: number | null) {
    if (!exerciseId) {
      updateExercise(workoutKey, exKey, { exerciseId: null });
      return;
    }

    const found = exById.get(exerciseId);
    updateExercise(workoutKey, exKey, {
      exerciseId,
      name: found?.name ?? "",
      type: found?.type ?? "",
    });
  }

  function formatBytes(bytes: number) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "";
    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    let v = bytes;
    while (v >= 1024 && i < units.length - 1) {
      v /= 1024;
      i++;
    }
    return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  // ===== Regras de obrigatoriedade =====
  // 1) precisa ter pelo menos 1 workout com title e pelo menos 1 exercise válido (catálogo ou nome)
  // 2) cada workout precisa ter dayOfWeek (já tem default, mas mantemos)
  const canSave = useMemo(() => {
    if (saving) return false;

    if (title.trim().length < 1) return false;
    // precisa ter ao menos 1 treino com título
    const workoutsWithTitle = workouts.filter((w) => w.title.trim().length > 0);
    if (workoutsWithTitle.length < 1) return false;

    // precisa existir ao menos 1 exercício válido em qualquer treino com título
    const hasAnyValidExercise = workoutsWithTitle.some((w) =>
      (w.exercises ?? []).some((ex) => {
        const hasCatalog = typeof ex.exerciseId === "number";
        const hasName = ex.name.trim().length > 0;
        return hasCatalog || hasName;
      })
    );

    return hasAnyValidExercise;
  }, [workouts, saving, title]);

  // ===== Payload (mesmo estilo do edit, mas SEM deleteDocument) =====
  function buildPayloadWorkouts(): TrainingWorkoutCreateBody[] {
    return workouts
      .map<TrainingWorkoutCreateBody | null>((w) => {
        const titleTrim = (w.title ?? "").trim();
        if (!titleTrim) return null;

        const exercises = (w.exercises ?? [])
          .map<TrainingExerciseCreateBody | null>((ex) => {
            const sets = toIntOrUndef(ex.sets);
            const reps = toIntOrUndef(ex.reps);
            const weight = toNumOrUndef(ex.weight);

            const hasExerciseId = typeof ex.exerciseId === "number";
            const hasName = isNonEmptyString(ex.name);

            if (!hasExerciseId && !hasName) return null;

            const payload: TrainingExerciseCreateBody = {
              ...(hasExerciseId ? { exerciseId: ex.exerciseId! } : {}),
              ...(hasName ? { name: ex.name.trim() } : {}),
              ...(isNonEmptyString(ex.technique) ? { technique: ex.technique.trim() } : {}),
              ...(sets !== undefined ? { sets } : {}),
              ...(reps !== undefined ? { reps } : {}),
              ...(weight !== undefined ? { weight } : {}),
              ...(isNonEmptyString(ex.type) ? { type: ex.type.trim() } : {}),
              ...(isNonEmptyString(ex.notes) ? { notes: ex.notes.trim() } : {}),
            };

            return payload;
          })
          .filter((x): x is TrainingExerciseCreateBody => x !== null);

        if (exercises.length < 1) return null;

        const wk: TrainingWorkoutCreateBody = {
          title: titleTrim,
          dayOfWeek: w.dayOfWeek,
          ...(isNonEmptyString(w.notes) ? { notes: w.notes.trim() } : {}),
          exercises,
        };

        return wk;
      })
      .filter((x): x is TrainingWorkoutCreateBody => x !== null);
  }

  function validateBeforeSubmit(workoutsPayload: TrainingWorkoutCreateBody[]): string | null {
    if (workoutsPayload.length < 1) return "Adicione pelo menos 1 treino.";

    for (let i = 0; i < workoutsPayload.length; i++) {
      const w = workoutsPayload[i];
      if (!w.title.trim()) return `Treino ${i + 1}: informe um título.`;
      if (!w.dayOfWeek) return `Treino ${i + 1}: selecione um dia da semana.`;
      if (!w.exercises || w.exercises.length < 1) return `Treino ${i + 1}: precisa de pelo menos 1 exercício.`;

      for (let j = 0; j < w.exercises.length; j++) {
        const ex = w.exercises[j];
        if (typeof ex.exerciseId !== "number" && !isNonEmptyString(ex.name)) {
          return `Treino ${i + 1}, exercício ${j + 1}: selecione do catálogo ou informe o nome.`;
        }
        if (ex.sets !== undefined && (!Number.isInteger(ex.sets) || ex.sets < 0)) {
          return `Treino ${i + 1}, exercício ${j + 1}: séries inválidas.`;
        }
        if (ex.reps !== undefined && (!Number.isInteger(ex.reps) || ex.reps <= 0)) {
          return `Treino ${i + 1}, exercício ${j + 1}: reps inválidas.`;
        }
        if (ex.weight !== undefined && (typeof ex.weight !== "number" || ex.weight <= 0)) {
          return `Treino ${i + 1}, exercício ${j + 1}: peso inválido.`;
        }
      }
    }

    return null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setSaveErr(null);

    try {
      const workoutsPayload = buildPayloadWorkouts();
      const msg = validateBeforeSubmit(workoutsPayload);
      if (msg) {
        setSaveErr(msg);
        setSaving(false);
        return;
      }

      const body: TrainingCreateBody = {
        ...(isNonEmptyString(title) ? { title: title.trim() } : {}),
        ...(isNonEmptyString(notes) ? { notes: notes.trim() } : {}),
        workouts: workoutsPayload,
      };

      const fd = new FormData();
      if (body.title) fd.set("title", body.title);
      if (body.notes) fd.set("notes", body.notes);
      if (documentFile) fd.set("document", documentFile);

      fd.set("workouts", JSON.stringify(body.workouts));

      const res = await api.post<{ id: number }>("/training", fd);

      if (res.data?.id) router.push(`/app/activities/workouts/${res.data.id}`);
      else router.push("/app/activities/workouts");
    } catch (error) {
      if (isAxiosError(error)) setSaveErr(error.response?.data?.message || error.message || "Falha ao salvar");
      else setSaveErr("Falha ao salvar");
    } finally {
      setSaving(false);
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

          <Button
            type="submit"
            form="training-create-form"
            disabled={saving || !canSave}
            className="cursor-pointer"
            title={!canSave ? "Preencha os campos obrigatórios para salvar" : "Salvar"}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>

        <form id="training-create-form" onSubmit={onSubmit} className="grid gap-3">
          {/* Dados principais */}
          <Card className="overflow-hidden">
            <div className="bg-primary/10 px-4 sm:px-6 py-4 border-b border-border/30">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-primary" />
                Novo treino
              </h2>
              
            </div>

            <CardContent className="grid gap-4 pt-5 px-4 sm:px-6">
              {saveErr ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {saveErr}
                </div>
              ) : null}

              <div className="grid gap-3">
                <Field label="Título (obrigatório)">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={inputBase}
                    placeholder="Ex.: Hipertrofia A/B"
                  />
                </Field>

                <Field label="Notas (opcional)">
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputBase} min-h-24`} />
                </Field>
              </div>

              <div className="rounded-xl bg-muted/40 p-3 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Documento (opcional)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Anexe um PDF ou imagem (ex.: ficha, avaliação, observações).
                    </p>
                  </div>

                  <label
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border/30 bg-background px-3 py-2 text-sm hover:bg-muted transition"
                    title={documentFile ? "Trocar arquivo" : "Selecionar arquivo"}
                  >
                    <Plus className="h-4 w-4" />
                    <span>{documentFile ? "Trocar arquivo" : "Selecionar arquivo"}</span>

                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        setDocumentFile(f);
                      }}
                    />
                  </label>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {documentFile ? (
                      <>
                        Selecionado: <span className="font-medium">{documentFile.name}</span>
                        {documentFile.size ? (
                          <span className="text-muted-foreground/70"> • {formatBytes(documentFile.size)}</span>
                        ) : null}
                      </>
                    ) : (
                      "Nenhum arquivo selecionado."
                    )}
                  </p>

                  {documentFile ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 px-3 bg-card cursor-pointer"
                      onClick={() => setDocumentFile(null)}
                      title="Remover arquivo selecionado"
                    >
                      <X className="h-4 w-4" />
                      <span className="ml-2 hidden sm:inline">Remover seleção</span>
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Workouts */}
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div>
                <h2 className="text-md font-semibold">Treinos</h2>
                
              </div>

              <Button type="button" variant="outline" className="bg-card cursor-pointer" onClick={addWorkout}>
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Adicionar</span>
                <span className="sm:hidden">Novo</span>
              </Button>
            </div>

            <div className="px-1 flex flex-wrap items-center justify-between gap-2">
              {exHasMore ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => fetchExercises(exPage + 1)}
                  disabled={exLoading}
                >
                  {exLoading ? "Carregando..." : "Carregar mais"}
                </Button>
              ) : null}
            </div>

            {exErr ? (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-300">
                {exErr}
              </div>
            ) : null}

            {workouts.length === 0 ? (
              <Card>
                <CardContent className="py-6 text-sm text-muted-foreground">
                  Adicione pelo menos um treino.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {workouts.map((w, idx) => {
                  const open = !!openWorkouts[w.__key];
                  const exCount = w.exercises?.length ?? 0;
                  const headerTitle = w.title?.trim() ? w.title : `Treino ${idx + 1}`;
                  const headerMeta = `${DOW_LABEL[w.dayOfWeek]} • ${exCount} exercício(s)`;

                  return (
                    <Card key={w.__key} className="overflow-hidden">
                      <div className="relative px-4 sm:px-6 py-4 flex flex-wrap items-start justify-between gap-2 bg-card">
                        <div className="absolute left-0 top-0 h-full w-1 bg-primary/35" />
                        <div className="min-w-0 flex-1 pl-2">
                          <p className="text-sm font-semibold truncate">{headerTitle}</p>
                          <p className="text-xs text-muted-foreground truncate">{headerMeta}</p>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant={open ? "secondary" : "outline"}
                            className="cursor-pointer px-3"
                            onClick={() => toggleWorkoutOpen(w.__key)}
                          >
                            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <span className="ml-2 hidden sm:inline">{open ? "Fechar" : "Exibir"}</span>
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            className="cursor-pointer border-destructive/40 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => requestDeleteWorkout(w.__key)}
                            title="Remover treino"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="ml-2 hidden sm:inline">Remover</span>
                          </Button>
                        </div>
                      </div>

                      {open ? (
                        <CardContent className="px-3 sm:px-4 py-4 bg-muted/20">
                          <div className="rounded-xl bg-muted/40 p-3 sm:p-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <Field label={"Título do treino"}>
                                <input
                                  value={w.title}
                                  onChange={(e) => updateWorkout(w.__key, { title: e.target.value })}
                                  className={inputBase}
                                  placeholder="Ex.: A - Peito/Tríceps"
                                  required
                                />
                              </Field>

                              <Field label={"Dia da semana"}>
                                <select
                                  value={w.dayOfWeek}
                                  onChange={(e) =>
                                    updateWorkout(w.__key, { dayOfWeek: e.target.value as DayOfWeek })
                                  }
                                  className={inputBase}
                                  required
                                >
                                  {Object.keys(DOW_LABEL).map((k) => (
                                    <option key={k} value={k}>
                                      {DOW_LABEL[k as DayOfWeek]}
                                    </option>
                                  ))}
                                </select>
                              </Field>
                            </div>

                            <div className="mt-3">
                              <Field label="Notas do treino (opcional)">
                                <input
                                  value={w.notes}
                                  onChange={(e) => updateWorkout(w.__key, { notes: e.target.value })}
                                  className={inputBase}
                                  placeholder="Opcional"
                                />
                              </Field>
                            </div>

                            {/* Exercises */}
                            <div className="mt-5 rounded-2xl bg-background/70 p-3 sm:p-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold">
                                    Exercícios{" "}
                                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                                      {w.exercises.length}
                                    </span>
                                  </p>
                                  <p className="mt-1 text-[11px] text-muted-foreground">
                                    Obrigatório: cada exercício precisa ter <b>catálogo</b> ou <b>nome</b>.
                                  </p>
                                </div>

                                <Button
                                  type="button"
                                  variant="outline"
                                  className="bg-card cursor-pointer"
                                  onClick={() => addExercise(w.__key)}
                                >
                                  <Plus className="h-4 w-4" />
                                  <span className="ml-2 hidden sm:inline">Adicionar</span>
                                </Button>
                              </div>

                              {w.exercises.length === 0 ? (
                                <p className="mt-3 text-sm text-muted-foreground">Adicione pelo menos um exercício.</p>
                              ) : (
                                <div className="mt-3 grid gap-3">
                                  {w.exercises.map((ex, exIdx) => {
                                    const exOpen = !!openExercises[ex.__key];
                                    const selectedCatalog =
                                      typeof ex.exerciseId === "number" ? exById.get(ex.exerciseId) : null;
                                    const videoUrl = selectedCatalog?.videoUrl ?? null;

                                    const titleLine =
                                      ex.name?.trim() || selectedCatalog?.name || `Exercício ${exIdx + 1}`;

                                    const meta = [
                                      ex.sets?.trim() ? `${ex.sets} séries` : null,
                                      ex.reps?.trim() ? `${ex.reps} reps` : null,
                                      ex.weight?.trim() ? `${ex.weight} kg` : null,
                                      ex.type?.trim() ? ex.type : selectedCatalog?.type ?? null,
                                    ]
                                      .filter(Boolean)
                                      .join(" • ");

                                    const selectedLabel =
                                      ex.exerciseId && selectedCatalog?.name
                                        ? selectedCatalog.name
                                        : ex.exerciseId
                                        ? `Catálogo #${ex.exerciseId}`
                                        : "Personalizado";

                                    const hasRequired = typeof ex.exerciseId === "number" || ex.name.trim().length > 0;

                                    return (
                                      <div key={ex.__key} className="flex relative overflow-hidden rounded-2xl bg-card shadow-sm">
                                        <div className="absolute left-0 top-0 h-full w-1.5 bg-primary/70" />

                                        <div className="flex-1 p-3 sm:p-4 pl-4 sm:pl-5">
                                          <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                              <p className="text-sm font-semibold truncate">{titleLine}</p>
                                              <p className="text-xs text-muted-foreground truncate">{meta || "—"}</p>

                                              {!hasRequired ? (
                                                <p className="mt-1 text-[11px] text-destructive">
                                                  Selecione do catálogo ou informe um nome.
                                                </p>
                                              ) : null}
                                            </div>

                                            <div className="flex flex-wrap items-center justify-end gap-2">
                                              <Button
                                                type="button"
                                                variant={exOpen ? "secondary" : "outline"}
                                                className="cursor-pointer px-3"
                                                onClick={() => toggleExerciseOpen(ex.__key)}
                                              >
                                                {exOpen ? (
                                                  <ChevronDown className="h-4 w-4" />
                                                ) : (
                                                  <ChevronRight className="h-4 w-4" />
                                                )}
                                                <span className="ml-2 hidden sm:inline">{exOpen ? "Fechar" : "Editar"}</span>
                                              </Button>

                                              <Button
                                                type="button"
                                                variant="outline"
                                                className="cursor-pointer border-destructive/40 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => removeExercise(w.__key, ex.__key)}
                                                title="Remover exercício"
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          </div>

                                          {exOpen ? (
                                            <div className="mt-4 rounded-xl bg-muted/40 p-3 sm:p-4">
                                              <div className="grid gap-3 sm:grid-cols-2">
                                                <div className="min-w-0">
                                                  <label className="text-xs text-muted-foreground">
                                                    Exercício do catálogo (opcional)
                                                  </label>

                                                  <div className="relative mt-1">
                                                    <button
                                                      type="button"
                                                      className={`${inputBase} flex items-center justify-between gap-2 text-left`}
                                                      onClick={() => openCatalogModal(w.__key, ex.__key)}
                                                    >
                                                      <span className="min-w-0 truncate">{selectedLabel}</span>
                                                      <ChevronDown className="h-4 w-4 shrink-0" />
                                                    </button>
                                                  </div>
                                                </div>

                                                <Field label={"Nome (se personalizado)"}>
                                                  <input
                                                    value={ex.name}
                                                    onChange={(e) =>
                                                      updateExercise(w.__key, ex.__key, { name: e.target.value })
                                                    }
                                                    className={inputBase}
                                                    placeholder="Ex.: Crucifixo máquina"
                                                  />
                                                  <p className="text-[11px] text-muted-foreground">
                                                    Se não escolher do catálogo, o nome é obrigatório.
                                                  </p>
                                                </Field>
                                              </div>

                                              {videoUrl ? (
                                                <div className="mt-3">
                                                  <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="w-full bg-card cursor-pointer"
                                                    onClick={() =>
                                                      openVideoModal(videoUrl, selectedCatalog?.name ?? ex.name ?? "Vídeo")
                                                    }
                                                  >
                                                    <PlayCircle className="mr-2 h-4 w-4" />
                                                    Vídeo
                                                  </Button>
                                                </div>
                                              ) : null}

                                              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                                <Field label="Séries">
                                                  <input
                                                    inputMode="numeric"
                                                    value={ex.sets}
                                                    onChange={(e) =>
                                                      updateExercise(w.__key, ex.__key, { sets: e.target.value })
                                                    }
                                                    className={inputBase}
                                                    placeholder="0"
                                                  />
                                                </Field>

                                                <Field label="Reps">
                                                  <input
                                                    inputMode="numeric"
                                                    value={ex.reps}
                                                    onChange={(e) =>
                                                      updateExercise(w.__key, ex.__key, { reps: e.target.value })
                                                    }
                                                    className={inputBase}
                                                    placeholder="12"
                                                  />
                                                </Field>

                                                <Field label="Carga (kg)">
                                                  <input
                                                    inputMode="decimal"
                                                    value={ex.weight}
                                                    onChange={(e) =>
                                                      updateExercise(w.__key, ex.__key, { weight: e.target.value })
                                                    }
                                                    className={inputBase}
                                                    placeholder="40"
                                                  />
                                                </Field>

                                                <Field label="Tipo (opcional)">
                                                  <input
                                                    value={ex.type}
                                                    onChange={(e) =>
                                                      updateExercise(w.__key, ex.__key, { type: e.target.value })
                                                    }
                                                    className={inputBase}
                                                    placeholder="Ex.: Força"
                                                  />
                                                </Field>
                                              </div>

                                              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                                <Field label="Técnica (opcional)">
                                                  <input
                                                    value={ex.technique}
                                                    onChange={(e) =>
                                                      updateExercise(w.__key, ex.__key, { technique: e.target.value })
                                                    }
                                                    className={inputBase}
                                                    placeholder="Ex.: cadência 3-1-3"
                                                  />
                                                </Field>

                                                <Field label="Notas (opcional)">
                                                  <input
                                                    value={ex.notes}
                                                    onChange={(e) =>
                                                      updateExercise(w.__key, ex.__key, { notes: e.target.value })
                                                    }
                                                    className={inputBase}
                                                    placeholder="Opcional"
                                                  />
                                                </Field>
                                              </div>
                                            </div>
                                          ) : null}
                                        </div>

                                        <div className="flex flex-col border-l border-border/60 divide-y divide-border/60">
                                          <button
                                            type="button"
                                            onClick={() => moveExercise(w.__key, ex.__key, "up")}
                                            disabled={exIdx === 0}
                                            title="Mover para cima"
                                            className="flex flex-1 items-center justify-center px-2 hover:bg-muted/60 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                                          >
                                            <ChevronUp className="h-3 w-3" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => moveExercise(w.__key, ex.__key, "down")}
                                            disabled={exIdx === w.exercises.length - 1}
                                            title="Mover para baixo"
                                            className="flex flex-1 items-center justify-center px-2 hover:bg-muted/60 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                                          >
                                            <ChevronDown className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      ) : null}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </form>
      </div>

      {/* ✅ NOVO MODAL DO CATÁLOGO */}
      <Modal open={catalogModalOpen} onClose={closeCatalogModal} title="Catálogo de exercícios" maxWidthClassName="max-w-3xl">
        <div className="space-y-3">
          <div className="sticky top-0 bg-background pb-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={catalogModalQuery}
                onChange={(e) => setCatalogModalQuery(e.target.value)}
                className={`${inputBase} pl-9 pr-9`}
                placeholder="Pesquisar no catálogo..."
                autoFocus
              />
              {catalogModalQuery ? (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setCatalogModalQuery("")}
                  title="Limpar"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground truncate">
                {catalogModalQuery ? `Encontrados: ${filteredCatalogModal.length}` : `Total: ${exCatalog.length}`}
              </p>

              {exHasMore ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-8"
                  onClick={() => fetchExercises(exPage + 1)}
                  disabled={exLoading}
                >
                  {exLoading ? "Carregando..." : "Carregar mais"}
                </Button>
              ) : null}
            </div>

            {exErr ? (
              <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-300">
                {exErr}
              </div>
            ) : null}
          </div>

          <div className="grid gap-2">
            <button
              type="button"
              className="w-full rounded-xl border border-border/30 px-3 py-2 text-left text-sm hover:bg-muted/50"
              onClick={() => {
                if (!catalogModalTarget) return;
                selectCatalogExercise(catalogModalTarget.workoutKey, catalogModalTarget.exKey, null);
                closeCatalogModal();
              }}
            >
              Personalizado
            </button>

            <div className="h-px bg-border" />

            {filteredCatalogModal.length === 0 ? (
              <div className="rounded-xl border border-border/30 p-3 text-sm text-muted-foreground">Nenhum exercício encontrado.</div>
            ) : (
              filteredCatalogModal.map((it) => {
                const active = selectedExerciseIdInModal === it.id;

                return (
                  <button
                    key={it.id}
                    type="button"
                    className={`
                      w-full rounded-xl border px-3 py-2 text-left hover:bg-muted/50 transition
                      ${active ? "border-primary/40 bg-primary/10" : "border-border/30"}
                    `}
                    onClick={() => {
                      if (!catalogModalTarget) return;
                      selectCatalogExercise(catalogModalTarget.workoutKey, catalogModalTarget.exKey, it.id);
                      closeCatalogModal();
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{it.name}</span>
                      {it.type ? (
                        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          {it.type}
                        </span>
                      ) : null}
                    </div>

                    {(it.muscleGroup || it.equipment || it.difficultyLevel) ? (
                      <div className="mt-1 text-xs text-muted-foreground truncate">
                        {[it.muscleGroup, it.equipment, it.difficultyLevel].filter(Boolean).join(" • ")}
                      </div>
                    ) : null}

                    {it.videoUrl ? <div className="mt-1 text-xs text-muted-foreground">Tem vídeo</div> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      {/* Confirm remover workout (apenas UI) */}
      <AlertDialog open={deleteWorkoutOpen} onOpenChange={setDeleteWorkoutOpen}>
        <AlertDialogContent className="w-[calc(100svw-2rem)] max-w-[560px] p-4 sm:p-6 rounded-2xl sm:rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover treino</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteWorkoutLabel ? (
                <>
                  Você tem certeza que deseja remover <strong>{deleteWorkoutLabel}</strong>?
                </>
              ) : (
                "Você tem certeza que deseja remover este treino?"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel
              className="cursor-pointer"
              onClick={() => {
                setDeleteWorkoutOpen(false);
                setDeleteWorkoutKey(null);
              }}
            >
              Cancelar
            </AlertDialogCancel>

            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:opacity-90"
              onClick={(e) => {
                e.preventDefault();
                confirmDeleteWorkout();
              }}
            >
              Remover
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
              <div className="rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">Preview não disponível para esse link.</div>
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
