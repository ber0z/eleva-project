"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";
import { ArrowLeft, Moon, Pencil, Save, Trash2, Loader2, X, Info } from "lucide-react";

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

type SleepQuality = "excellent" | "good" | "average" | "poor" | "very_poor";

type Sleep = {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  sleepQuality: SleepQuality;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type SleepBody = {
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  sleepQuality: SleepQuality;
  notes?: string | null;
};

function formatDateBR(yyyyMmDd: string) {
  try {
    const [y, m, d] = yyyyMmDd.split("-").map(Number);
    const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "UTC",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(dt);
  } catch {
    return yyyyMmDd;
  }
}

function timeToMinutes(t: string) {
  const [hh, mm] = t.split(":").map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return 0;
  return hh * 60 + mm;
}

function calcSleepMinutes(startTime: string, endTime: string) {
  const s = timeToMinutes(startTime);
  let e = timeToMinutes(endTime);
  if (e < s) e += 24 * 60; // virou o dia
  return Math.max(0, e - s);
}

function calcSleepDuration(startTime: string, endTime: string) {
  const minutes = calcSleepMinutes(startTime, endTime);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function qualityLabel(q: SleepQuality) {
  switch (q) {
    case "excellent":
      return "Excelente";
    case "good":
      return "Boa";
    case "average":
      return "Média";
    case "poor":
      return "Ruim";
    case "very_poor":
      return "Muito ruim";
    default:
      return q;
  }
}

export default function SleepDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const sleepId = Number(id);

  const [item, setItem] = useState<Sleep | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // edit
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<SleepBody | null>(null);
  const [saving, setSaving] = useState(false);

  // delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  const title = useMemo(() => (item ? formatDateBR(item.date.slice(0, 10)) : "Sono"), [item]);

  // ✅ usa o que está na tela: se estiver editando, usa o form; senão, usa o item
  const effectiveStart = editing && form ? form.startTime : item?.startTime;
  const effectiveEnd = editing && form ? form.endTime : item?.endTime;

  const durationLabel = useMemo(() => {
    if (!effectiveStart || !effectiveEnd) return "";
    return calcSleepDuration(effectiveStart, effectiveEnd);
  }, [effectiveStart, effectiveEnd]);

  const sleepMinutes = useMemo(() => {
    if (!effectiveStart || !effectiveEnd) return 0;
    return calcSleepMinutes(effectiveStart, effectiveEnd);
  }, [effectiveStart, effectiveEnd]);

  const showSleepTip = useMemo(() => {
    return sleepMinutes > 0 && sleepMinutes < 8 * 60;
  }, [sleepMinutes]);

  async function load() {
    if (!Number.isFinite(sleepId) || sleepId <= 0) {
      setErr("ID inválido.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      const { data } = await api.get<Sleep>(`/sleep/${sleepId}`);
      setItem(data);
      setForm({
        date: data.date.slice(0, 10),
        startTime: data.startTime,
        endTime: data.endTime,
        sleepQuality: data.sleepQuality,
        notes: data.notes ?? null,
      });
    } catch (error) {
      if (isAxiosError(error)) {
        setErr(error.response?.data?.message || error.message || "Falha ao carregar registro de sono");
      } else {
        setErr("Falha ao carregar registro de sono");
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
    if (!form.date) return false;
    if (!form.startTime || !form.endTime) return false;
    return true;
  }, [form]);

  async function save() {
    if (!form || !canSave) return;

    setSaving(true);
    setErr(null);

    try {
      const body: SleepBody = {
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        sleepQuality: form.sleepQuality,
        notes: form.notes?.trim() ? form.notes.trim() : null,
      };

      const { data } = await api.put<Sleep>(`/sleep/${sleepId}`, body);
      setItem(data);
      setEditing(false);
      setForm({
        date: data.date.slice(0, 10),
        startTime: data.startTime,
        endTime: data.endTime,
        sleepQuality: data.sleepQuality,
        notes: data.notes ?? null,
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
      await api.delete(`/sleep/${sleepId}`);
      setDeleteOpen(false);
      router.push("/app/sleep");
    } catch (error) {
      if (isAxiosError(error)) {
        setDeleteErr(error.response?.data?.message || error.message || "Falha ao excluir");
      } else {
        setDeleteErr("Falha ao excluir");
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
            <Link href="/app/sleep" aria-label="Voltar">
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
                    // reseta form pro valor do item
                    setForm({
                      date: item.date.slice(0, 10),
                      startTime: item.startTime,
                      endTime: item.endTime,
                      sleepQuality: item.sleepQuality,
                      notes: item.notes ?? null,
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
                title="excluir registro"
              >
                <Trash2 className="mr-2 h-4 w-4 text-rose-600" />
                Excluir
              </Button>
            </div>
          ) : null}
        </div>

        {loading ? (
          <Card>
            <CardHeader className="flex-row items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-2 h-3 w-32" />
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
                <Moon className="h-5 w-5" />
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
                <Moon className="h-5 w-5" />
                {title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {effectiveStart ?? item.startTime} → {effectiveEnd ?? item.endTime} • {durationLabel} • Qualidade:{" "}
                {qualityLabel(editing ? form.sleepQuality : item.sleepQuality)}
              </p>
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
                    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                      <div className="text-xs text-muted-foreground">Data</div>
                      <div className="text-sm font-medium">{formatDateBR(item.date.slice(0, 10))}</div>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                      <div className="text-xs text-muted-foreground">Qualidade</div>
                      <div className="text-sm font-medium">{qualityLabel(item.sleepQuality)}</div>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                      <div className="text-xs text-muted-foreground">Início</div>
                      <div className="text-sm font-medium">{item.startTime}</div>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                      <div className="text-xs text-muted-foreground">Fim</div>
                      <div className="text-sm font-medium">{item.endTime}</div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                    <div className="text-xs text-muted-foreground">Notas</div>
                    <div className="text-sm">{item.notes ? item.notes : "—"}</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Data</label>
                      <input
                        type="date"
                        value={form.date}
                        onChange={(e) => setForm((p) => (p ? { ...p, date: e.target.value } : p))}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                        disabled={saving}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Qualidade</label>
                      <select
                        value={form.sleepQuality}
                        onChange={(e) =>
                          setForm((p) => (p ? { ...p, sleepQuality: e.target.value as SleepQuality } : p))
                        }
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                        disabled={saving}
                      >
                        <option value="excellent">Excelente</option>
                        <option value="good">Boa</option>
                        <option value="average">Média</option>
                        <option value="poor">Ruim</option>
                        <option value="very_poor">Muito ruim</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Início</label>
                      <input
                        type="time"
                        value={form.startTime}
                        onChange={(e) => setForm((p) => (p ? { ...p, startTime: e.target.value } : p))}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                        disabled={saving}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Fim</label>
                      <input
                        type="time"
                        value={form.endTime}
                        onChange={(e) => setForm((p) => (p ? { ...p, endTime: e.target.value } : p))}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                        disabled={saving}
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                    Duração estimada:{" "}
                    <span className="font-medium text-foreground">{calcSleepDuration(form.startTime, form.endTime)}</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Notas</label>
                    <textarea
                      value={form.notes ?? ""}
                      onChange={(e) => setForm((p) => (p ? { ...p, notes: e.target.value } : p))}
                      rows={4}
                      maxLength={1020}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                      disabled={saving}
                      placeholder="Ex.: Acordei 1x à noite"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={save}
                      disabled={!canSave || saving}
                      className="cursor-pointer"
                      title={!canSave ? "Preencha data e horários" : "Salvar"}
                    >
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Salvar alterações
                    </Button>
                  </div>
                </>
              )}

              {/* ✅ Informativo: aparece se for < 8h (em view e em edit) */}
              {showSleepTip ? (
                <div className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-3">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      <Info className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">Dica sobre sono</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Uma meta comum é dormir <b>pelo menos 8 horas</b>. Neste registro, o tempo estimado foi{" "}
                        <b>{durationLabel}</b>.
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Informativo — não substitui orientação médica.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {/* Modal: confirmar delete */}
        <AlertDialog open={deleteOpen} onOpenChange={(open) => !deleting && setDeleteOpen(open)}>
          <AlertDialogContent className="w-[calc(100svw-2rem)] max-w-[520px] p-4 sm:p-6 rounded-2xl sm:rounded-xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir registro de sono?</AlertDialogTitle>
              <AlertDialogDescription>
                Essa ação não pode ser desfeita. O registro será removido permanentemente.
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
              >
                {deleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
