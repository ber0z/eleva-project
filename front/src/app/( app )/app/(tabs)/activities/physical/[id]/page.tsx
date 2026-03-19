"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";
import { ArrowLeft, Check, Dumbbell, Pencil, Save, Trash2, Loader2, X } from "lucide-react";

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

type ActivityType =
  | "strength"
  | "cardio"
  | "sports"
  | "mobility"
  | "yoga_pilates"
  | "recovery"
  | "other";

const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: "strength", label: "Força / Musculação" },
  { value: "cardio", label: "Cardio" },
  { value: "sports", label: "Esportes" },
  { value: "mobility", label: "Mobilidade / Alongamento" },
  { value: "yoga_pilates", label: "Yoga / Pilates" },
  { value: "recovery", label: "Recuperação" },
  { value: "other", label: "Outro" },
];

function typeLabel(t: ActivityType | string) {
  const found = ACTIVITY_TYPES.find((x) => x.value === t);
  return found ? found.label : String(t);
}

type ExerciseLogEntry = {
  id: number;
  trainingExerciseId: number | null;
  name: string;
  setNumber: number;
  reps: number | null;
  weight: number | null;
  completed: boolean;
};

type ExerciseGroup = {
  name: string;
  sets: ExerciseLogEntry[];
};

function groupExerciseLogs(logs: ExerciseLogEntry[]): ExerciseGroup[] {
  const map = new Map<string, ExerciseLogEntry[]>();
  for (const log of logs) {
    const list = map.get(log.name) ?? [];
    list.push(log);
    map.set(log.name, list);
  }
  return Array.from(map.entries()).map(([name, sets]) => ({ name, sets }));
}

type PhysicalActivity = {
  id: number;
  idUser: number;
  name: string;
  type: ActivityType; // agora enum
  duration: number;
  calories: number | null;
  observations?: string | null;
  date: string; // ISO (pode ter hora)
  createdAt: string;
  updatedAt: string;
  exerciseLogs?: ExerciseLogEntry[];
};

type ActivityBody = {
  name: string;
  type: ActivityType;
  duration: number;
  calories: number | null;
  observations?: string | null;
  date: string; // YYYY-MM-DD ou ISO com hora
};

function fmtDateShort(iso?: string) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "UTC",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function fmtTimeShort(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  // Se for "T00:00:00.000Z" (data sem hora), não mostra hora
  const hasMeaningfulTime = !(d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0);
  if (!hasMeaningfulTime) return "—";

  try {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "UTC",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "—";
  }
}

function isoToYMD(iso: string) {
  return iso.slice(0, 10);
}

function isoToHM(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  // se for 00:00, consideramos "sem hora"
  if (hh === "00" && mm === "00") return "";
  return `${hh}:${mm}`;
}

function combineDateTime(dateYmd: string, timeHm?: string) {
  if (!timeHm?.trim()) return dateYmd; // mantém compatível com seu backend
  return `${dateYmd}T${timeHm}:00.000Z`; // UTC pra evitar drift de timezone
}

