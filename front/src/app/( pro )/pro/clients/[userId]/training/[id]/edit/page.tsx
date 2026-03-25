"use client";

import { useEffect, useMemo, useState, type ReactNode, type FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
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
  Loader2,
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

import Modal from "@/components/ui/Modal";

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

type DayOfWeek =
  | "monday" | "tuesday" | "wednesday" | "thursday"
  | "friday" | "saturday" | "sunday";

type UiExercise = {
  __key: string;
  id?: number;
  exerciseId: number | null;
  name: string;
  technique: string;
  restTime: string;
  sets: string;
  reps: string;
  weight: string;
  type: string;
  notes: string;
};

type UiWorkout = {
  __key: string;
  id?: number;
  title: string;
  dayOfWeek: DayOfWeek;
  notes: string;
  exercises: UiExercise[];
};

type TrainingDetails = {
  id: number;
  idProfessional: number | null;
  title: string;
  notes: string | null;
  documentUrl?: string | null;
  workouts: Array<{
    id: number;
    title: string;
    dayOfWeek: DayOfWeek;
    notes: string | null;
    exercises: Array<{
      id: number;
      exerciseId: number | null;
      name: string;
      technique: string | null;
      restTime: number | null;
      sets: number | null;
      reps: number | null;
      weight: number | null;
      type: string | null;
      notes: string | null;
    }>;
  }>;
};

type ProfessionalMe = { id: number; name: string };

const DOW_LABEL: Record<DayOfWeek, string> = {
  monday: "Segunda", tuesday: "Terça", wednesday: "Quarta", thursday: "Quinta",
  friday: "Sexta", saturday: "Sábado", sunday: "Domingo",
};

const DOW_OPTIONS: DayOfWeek[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

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

const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

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

function mapToUiWorkout(w: TrainingDetails["workouts"][0]): UiWorkout {
  return {
    __key: uid("w"),
    id: w.id,
    title: w.title,
    dayOfWeek: w.dayOfWeek,
    notes: w.notes ?? "",
    exercises: w.exercises.map((ex): UiExercise => ({
      __key: uid("ex"),
      id: ex.id,
      exerciseId: ex.exerciseId,
      name: ex.name,
      technique: ex.technique ?? "",
      restTime: ex.restTime != null ? String(ex.restTime) : "",
      sets: ex.sets != null ? String(ex.sets) : "",
      reps: ex.reps != null ? String(ex.reps) : "",
      weight: ex.weight != null ? String(ex.weight) : "",
      type: ex.type ?? "",
      notes: ex.notes ?? "",
    })),
  };
}

/** ===== Page ===== */
export default function TrainingEditPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.userId as string;
  const trainingId = Number(params?.id);

  // loading state
  const [loadingData, setLoadingData] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [notCreator, setNotCreator] = useState(false);
  const [existingDocumentUrl, setExistingDocumentUrl] = useState<string | null>(null);

  // main fields
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  // document
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [deleteDocument, setDeleteDocument] = useState(false);

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
    return w?.title?.trim() ? w.title : "Treino sem título";
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

  // ===== Load training data =====
  useEffect(() => {
    if (!Number.isFinite(trainingId) || trainingId <= 0) {
      setLoadErr("ID de treino inválido.");
      setLoadingData(false);
      return;
    }

    async function load() {
      try {
        const [trainingRes, meRes] = await Promise.all([
          api.get<{ training: TrainingDetails; permissions: string[] }>(
            `/professional/clients/${userId}/training/${trainingId}`
          ),
          api.get<ProfessionalMe>("/professional/me"),
        ]);

        const t = trainingRes.data.training;
        const me = meRes.data;

        if (t.idProfessional !== me.id) {
          setNotCreator(true);
          setLoadingData(false);
          return;
        }

        setTitle(t.title ?? "");
        setNotes(t.notes ?? "");
        setExistingDocumentUrl(t.documentUrl ?? null);
        const uiWorkouts = t.workouts.map(mapToUiWorkout);
        setWorkouts(uiWorkouts);
        const openMap: Record<string, boolean> = {};
        for (const w of uiWorkouts) openMap[w.__key] = true;
        setOpenWorkouts(openMap);
      } catch (error) {
        if (isAxiosError(error)) setLoadErr(error.response?.data?.error || error.message || "Falha ao carregar treino");
        else setLoadErr("Falha ao carregar treino");
      } finally {
        setLoadingData(false);
      }
    }

    void load();
    void fetchExercises(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, trainingId]);

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
        return merged.filter((it) => { if (seen.has(it.id)) return false; seen.add(it.id); return true; });
      });
    } catch (e) {
      if (isAxiosError(e)) setExErr(e.response?.data?.message || e.message || "Falha ao carregar exercícios");
      else setExErr("Falha ao carregar exercícios");
    } finally {
      setExLoading(false);
    }
  }

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
    setOpenWorkouts((prev) => { const n = { ...prev }; delete n[workoutKey]; return n; });
    setOpenExercises((prev) => { const n = { ...prev }; for (const k of exKeys) delete n[k]; return n; });
    if (catalogModalTarget && catalogModalTarget.workoutKey === workoutKey) closeCatalogModal();
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
    const firstEx: UiExercise = { __key: exKey, exerciseId: null, name: "", technique: "", restTime: "", sets: "", reps: "", weight: "", type: "", notes: "" };
    const w: UiWorkout = { __key: wKey, title: "", dayOfWeek: "monday", notes: "", exercises: [firstEx] };
    setWorkouts((prev) => [w, ...prev]);
    setOpenWorkouts((prev) => ({ ...prev, [wKey]: true }));
    setOpenExercises((prev) => ({ ...prev, [exKey]: true }));
  }

  function updateWorkout(workoutKey: string, patch: Partial<UiWorkout>) {
    setWorkouts((prev) => prev.map((w) => (w.__key === workoutKey ? { ...w, ...patch } : w)));
  }

  function addExercise(workoutKey: string) {
    const exKey = uid("ex");
    const ex: UiExercise = { __key: exKey, exerciseId: null, name: "", technique: "", restTime: "", sets: "", reps: "", weight: "", type: "", notes: "" };
    setWorkouts((prev) => prev.map((w) => (w.__key === workoutKey ? { ...w, exercises: [ex, ...w.exercises] } : w)));
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
      prev.map((w) => w.__key === workoutKey ? { ...w, exercises: w.exercises.filter((ex) => ex.__key !== exKey) } : w)
    );
    setOpenExercises((prev) => { const n = { ...prev }; delete n[exKey]; return n; });
    if (catalogModalTarget && catalogModalTarget.exKey === exKey) closeCatalogModal();
  }

  function updateExercise(workoutKey: string, exKey: string, patch: Partial<UiExercise>) {
    setWorkouts((prev) =>
      prev.map((w) => {
        if (w.__key !== workoutKey) return w;
        return { ...w, exercises: w.exercises.map((ex) => (ex.__key === exKey ? { ...ex, ...patch } : ex)) };
      })
    );
  }

  function selectCatalogExercise(workoutKey: string, exKey: string, exerciseId: number | null) {
    if (!exerciseId) { updateExercise(workoutKey, exKey, { exerciseId: null }); return; }
    const found = exById.get(exerciseId);
    updateExercise(workoutKey, exKey, { exerciseId, name: found?.name ?? "", type: found?.type ?? "" });
  }

  function formatBytes(bytes: number) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "";
    const units = ["B", "KB", "MB", "GB"];
    let i = 0; let v = bytes;
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  const canSave = useMemo(() => {
    if (saving) return false;
    if (title.trim().length < 1) return false;
    const workoutsWithTitle = workouts.filter((w) => w.title.trim().length > 0);
    if (workoutsWithTitle.length < 1) return false;
    return workoutsWithTitle.some((w) =>
      (w.exercises ?? []).some((ex) => typeof ex.exerciseId === "number" || ex.name.trim().length > 0)
    );
  }, [workouts, saving, title]);

  function buildPayloadWorkouts() {
    return workouts
      .map((w) => {
        const titleTrim = (w.title ?? "").trim();
        if (!titleTrim) return null;

        const exercises = (w.exercises ?? [])
          .map((ex) => {
            const sets = toIntOrUndef(ex.sets);
            const reps = toIntOrUndef(ex.reps);
            const weight = toNumOrUndef(ex.weight);
            const restTime = toIntOrUndef(ex.restTime);
            const hasExerciseId = typeof ex.exerciseId === "number";
            const hasName = isNonEmptyString(ex.name);
            if (!hasExerciseId && !hasName) return null;

            return {
              ...(ex.id ? { id: ex.id } : {}),
              ...(hasExerciseId ? { exerciseId: ex.exerciseId! } : {}),
              ...(hasName ? { name: ex.name.trim() } : {}),
              ...(isNonEmptyString(ex.technique) ? { technique: ex.technique.trim() } : {}),
              ...(restTime !== undefined ? { restTime } : {}),
              ...(sets !== undefined ? { sets } : {}),
              ...(reps !== undefined ? { reps } : {}),
              ...(weight !== undefined ? { weight } : {}),
              ...(isNonEmptyString(ex.type) ? { type: ex.type.trim() } : {}),
              ...(isNonEmptyString(ex.notes) ? { notes: ex.notes.trim() } : {}),
            };
          })
          .filter((x): x is NonNullable<typeof x> => x !== null);

        if (exercises.length < 1) return null;

        return {
          ...(w.id ? { id: w.id } : {}),
          title: titleTrim,
          dayOfWeek: w.dayOfWeek,
          ...(isNonEmptyString(w.notes) ? { notes: w.notes.trim() } : {}),
          exercises,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }

  function validateBeforeSubmit(workoutsPayload: ReturnType<typeof buildPayloadWorkouts>): string | null {
    if (workoutsPayload.length < 1) return "Adicione pelo menos 1 treino.";
    for (let i = 0; i < workoutsPayload.length; i++) {
      const w = workoutsPayload[i];
      if (!w.title.trim()) return `Treino ${i + 1}: informe um título.`;
      if (!w.dayOfWeek) return `Treino ${i + 1}: selecione um dia da semana.`;
      if (!w.exercises || w.exercises.length < 1) return `Treino ${i + 1}: precisa de pelo menos 1 exercício.`;
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
      if (msg) { setSaveErr(msg); setSaving(false); return; }

      const fd = new FormData();
      if (title.trim()) fd.set("title", title.trim());
      if (notes.trim()) fd.set("notes", notes.trim());
      if (documentFile) fd.set("document", documentFile);
      if (deleteDocument && !documentFile) fd.set("deleteDocument", "true");
      fd.set("workouts", JSON.stringify(workoutsPayload));

      await api.put(`/professional/clients/${userId}/training/${trainingId}`, fd);

      router.push(`/pro/clients/${userId}/training/${trainingId}`);
    } catch (error) {
      if (isAxiosError(error)) setSaveErr(error.response?.data?.message || error.response?.data?.error || error.message || "Falha ao salvar");
      else setSaveErr("Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  // ===== Early returns =====
  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadErr) {
    return (
      <div className="mx-auto w-full max-w-3xl px-3 py-6">
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {loadErr}
        </div>
        <div className="mt-4">
          <Button variant="outline" className="bg-card cursor-pointer" onClick={() => router.push(`/pro/clients/${userId}/training`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  if (notCreator) {
    return (
      <div className="mx-auto w-full max-w-3xl px-3 py-6">
        <div className="rounded-lg border border-border/30 bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Você não pode editar este treino pois não foi você quem o criou.</p>
          <div className="mt-4">
            <Button variant="outline" className="bg-card cursor-pointer" onClick={() => router.push(`/pro/clients/${userId}/training/${trainingId}`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para detalhes
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-background text-foreground overflow-x-hidden">
      <div className="mx-auto w-full max-w-3xl px-3 sm:px-4 py-5 sm:py-6 pb-28">
        {/* Top bar */}
        <div className="mb-3 sm:mb-4 flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            className="bg-card cursor-pointer"
            onClick={() => router.push(`/pro/clients/${userId}/training/${trainingId}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          <Button
            type="submit"
            form="training-edit-form"
            disabled={saving || !canSave}
            className="cursor-pointer"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>

        <form id="training-edit-form" onSubmit={onSubmit} className="grid gap-3">
          {/* Dados principais */}
          <Card className="overflow-hidden">
            <div className="bg-primary/10 px-4 sm:px-6 py-4 border-b border-border/30">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-primary" />
                Editar treino
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

              {/* Document */}
              <div className="rounded-xl bg-muted/40 p-3 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Documento (opcional)
                    </p>
                    <p className="text-xs text-muted-foreground">PDF ou imagem. Substituir enviará um novo arquivo.</p>
                  </div>

                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border/30 bg-background px-3 py-2 text-sm hover:bg-muted transition">
                    <Plus className="h-4 w-4" />
                    <span>{documentFile ? "Trocar arquivo" : existingDocumentUrl ? "Substituir" : "Selecionar arquivo"}</span>
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        setDocumentFile(f);
                        if (f) setDeleteDocument(false);
                      }}
                    />
                  </label>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  {documentFile ? (
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{documentFile.name}</p>
                      <p className="text-xs text-muted-foreground shrink-0">{formatBytes(documentFile.size)}</p>
                      <button
                        type="button"
                        onClick={() => setDocumentFile(null)}
                        className="rounded-md p-0.5 hover:bg-muted text-muted-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : existingDocumentUrl && !deleteDocument ? (
                    <div className="flex items-center gap-3">
                      <a href={existingDocumentUrl} target="_blank" rel="noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
                        Ver documento atual <ExternalLink className="h-3 w-3" />
                      </a>
                      <button
                        type="button"
                        onClick={() => setDeleteDocument(true)}
                        className="text-xs text-destructive hover:underline"
                      >
                        Remover
                      </button>
                    </div>
                  ) : deleteDocument ? (
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-destructive">Documento será removido ao salvar.</p>
                      <button type="button" onClick={() => setDeleteDocument(false)} className="text-xs text-muted-foreground hover:underline">Cancelar</button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Nenhum documento.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Workouts */}
          <div className="grid gap-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold">Treinos</h2>
              <Button type="button" variant="outline" size="sm" className="cursor-pointer" onClick={addWorkout}>
                <Plus className="mr-2 h-3.5 w-3.5" />
                Adicionar treino
              </Button>
            </div>

            {workouts.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum treino. Clique em "Adicionar treino" para começar.
                </CardContent>
              </Card>
            ) : (
              workouts.map((w, wIdx) => {
                const isOpen = !!openWorkouts[w.__key];

                return (
                  <Card key={w.__key} className="overflow-hidden">
                    <div className="relative px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 bg-card">
                      <div className="absolute left-0 top-0 h-full w-1 bg-primary/35" />
                      <div className="pl-2 flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{w.title || `Treino ${wIdx + 1}`}</p>
                        <p className="text-xs text-muted-foreground">{DOW_LABEL[w.dayOfWeek]} • {w.exercises.length} exercício{w.exercises.length !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="ghost" size="icon" className="cursor-pointer h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => requestDeleteWorkout(w.__key)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant={isOpen ? "secondary" : "outline"} className="cursor-pointer px-3" onClick={() => toggleWorkoutOpen(w.__key)}>
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <span className="ml-2 hidden sm:inline">{isOpen ? "Fechar" : "Abrir"}</span>
                        </Button>
                      </div>
                    </div>

                    {isOpen ? (
                      <CardContent className="px-3 sm:px-4 py-4 bg-muted/20">
                        <div className="grid gap-4 rounded-2xl bg-background/70 p-3 sm:p-4">
                          <div className="grid sm:grid-cols-2 gap-3">
                            <Field label="Título do treino (obrigatório)">
                              <input value={w.title} onChange={(e) => updateWorkout(w.__key, { title: e.target.value })} className={inputBase} placeholder="Ex.: Perna A" />
                            </Field>
                            <Field label="Dia da semana">
                              <select value={w.dayOfWeek} onChange={(e) => updateWorkout(w.__key, { dayOfWeek: e.target.value as DayOfWeek })} className={inputBase}>
                                {DOW_OPTIONS.map((d) => <option key={d} value={d}>{DOW_LABEL[d]}</option>)}
                              </select>
                            </Field>
                          </div>

                          <Field label="Notas do treino (opcional)">
                            <input value={w.notes} onChange={(e) => updateWorkout(w.__key, { notes: e.target.value })} className={inputBase} placeholder="Ex.: Foco em volume" />
                          </Field>

                          {/* Exercises */}
                          <div className="grid gap-3">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Exercícios</p>
                              <Button type="button" variant="outline" size="sm" className="cursor-pointer" onClick={() => addExercise(w.__key)}>
                                <Plus className="mr-1.5 h-3.5 w-3.5" />
                                Adicionar exercício
                              </Button>
                            </div>

                            {w.exercises.length === 0 ? (
                              <p className="text-sm text-muted-foreground">Nenhum exercício.</p>
                            ) : (
                              w.exercises.map((ex, exIdx) => {
                                const exOpen = !!openExercises[ex.__key];
                                const catalogItem = ex.exerciseId ? exById.get(ex.exerciseId) : null;
                                const isFirst = exIdx === 0;
                                const isLast = exIdx === w.exercises.length - 1;

                                return (
                                  <div key={ex.__key} className="relative overflow-hidden rounded-2xl bg-card border border-border/20 shadow-sm">
                                    <div className="absolute left-0 top-0 h-full w-1.5 bg-primary/60" />

                                    <div className="p-3 pl-4">
                                      <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-semibold truncate">{ex.name || catalogItem?.name || `Exercício ${exIdx + 1}`}</p>
                                          {ex.exerciseId && catalogItem ? (
                                            <p className="text-xs text-muted-foreground truncate">{catalogItem.muscleGroup ?? catalogItem.type ?? "Catálogo"}</p>
                                          ) : null}
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 cursor-pointer" disabled={isFirst} onClick={() => moveExercise(w.__key, ex.__key, "up")}>
                                            <ChevronUp className="h-3.5 w-3.5" />
                                          </Button>
                                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 cursor-pointer" disabled={isLast} onClick={() => moveExercise(w.__key, ex.__key, "down")}>
                                            <ChevronDown className="h-3.5 w-3.5" />
                                          </Button>
                                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeExercise(w.__key, ex.__key)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                          <Button type="button" variant={exOpen ? "secondary" : "outline"} size="sm" className="cursor-pointer px-2" onClick={() => toggleExerciseOpen(ex.__key)}>
                                            {exOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                          </Button>
                                        </div>
                                      </div>

                                      {exOpen ? (
                                        <div className="mt-3 grid gap-3">
                                          {/* Catalog selector */}
                                          <div className="flex flex-wrap items-center gap-2">
                                            <Button type="button" variant="outline" size="sm" className="cursor-pointer gap-1.5" onClick={() => openCatalogModal(w.__key, ex.__key)}>
                                              <Search className="h-3.5 w-3.5" />
                                              {ex.exerciseId && catalogItem ? catalogItem.name : "Buscar no catálogo"}
                                            </Button>
                                            {ex.exerciseId ? (
                                              <Button type="button" variant="ghost" size="sm" className="cursor-pointer gap-1 text-muted-foreground" onClick={() => selectCatalogExercise(w.__key, ex.__key, null)}>
                                                <X className="h-3.5 w-3.5" /> Remover
                                              </Button>
                                            ) : null}
                                          </div>

                                          <div className="grid sm:grid-cols-2 gap-3">
                                            <Field label="Nome do exercício">
                                              <input value={ex.name} onChange={(e) => updateExercise(w.__key, ex.__key, { name: e.target.value })} className={inputBase} placeholder={catalogItem?.name ?? "Ex.: Agachamento"} />
                                            </Field>
                                            <Field label="Tipo">
                                              <input value={ex.type} onChange={(e) => updateExercise(w.__key, ex.__key, { type: e.target.value })} className={inputBase} placeholder="Ex.: Composto" />
                                            </Field>
                                          </div>

                                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <Field label="Séries">
                                              <input type="number" min="0" value={ex.sets} onChange={(e) => updateExercise(w.__key, ex.__key, { sets: e.target.value })} className={inputBase} placeholder="4" />
                                            </Field>
                                            <Field label="Reps">
                                              <input type="number" min="1" value={ex.reps} onChange={(e) => updateExercise(w.__key, ex.__key, { reps: e.target.value })} className={inputBase} placeholder="12" />
                                            </Field>
                                            <Field label="Peso (kg)">
                                              <input type="number" min="0" step="0.5" value={ex.weight} onChange={(e) => updateExercise(w.__key, ex.__key, { weight: e.target.value })} className={inputBase} placeholder="60" />
                                            </Field>
                                            <Field label="Descanso (s)">
                                              <input type="number" min="0" value={ex.restTime} onChange={(e) => updateExercise(w.__key, ex.__key, { restTime: e.target.value })} className={inputBase} placeholder="90" />
                                            </Field>
                                          </div>

                                          <Field label="Técnica (opcional)">
                                            <input value={ex.technique} onChange={(e) => updateExercise(w.__key, ex.__key, { technique: e.target.value })} className={inputBase} placeholder="Ex.: Drop-set" />
                                          </Field>

                                          <Field label="Notas do exercício (opcional)">
                                            <textarea value={ex.notes} onChange={(e) => updateExercise(w.__key, ex.__key, { notes: e.target.value })} className={`${inputBase} min-h-16`} />
                                          </Field>
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </CardContent>
                    ) : null}
                  </Card>
                );
              })
            )}
          </div>
        </form>
      </div>

      {/* Confirm delete workout */}
      <AlertDialog open={deleteWorkoutOpen} onOpenChange={(open) => setDeleteWorkoutOpen(open)}>
        <AlertDialogContent className="w-[calc(100svw-2rem)] max-w-[480px] p-4 sm:p-6 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover treino</AlertDialogTitle>
            <AlertDialogDescription>
              Remover <strong>{deleteWorkoutLabel}</strong>? Os exercícios deste dia também serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer" onClick={() => { setDeleteWorkoutOpen(false); setDeleteWorkoutKey(null); }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDeleteWorkout(); }} className="bg-destructive text-destructive-foreground hover:opacity-90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Catalog Modal */}
      {catalogModalOpen && catalogModalTarget ? (
        <Modal onClose={closeCatalogModal}>
          <div className="w-full max-w-lg rounded-2xl bg-background p-4 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h3 className="text-sm font-semibold">Catálogo de exercícios</h3>
              <Button type="button" variant="ghost" size="icon" className="cursor-pointer" onClick={closeCatalogModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                className={`${inputBase} pl-9`}
                placeholder="Buscar exercício..."
                value={catalogModalQuery}
                onChange={(e) => setCatalogModalQuery(e.target.value)}
                autoFocus
              />
            </div>

            {exErr ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive mb-3">{exErr}</div>
            ) : null}

            <div className="max-h-72 overflow-y-auto grid gap-1 pr-1">
              {filteredCatalogModal.length === 0 && !exLoading ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum exercício encontrado.</p>
              ) : (
                filteredCatalogModal.map((item) => {
                  const isSelected = selectedExerciseIdInModal === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`w-full text-left rounded-xl px-3 py-2.5 text-sm transition ${isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                      onClick={() => {
                        if (catalogModalTarget) selectCatalogExercise(catalogModalTarget.workoutKey, catalogModalTarget.exKey, item.id);
                        closeCatalogModal();
                      }}
                    >
                      <p className="font-medium">{item.name}</p>
                      {item.muscleGroup || item.type ? (
                        <p className={`text-xs mt-0.5 ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {[item.muscleGroup, item.type].filter(Boolean).join(" • ")}
                        </p>
                      ) : null}
                    </button>
                  );
                })
              )}

              {exLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : exHasMore ? (
                <Button type="button" variant="ghost" className="cursor-pointer w-full mt-1" onClick={() => fetchExercises(exPage + 1)}>
                  Carregar mais
                </Button>
              ) : null}
            </div>

            {selectedExerciseIdInModal ? (
              <div className="mt-4 pt-4 border-t border-border/30 flex justify-between items-center">
                <p className="text-xs text-muted-foreground">Selecionado: <strong>{exById.get(selectedExerciseIdInModal)?.name}</strong></p>
                {(() => {
                  const item = exById.get(selectedExerciseIdInModal);
                  if (!item?.videoUrl) return null;
                  const embedUrl = toEmbedUrl(item.videoUrl);
                  return (
                    <Button type="button" variant="outline" size="sm" className="cursor-pointer gap-1.5" onClick={() => {
                      setVideoModal({ url: item.videoUrl!, embedUrl, title: item.name });
                      setVideoModalOpen(true);
                    }}>
                      <PlayCircle className="h-3.5 w-3.5" /> Vídeo
                    </Button>
                  );
                })()}
              </div>
            ) : null}
          </div>
        </Modal>
      ) : null}

      {/* Video modal */}
      <AlertDialog open={videoModalOpen} onOpenChange={setVideoModalOpen}>
        <AlertDialogContent className="w-[calc(100svw-2rem)] max-w-[820px] p-4 sm:p-6 rounded-2xl sm:rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{videoModal?.title ?? "Vídeo"}</AlertDialogTitle>
            <AlertDialogDescription>
              {videoModal?.embedUrl ? "Assista ao vídeo abaixo." : "Este link não suporta preview. Use o botão para abrir."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-3">
            {videoModal?.embedUrl ? (
              <div className="aspect-video w-full overflow-hidden rounded-xl bg-black/10">
                <iframe className="h-full w-full" src={videoModal.embedUrl} title={videoModal.title} loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
              </div>
            ) : (
              <div className="rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">Preview não disponível.</div>
            )}
            {videoModal?.url ? (
              <div className="mt-3">
                <Button asChild variant="outline" className="w-full sm:w-auto bg-card cursor-pointer">
                  <a href={videoModal.url} target="_blank" rel="noreferrer">Abrir no link <ExternalLink className="ml-2 h-4 w-4" /></a>
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
