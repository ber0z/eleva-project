"use client";

import { useEffect, useMemo, useState, type ReactNode, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";

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
  Save,
  Search,
  PlayCircle,
  X,
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

// ✅ use seu alias se tiver (recomendado)
// import Modal from "@/components/ui/Modal";
import Modal from "../../../../../../../../components/ui/Modal";

type ExerciseCatalogItem = {
  id: number;
  name: string;
  type?: string | null;
  videoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

type TrainingApiExercise = {
  id: number;
  idWorkout: number;
  exerciseId: number | null;
  name: string;
  technique: string | null;
  restTime: number | null; // ✅ (segundos)
  sets: number | null;
  reps: number | null;
  weight: number | null;
  type: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type TrainingApiWorkout = {
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
  exercises: TrainingApiExercise[];
};

type TrainingDetails = {
  id: number;
  idUser: number;
  title: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  idProfessional: number | null;
  workouts: TrainingApiWorkout[];
  documentUrl?: string | null;
  documentUrlExpiresAt?: string | null;
};

type ExercisesResponse = {
  items: ExerciseCatalogItem[];
  total: number;
  page: number;
  pageSize: number;
};

type UiExercise = {
  __key: string;
  id?: number;
  exerciseId: number | null;
  name: string;
  technique: string;
  restTime: string; // ✅ input em segundos
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
  dayOfWeek: TrainingApiWorkout["dayOfWeek"];
  notes: string;
  exercises: UiExercise[];
};

const DOW_LABEL: Record<TrainingApiWorkout["dayOfWeek"], string> = {
  monday: "Segunda",
  tuesday: "Terça",
  wednesday: "Quarta",
  thursday: "Quinta",
  friday: "Sexta",
  saturday: "Sábado",
  sunday: "Domingo",
};

const DOW_ORDER: Record<TrainingApiWorkout["dayOfWeek"], number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7,
};

function uid(prefix = "k") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1 min-w-0">
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

const inputBase =
  "w-full max-w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40";

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

const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

const toIntOrUndef = (v: string): number | undefined => {
  const s = (v ?? "").trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isInteger(n) && Number.isFinite(n) ? n : undefined;
};

const toNumOrUndef = (v: string): number | undefined => {
  const s = (v ?? "").trim();
  if (!s) return undefined;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
};

/** ===== Payload types (REMOVE any) ===== */
type TrainingExerciseUpdatePayload = {
  id?: number;
  exerciseId?: number;
  name?: string;
  technique?: string;
  restTime?: number; // ✅ (segundos)
  sets?: number;
  reps?: number;
  weight?: number;
  type?: string;
  notes?: string;
};

type TrainingWorkoutUpdatePayload = {
  id?: number;
  title: string;
  dayOfWeek: TrainingApiWorkout["dayOfWeek"];
  notes?: string;
  exercises: TrainingExerciseUpdatePayload[];
};

/** remove undefined e null recursivamente (sem any) */
function stripNil<T>(value: T): T {
  if (Array.isArray(value)) {
    const cleaned = value.map(stripNil).filter((x) => x !== undefined && x !== null);
    return cleaned as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const cleaned = stripNil(v);
      if (cleaned !== undefined && cleaned !== null) out[k] = cleaned;
    }
    return out as unknown as T;
  }
  return value;
}

/** ✅ segundos -> m:ss */
function formatSecondsToMinSec(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "—";
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function TrainingEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const trainingId = Number(params?.id);

  // load
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<TrainingDetails | null>(null);

  // main fields
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  // doc
  const [deleteDocument, setDeleteDocument] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  // workouts + toggles
  const [workouts, setWorkouts] = useState<UiWorkout[]>([]);
  const [openWorkouts, setOpenWorkouts] = useState<Record<string, boolean>>({});
  const [openExercises, setOpenExercises] = useState<Record<string, boolean>>({});

  // confirmação: remover workout
  const [deleteWorkoutOpen, setDeleteWorkoutOpen] = useState(false);
  const [deleteWorkoutKey, setDeleteWorkoutKey] = useState<string | null>(null);

  const deleteWorkoutLabel = useMemo(() => {
    if (!deleteWorkoutKey) return null;
    const w = workouts.find((x) => x.__key === deleteWorkoutKey);
    if (!w) return null;
    return w.title?.trim() ? w.title : "Treino sem título";
  }, [deleteWorkoutKey, workouts]);

  // exercises catalog
  const [exCatalog, setExCatalog] = useState<ExerciseCatalogItem[]>([]);
  const [exPage, setExPage] = useState(1);
  const [exTotal, setExTotal] = useState<number | null>(null);
  const [exLoading, setExLoading] = useState(false);
  const [exErr, setExErr] = useState<string | null>(null);

  // ✅ modal catálogo (global) - substitui o dropdown absolute que estava cortando
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

  // vídeo modal
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoModal, setVideoModal] = useState<{
    url: string;
    embedUrl: string | null;
    title: string;
  } | null>(null);

  function openVideoModal(url: string, title2: string) {
    setVideoModal({ url, embedUrl: toEmbedUrl(url), title: title2 });
    setVideoModalOpen(true);
  }

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

  async function fetchExercises(targetPage: number, reset = false) {
    setExLoading(true);
    setExErr(null);
    try {
      const { data: resp } = await api.get<ExercisesResponse>("/exercise", {
        params: { page: targetPage, pageSize: EX_PAGE_SIZE },
      });

      setExPage(resp.page);
      setExTotal(resp.total);

      setExCatalog((prev) => {
        const merged = reset ? resp.items : [...prev, ...resp.items];
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

      setTitle(res.data.title ?? "");
      setNotes(res.data.notes ?? "");
      setDeleteDocument(false);
      setDocumentFile(null);

      const mapped: UiWorkout[] = (res.data.workouts ?? [])
        .slice()
        .sort((a, b) => (DOW_ORDER[a.dayOfWeek] ?? 99) - (DOW_ORDER[b.dayOfWeek] ?? 99))
        .map((w) => ({
          __key: uid("w"),
          id: w.id,
          title: w.title ?? "",
          dayOfWeek: w.dayOfWeek,
          notes: w.notes ?? "",
          exercises: (w.exercises ?? []).map((ex) => ({
            __key: uid("ex"),
            id: ex.id,
            exerciseId: ex.exerciseId ?? null,
            name: ex.name ?? "",
            technique: ex.technique ?? "",
            restTime: ex.restTime != null ? String(ex.restTime) : "",
            sets: ex.sets != null ? String(ex.sets) : "",
            reps: ex.reps != null ? String(ex.reps) : "",
            weight: ex.weight != null ? String(ex.weight) : "",
            type: ex.type ?? "",
            notes: ex.notes ?? "",
          })),
        }));

      setWorkouts(mapped);

      setOpenWorkouts(() => Object.fromEntries(mapped.map((w) => [w.__key, false])));

      setOpenExercises(() => {
        const entries: Array<[string, boolean]> = [];
        for (const w of mapped) for (const ex of w.exercises) entries.push([ex.__key, false]);
        return Object.fromEntries(entries);
      });
    } catch (e) {
      if (isAxiosError(e)) setErr(e.response?.data?.message || e.message || "Falha ao carregar treino");
      else setErr("Falha ao carregar treino");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDetails();
    void fetchExercises(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainingId]);

  function toggleWorkoutOpen(key: string) {
    setOpenWorkouts((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleExerciseOpen(exKey: string) {
    setOpenExercises((prev) => ({ ...prev, [exKey]: !prev[exKey] }));
  }

  function addWorkout() {
    const w: UiWorkout = { __key: uid("w"), title: "", dayOfWeek: "monday", notes: "", exercises: [] };
    setWorkouts((prev) => [w, ...prev]);
    setOpenWorkouts((prev) => ({ ...prev, [w.__key]: true }));
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

    // se o modal estava aberto para um exercício desse workout, fecha
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

  function updateWorkout(workoutKey: string, patch: Partial<UiWorkout>) {
    setWorkouts((prev) => prev.map((w) => (w.__key === workoutKey ? { ...w, ...patch } : w)));
  }

  function addExercise(workoutKey: string) {
    const ex: UiExercise = {
      __key: uid("ex"),
      exerciseId: null,
      name: "",
      technique: "",
      restTime: "",
      sets: "",
      reps: "",
      weight: "",
      type: "",
      notes: "",
    };

    setWorkouts((prev) => prev.map((w) => (w.__key === workoutKey ? { ...w, exercises: [ex, ...w.exercises] } : w)));

    setOpenExercises((prev) => ({ ...prev, [ex.__key]: true }));
    setOpenWorkouts((prev) => ({ ...prev, [workoutKey]: true }));

    // abre o modal do catálogo (não corta e tem scroll)
    // openCatalogModal(workoutKey, ex.__key);
  }

  function removeExercise(workoutKey: string, exKey: string) {
    setWorkouts((prev) =>
      prev.map((w) => (w.__key === workoutKey ? { ...w, exercises: w.exercises.filter((ex) => ex.__key !== exKey) } : w))
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
      // ✅ volta para personalizado (não apaga o nome digitado)
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

  // submit
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  function buildPayloadWorkouts(): TrainingWorkoutUpdatePayload[] {
    const payload: TrainingWorkoutUpdatePayload[] = workouts.map((w) => {
      const wk: TrainingWorkoutUpdatePayload = {
        ...(typeof w.id === "number" ? { id: w.id } : {}),
        title: (w.title ?? "").trim(),
        dayOfWeek: w.dayOfWeek,
        ...(isNonEmptyString(w.notes) ? { notes: w.notes.trim() } : {}),
        exercises: (w.exercises ?? []).map((ex) => {
          const exOut: TrainingExerciseUpdatePayload = {};

          if (typeof ex.id === "number") exOut.id = ex.id;

          if (typeof ex.exerciseId === "number") exOut.exerciseId = ex.exerciseId;
          if (isNonEmptyString(ex.name)) exOut.name = ex.name.trim();

          if (isNonEmptyString(ex.technique)) exOut.technique = ex.technique.trim();

          const restTime = toIntOrUndef(ex.restTime);
          if (restTime !== undefined) exOut.restTime = restTime;

          const sets = toIntOrUndef(ex.sets);
          if (sets !== undefined) exOut.sets = sets;

          const reps = toIntOrUndef(ex.reps);
          if (reps !== undefined) exOut.reps = reps;

          const weight = toNumOrUndef(ex.weight);
          if (weight !== undefined) exOut.weight = weight;

          if (isNonEmptyString(ex.type)) exOut.type = ex.type.trim();
          if (isNonEmptyString(ex.notes)) exOut.notes = ex.notes.trim();

          return exOut;
        }),
      };

      return wk;
    });

    return stripNil(payload);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!data?.id) return;

    setSaving(true);
    setSaveErr(null);

    try {
      const workoutPayload = buildPayloadWorkouts();

      const fd = new FormData();
      fd.set("title", title);
      fd.set("notes", notes);
      fd.set("deleteDocument", String(!!deleteDocument));

      if (documentFile) {
        fd.set("document", documentFile);
      }

      fd.set("workouts", JSON.stringify(workoutPayload));

      await api.put(`/training/${data.id}`, fd);
      router.push(`/app/activities/workouts/${data.id}`);
    } catch (error) {
      if (isAxiosError(error)) setSaveErr(error.response?.data?.message || error.message || "Falha ao salvar");
      else setSaveErr("Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  const canSave = useMemo(() => !!title.trim(), [title]);

  return (
    <div className="min-h-svh bg-background text-foreground overflow-x-hidden">
      <div className="mx-auto w-full max-w-3xl px-3 sm:px-4 py-5 sm:py-6 pb-28">
        {/* Top bar */}
        <div className="mb-3 sm:mb-4 flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            className="bg-card cursor-pointer"
            onClick={() => router.push(`/app/activities/workouts/${trainingId}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          <Button type="submit" form="training-edit-form" disabled={saving || !canSave || loading}>
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
                <Skeleton className="h-16 w-full rounded-xl" />
              </CardContent>
            </Card>
          </div>
        ) : err ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {err}
            <div className="mt-2">
              <Button size="sm" variant="outline" onClick={fetchDetails}>
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
            <CardContent className="text-sm text-muted-foreground">Não foi possível carregar os dados.</CardContent>
          </Card>
        ) : (
          <form id="training-edit-form" onSubmit={onSubmit} className="grid gap-3">
            {/* Dados principais */}
            <Card className="overflow-hidden">
              <div className="bg-primary/10 px-4 sm:px-6 py-4 border-b border-border/60">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-primary" />
                 Editando ficha de treino
                </h2>
              </div>

              <CardContent className="grid gap-4 pt-5 px-4 sm:px-6">
                {saveErr ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {saveErr}
                  </div>
                ) : null}

                <div className="grid gap-3">
                  <Field label="Título">
                    <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputBase} />
                  </Field>

                  <Field label="Notas">
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputBase} min-h-24`} />
                  </Field>
                </div>

                {/* Documento (sem preview) */}
                <div className="rounded-xl bg-muted/40 p-3 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Documento
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {data.documentUrl ? "Existe um documento anexado." : "Nenhum documento anexado."}
                      </p>
                    </div>

                    {data.documentUrl ? (
                      <Button asChild variant="outline" className="bg-background cursor-pointer">
                        <a href={data.documentUrl} target="_blank" rel="noreferrer">
                          Abrir <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                    ) : null}
                  </div>

                  <div className="mt-3 grid gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Enviar novo arquivo (opcional)</p>
                        <p className="text-[11px] text-muted-foreground">Aceita PDF e imagens.</p>
                      </div>

                      <label
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm bg-background hover:bg-accent ${
                          deleteDocument ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        <Plus className="h-4 w-4" />
                        <span>{documentFile ? "Trocar" : "Selecionar"}</span>
                        <input
                          type="file"
                          accept="application/pdf,image/*"
                          disabled={deleteDocument}
                          className="sr-only"
                          onChange={(e) => {
                            const f = e.target.files?.[0] ?? null;
                            setDocumentFile(f);
                            if (f) setDeleteDocument(false);
                          }}
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        {documentFile ? (
                          <>
                            Selecionado: <span className="font-medium">{documentFile.name}</span>{" "}
                            <span className="text-muted-foreground/70">• {formatBytes(documentFile.size)}</span>
                          </>
                        ) : (
                          "Nenhum arquivo selecionado."
                        )}
                      </p>

                      <div className="flex items-center gap-2">
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

                        {data.documentUrl ? (
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={deleteDocument}
                              onChange={(e) => {
                                setDeleteDocument(e.target.checked);
                                if (e.target.checked) setDocumentFile(null);
                              }}
                            />
                            Remover documento atual
                          </label>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ===== Workouts ===== */}
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <div>
                  <h2 className="text-sm font-semibold">Treinos</h2>
                  <p className="text-xs text-muted-foreground">{workouts.length} no total</p>
                </div>

                <Button type="button" variant="outline" className="bg-card cursor-pointer" onClick={addWorkout}>
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Adicionar</span>
                  <span className="sm:hidden">Novo</span>
                </Button>
              </div>

              {workouts.length === 0 ? (
                <Card>
                  <CardContent className="py-6 text-sm text-muted-foreground">Adicione pelo menos um treino.</CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {workouts.map((w, idx) => {
                    const open = !!openWorkouts[w.__key];
                    const exCount = w.exercises.length;

                    const headerTitle = w.title?.trim() ? w.title : `Treino ${idx + 1}`;
                    const headerMeta = compactLine([
                      DOW_LABEL[w.dayOfWeek],
                      exCount ? `${exCount} ${exCount === 1 ? "exercício" : "exercícios"}` : "sem exercícios",
                    ]);

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
                              variant="secondary"
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
                                <Field label="Título do treino">
                                  <input
                                    value={w.title}
                                    onChange={(e) => updateWorkout(w.__key, { title: e.target.value })}
                                    className={inputBase}
                                    placeholder="Ex.: A - Peito/Tríceps"
                                  />
                                </Field>

                                <Field label="Dia da semana">
                                  <select
                                    value={w.dayOfWeek}
                                    onChange={(e) => updateWorkout(w.__key, { dayOfWeek: e.target.value as UiWorkout["dayOfWeek"] })}
                                    className={inputBase}
                                  >
                                    {Object.keys(DOW_LABEL).map((k) => (
                                      <option key={k} value={k}>
                                        {DOW_LABEL[k as UiWorkout["dayOfWeek"]]}
                                      </option>
                                    ))}
                                  </select>
                                </Field>
                              </div>

                              <div className="mt-3">
                                <Field label="Notas do treino">
                                  <input
                                    value={w.notes}
                                    onChange={(e) => updateWorkout(w.__key, { notes: e.target.value })}
                                    className={inputBase}
                                    placeholder="Opcional"
                                  />
                                </Field>
                              </div>

                              {/* Exercícios */}
                              <div className="mt-5 rounded-2xl bg-background/70 p-3 sm:p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold">
                                      Exercícios{" "}
                                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                                        {w.exercises.length}
                                      </span>
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

                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
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
                                  <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-300">
                                    {exErr}
                                  </div>
                                ) : null}

                                {w.exercises.length === 0 ? (
                                  <p className="mt-3 text-sm text-muted-foreground">Sem exercícios ainda.</p>
                                ) : (
                                  <div className="mt-3 grid gap-3">
                                    {w.exercises.map((ex, exIdx) => {
                                      const exOpen = !!openExercises[ex.__key];
                                      const isCustom = ex.exerciseId == null;

                                      const selectedCatalog = ex.exerciseId ? exById.get(ex.exerciseId) : null;
                                      const videoUrl = selectedCatalog?.videoUrl ?? null;
                                      const embedUrl = videoUrl ? toEmbedUrl(videoUrl) : null;

                                      const exTitle =
                                        ex.name?.trim() ||
                                        selectedCatalog?.name ||
                                        (isCustom ? `Exercício ${exIdx + 1}` : `Exercício #${ex.exerciseId}`);

                                      const restSeconds = toIntOrUndef(ex.restTime);
                                      const restLabel = restSeconds !== undefined ? formatSecondsToMinSec(restSeconds) : null;

                                      const exMeta = compactLine([
                                        ex.sets?.trim() && ex.reps?.trim() ? `${ex.sets}×${ex.reps}` : null,
                                        restLabel ? `desc ${restLabel}` : null,
                                        ex.weight?.trim() ? `${ex.weight}kg` : null,
                                        ex.type?.trim() ? ex.type : null,
                                      ]);

                                      const selectedLabel =
                                        ex.exerciseId && selectedCatalog?.name
                                          ? selectedCatalog.name
                                          : ex.exerciseId
                                          ? `Catálogo #${ex.exerciseId}`
                                          : "Personalizado";

                                      return (
                                        <div key={ex.__key} className="relative overflow-hidden rounded-2xl bg-card shadow-sm">
                                          <div className="absolute left-0 top-0 h-full w-1.5 bg-primary/70" />

                                          <div className="p-3 sm:p-4 pl-4 sm:pl-5">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                              <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold truncate">{exTitle}</p>
                                                <p className="text-xs text-muted-foreground truncate">{exMeta || "—"}</p>
                                              </div>

                                              <div className="flex flex-wrap items-center justify-end gap-2">
                                                <Button
                                                  type="button"
                                                  variant={exOpen ? "secondary" : "outline"}
                                                  className="cursor-pointer px-3"
                                                  onClick={() => toggleExerciseOpen(ex.__key)}
                                                >
                                                  {exOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                  <span className="ml-2 hidden sm:inline">{exOpen ? "Fechar" : "Exibir"}</span>
                                                </Button>

                                                <Button
                                                  type="button"
                                                  variant="outline"
                                                  className="cursor-pointer border-destructive/40 text-destructive hover:text-destructive px-3"
                                                  onClick={() => removeExercise(w.__key, ex.__key)}
                                                  title="Remover exercício"
                                                >
                                                  <Trash2 className="h-4 w-4" />
                                                  <span className="ml-2 hidden sm:inline">Remover</span>
                                                </Button>
                                              </div>
                                            </div>

                                            {exOpen ? (
                                              <div className="mt-4 rounded-xl bg-muted/40 p-3 sm:p-4">
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                  <div className="min-w-0">
                                                    <label className="text-xs text-muted-foreground">Exercício do catálogo (opcional)</label>

                                                    <div className="relative mt-1">
                                                      {/* ✅ abre o MODAL (sem corte e com scroll) */}
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

                                                  <Field label="Nome (obrigatório se personalizado)">
                                                    <input
                                                      value={ex.name}
                                                      onChange={(e) => updateExercise(w.__key, ex.__key, { name: e.target.value })}
                                                      className={inputBase}
                                                      placeholder="Ex.: Crucifixo máquina"
                                                    />
                                                  </Field>
                                                </div>

                                                {/* Vídeo */}
                                                {videoUrl ? (
                                                  <>
                                                    <div className="mt-3 sm:hidden">
                                                      <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="w-full bg-card cursor-pointer"
                                                        onClick={() =>
                                                          openVideoModal(
                                                            videoUrl,
                                                            selectedCatalog?.name ?? ex.name?.trim() ?? "Vídeo do exercício"
                                                          )
                                                        }
                                                      >
                                                        <PlayCircle className="mr-2 h-4 w-4" />
                                                        Ver Vídeo
                                                      </Button>
                                                    </div>

                                                    <div className="mt-3 hidden sm:block rounded-xl bg-muted/30 p-3 overflow-hidden">
                                                      <div className="flex items-center justify-between gap-2">
                                                        <p className="text-sm font-semibold flex items-center gap-2">
                                                          <PlayCircle className="h-4 w-4 text-primary" />
                                                          Vídeo
                                                        </p>

                                                        <Button asChild variant="outline" className="bg-background cursor-pointer">
                                                          <a href={videoUrl} target="_blank" rel="noreferrer">
                                                            Abrir <ExternalLink className="ml-2 h-4 w-4" />
                                                          </a>
                                                        </Button>
                                                      </div>

                                                      {embedUrl ? (
                                                        <div className="mt-3 aspect-video w-full overflow-hidden rounded-lg bg-black/10">
                                                          <iframe
                                                            className="h-full w-full"
                                                            src={embedUrl}
                                                            title={`Vídeo - ${selectedCatalog?.name ?? "Exercício"}`}
                                                            loading="lazy"
                                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                            referrerPolicy="strict-origin-when-cross-origin"
                                                            allowFullScreen
                                                          />
                                                        </div>
                                                      ) : (
                                                        <p className="mt-2 text-xs text-muted-foreground">
                                                          Preview não disponível para esse link. Use “Abrir” para assistir.
                                                        </p>
                                                      )}
                                                    </div>
                                                  </>
                                                ) : null}

                                                {/* Campos */}
                                                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                                                  <Field label="Séries">
                                                    <input
                                                      inputMode="numeric"
                                                      value={ex.sets}
                                                      onChange={(e) => updateExercise(w.__key, ex.__key, { sets: e.target.value })}
                                                      className={inputBase}
                                                      placeholder="4"
                                                    />
                                                  </Field>

                                                  <Field label="Reps">
                                                    <input
                                                      inputMode="numeric"
                                                      value={ex.reps}
                                                      onChange={(e) => updateExercise(w.__key, ex.__key, { reps: e.target.value })}
                                                      className={inputBase}
                                                      placeholder="12"
                                                    />
                                                  </Field>

                                                  <Field label="Descanso (seg)">
                                                    <input
                                                      inputMode="numeric"
                                                      value={ex.restTime}
                                                      onChange={(e) => updateExercise(w.__key, ex.__key, { restTime: e.target.value })}
                                                      className={inputBase}
                                                      placeholder="80"
                                                    />
                                                    {ex.restTime?.trim()
                                                      ? (() => {
                                                          const secs = toIntOrUndef(ex.restTime);
                                                          return secs === undefined ? (
                                                            <p className="mt-1 text-[11px] text-destructive">Informe um inteiro (segundos).</p>
                                                          ) : (
                                                            <p className="mt-1 text-[11px] text-muted-foreground">
                                                              Equivale a <b>{formatSecondsToMinSec(secs)}</b>
                                                            </p>
                                                          );
                                                        })()
                                                      : null}
                                                  </Field>

                                                  <Field label="Carga (kg)">
                                                    <input
                                                      inputMode="decimal"
                                                      value={ex.weight}
                                                      onChange={(e) => updateExercise(w.__key, ex.__key, { weight: e.target.value })}
                                                      className={inputBase}
                                                      placeholder="40"
                                                    />
                                                  </Field>

                                                  <Field label="Tipo">
                                                    <input
                                                      value={ex.type}
                                                      onChange={(e) => updateExercise(w.__key, ex.__key, { type: e.target.value })}
                                                      className={inputBase}
                                                      placeholder="isolado"
                                                    />
                                                  </Field>
                                                </div>

                                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                                  <Field label="Técnica">
                                                    <input
                                                      value={ex.technique}
                                                      onChange={(e) => updateExercise(w.__key, ex.__key, { technique: e.target.value })}
                                                      className={inputBase}
                                                      placeholder="cadência 3-1-3"
                                                    />
                                                  </Field>

                                                  <Field label="Notas">
                                                    <input
                                                      value={ex.notes}
                                                      onChange={(e) => updateExercise(w.__key, ex.__key, { notes: e.target.value })}
                                                      className={inputBase}
                                                      placeholder="Opcional"
                                                    />
                                                  </Field>
                                                </div>
                                              </div>
                                            ) : null}
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
        )}
      </div>

      {/* ✅ Modal do Catálogo (Portal + scroll) */}
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
              className="w-full rounded-xl border border-border px-3 py-2 text-left text-sm hover:bg-muted/50"
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
              <div className="rounded-xl border border-border p-3 text-sm text-muted-foreground">
                Nenhum exercício encontrado.
              </div>
            ) : (
              filteredCatalogModal.map((it) => {
                const active = selectedExerciseIdInModal === it.id;
                return (
                  <button
                    key={it.id}
                    type="button"
                    className={`
                      w-full rounded-xl border px-3 py-2 text-left hover:bg-muted/50 transition
                      ${active ? "border-primary/40 bg-primary/10" : "border-border"}
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
                    {it.videoUrl ? <div className="mt-1 text-xs text-muted-foreground">Tem vídeo</div> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      {/* Modal confirmação: remover treino */}
      <AlertDialog open={deleteWorkoutOpen} onOpenChange={(open) => setDeleteWorkoutOpen(open)}>
        <AlertDialogContent className="w-[calc(100svw-2rem)] max-w-[560px] p-4 sm:p-6 rounded-2xl sm:rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover treino</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteWorkoutLabel ? (
                <>
                  Você tem certeza que deseja remover <strong>{deleteWorkoutLabel}</strong>?
                  <br />
                  Esse treino será excluído ao salvar.
                </>
              ) : (
                "Você tem certeza que deseja remover este treino? Ele será excluído ao salvar."
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