function fmtDuration(mins?: number | null) {
  if (typeof mins !== "number" || !Number.isFinite(mins)) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m} min`;
}

export default function PhysicalActivityDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const activityId = Number(id);

  const [item, setItem] = useState<PhysicalActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<(ActivityBody & { time?: string }) | null>(null); // time opcional no form
  const [saving, setSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  const title = useMemo(() => (item ? item.name : "Atividade"), [item]);

  async function load() {
    if (!Number.isFinite(activityId)) {
      setErr("ID inválido.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      const { data } = await api.get<PhysicalActivity>(`/physical-activities/${activityId}`);
      setItem(data);

      const ymd = isoToYMD(data.date);
      const hm = isoToHM(data.date);

      setForm({
        name: data.name,
        type: data.type,
        duration: data.duration,
        calories: data.calories ?? null,
        observations: data.observations ?? null,
        date: ymd,
        time: hm, // opcional
      });
    } catch (error) {
      if (isAxiosError(error)) {
        setErr(error.response?.data?.message || error.message || "Falha ao carregar atividade");
      } else {
        setErr("Falha ao carregar atividade");
      }
      setItem(null);
      setForm(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const canSave = useMemo(() => {
    if (!form) return false;
    if (!form.name.trim()) return false;
    if (!form.type) return false;
    if (!form.date) return false;
    if (!Number.isFinite(form.duration) || form.duration <= 0) return false;
    if (form.time && !/^\d{2}:\d{2}$/.test(form.time)) return false;
    return true;
  }, [form]);

  async function save() {
    if (!form || !canSave) return;

    setSaving(true);
    setErr(null);

    try {
      const body: ActivityBody = {
        name: form.name.trim(),
        type: form.type,
        duration: Number(form.duration),
        calories: form.calories == null ? null : Number(form.calories),
        observations: form.observations?.trim() ? form.observations.trim() : null,
        date: combineDateTime(form.date, form.time),
      };

      const { data } = await api.put<PhysicalActivity>(`/physical-activities/${activityId}`, body);
      setItem(data);
      setEditing(false);

      setForm({
        name: data.name,
        type: data.type,
        duration: data.duration,
        calories: data.calories ?? null,
        observations: data.observations ?? null,
        date: isoToYMD(data.date),
        time: isoToHM(data.date),
      });
    } catch (error) {
      if (isAxiosError(error)) {
        setErr(error.response?.data?.message || error.message || "Falha ao salvar");
      } else {
        setErr("Falha ao salvar");
      }
    } finally {
      setSaving(false);
    }
  }

  async function doDelete() {
    setDeleteErr(null);
    setDeleting(true);

    try {
      await api.delete(`/physical-activities/${activityId}`);
      setDeleteOpen(false);
      router.push("/app/activities/physical");
    } catch (error) {
      if (isAxiosError(error)) {
        setDeleteErr(error.response?.data?.message || error.message || "Falha ao deletar");
      } else {
        setDeleteErr("Falha ao deletar");
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-28">
        <div className="mb-4 flex items-center justify-between gap-2">
          <Button asChild variant="outline" size="sm" className="bg-card shrink-0">
            <Link href="/app/activities/physical" aria-label="Voltar">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>

          {item && !loading ? (
            <div className="flex items-center gap-2">
              {!editing ? (
                <Button
                  variant="outline"
                  className="bg-card cursor-pointer"
                  onClick={() => setEditing(true)}
                  disabled={saving || deleting}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="bg-card cursor-pointer"
                  onClick={() => {
                    setEditing(false);
                    setForm({
                      name: item.name,
                      type: item.type,
                      duration: item.duration,
                      calories: item.calories ?? null,
                      observations: item.observations ?? null,
                      date: isoToYMD(item.date),
                      time: isoToHM(item.date),
                    });
                  }}
                  disabled={saving}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
              )}

              <Button
                variant="outline"
                className="bg-card cursor-pointer"
                onClick={() => setDeleteOpen(true)}
                disabled={saving || deleting}
              >
                <Trash2 className="mr-2 h-4 w-4 text-rose-600" />
                Deletar
              </Button>
            </div>
          ) : null}
        </div>

        {loading ? (
          <Card>
            <CardHeader className="flex-row items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="mt-2 h-3 w-36" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ) : err ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5" />
                Não foi possível carregar
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-destructive">
              {err}
              <div className="mt-3">
                <Button variant="outline" onClick={load} className="bg-card cursor-pointer">
                  Tentar novamente
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : item && form ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5" />
                {title}
              </CardTitle>
             
            </CardHeader>

            <CardContent className="space-y-4">
              {err ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {err}
                </div>
              ) : null}

              {!editing ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                    <div className="rounded-lg border border-border/70 bg-black/25 px-3 py-2">
                      <div className="text-xs text-muted-foreground">Tipo</div>
                      <div className="text-sm font-medium">{typeLabel(item.type)}</div>
                    </div>

                    <div className="rounded-lg border border-border/70 bg-black/25 px-3 py-2">
                      <div className="text-xs text-muted-foreground">Data</div>
                      <div className="text-sm font-medium">{fmtDateShort(item.date)}</div>
                    </div>

                    <div className="rounded-lg border border-border/70 bg-black/25 px-3 py-2">
                      <div className="text-xs text-muted-foreground">Hora</div>
                      <div className="text-sm font-medium">{fmtTimeShort(item.date)}</div>
                    </div>

                    <div className="rounded-lg border border-border/70 bg-black/25 px-3 py-2">
                      <div className="text-xs text-muted-foreground">Duração</div>
                      <div className="text-sm font-medium">{fmtDuration(item.duration)}</div>
                    </div>

                    <div className="rounded-lg border border-border/70 bg-black/25 px-3 py-2">
                      <div className="text-xs text-muted-foreground">Calorias</div>
                      <div className="text-sm font-medium">{typeof item.calories === "number" ? `${item.calories} kcal` : "—"}</div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/70 bg-black/25 px-3 py-2">
                    <div className="text-xs text-muted-foreground">Observações</div>
                    <div className="text-sm">{item.observations ? item.observations : "—"}</div>
                  </div>

                  {(item.exerciseLogs ?? []).length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-semibold">Exercícios executados</p>
                      <div className="grid gap-2">
                        {groupExerciseLogs(item.exerciseLogs!).map((group) => (
                          <div key={group.name} className="rounded-xl bg-black/25 border border-border/70 p-3">
                            <p className="mb-2 text-sm font-medium">{group.name}</p>
                            <div className="space-y-1">
                              {group.sets.map((s) => (
                                <div
                                  key={s.id}
                                  className={`flex items-center gap-3 rounded-lg px-2 py-1 text-xs ${
                                    s.completed
                                      ? "bg-primary/10 text-primary"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  <span className="w-14 shrink-0">Série {s.setNumber}</span>
                                  <span className="w-14 shrink-0">
                                    {s.weight != null ? `${s.weight}kg` : "—"}
                                  </span>
                                  <span className="w-16 shrink-0">
                                    {s.reps != null ? `${s.reps} reps` : "—"}
                                  </span>
                                  <span className="ml-auto flex items-center gap-1">
                                    {s.completed ? (
                                      <>
                                        <Check className="h-3 w-3" /> Concluída
                                      </>
                                    ) : (
                                      "Pulada"
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Nome</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((p) => (p ? { ...p, name: e.target.value } : p))}
                      className="w-full rounded-md border border-border/30 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                      disabled={saving}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Tipo</label>
                      <select
                        value={form.type}
                        onChange={(e) => setForm((p) => (p ? { ...p, type: e.target.value as ActivityType } : p))}
                        className="w-full rounded-md border border-border/30 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                        disabled={saving}
                      >
                        {ACTIVITY_TYPES.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Data</label>
                      <input
                        type="date"
                        value={form.date}
                        onChange={(e) => setForm((p) => (p ? { ...p, date: e.target.value } : p))}
                        className="w-full rounded-md border border-border/30 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                        disabled={saving}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Hora (opcional)</label>
                      <input
                        type="time"
                        value={form.time ?? ""}
                        onChange={(e) => setForm((p) => (p ? { ...p, time: e.target.value } : p))}
                        className="w-full rounded-md border border-border/30 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                        disabled={saving}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Duração (min)</label>
                      <input
                        type="number"
                        min={1}
                        value={String(form.duration)}
                        onChange={(e) => setForm((p) => (p ? { ...p, duration: Number(e.target.value) } : p))}
                        className="w-full rounded-md border border-border/30 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                        disabled={saving}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Calorias (kcal)</label>
                      <input
                        type="number"
                        min={0}
                        value={form.calories == null ? "" : String(form.calories)}
                        onChange={(e) =>
                          setForm((p) => (p ? { ...p, calories: e.target.value === "" ? null : Number(e.target.value) } : p))
                        }
                        className="w-full rounded-md border border-border/30 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                        disabled={saving}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Observações</label>
                    <textarea
                      value={form.observations ?? ""}
                      onChange={(e) => setForm((p) => (p ? { ...p, observations: e.target.value } : p))}
                      rows={4}
                      className="w-full rounded-md border border-border/30 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                      disabled={saving}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="button" onClick={save} disabled={!canSave || saving} className="cursor-pointer">
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Salvar alterações
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}

        {/* Modal delete */}
        <AlertDialog open={deleteOpen} onOpenChange={(open) => !deleting && setDeleteOpen(open)}>
          <AlertDialogContent className="w-[calc(100svw-2rem)] max-w-[520px] p-4 sm:p-6 rounded-2xl sm:rounded-xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Deletar atividade?</AlertDialogTitle>
              <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
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
              >
                {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Deletar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
