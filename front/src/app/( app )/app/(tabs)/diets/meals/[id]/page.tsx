// app/(app)/app/meals/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";
import {
  ArrowLeft,
  Utensils,
  CalendarDays,
  Droplets,
  Flame,
  Activity,
  Clock,
  FileText,
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

type MealLogEntry = {
  id: number;
  idDay: number;
  title: string;
  time: string | null;
  description: string;
  notes: string | null;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  dietMealId: number | null;
  createdAt: string;
  updatedAt: string;
};

type MealLogDayDetails = {
  id: number;
  idUser: number;
  date: string; // ISO
  notes: string | null;
  adherence: number | null;
  totalKcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  waterMl: number | null;
  dietId: number | null;
  createdAt: string;
  updatedAt: string;
  entries: MealLogEntry[];
  diet: unknown | null;
};

function formatDate(iso: string) {
  try {
    const fmt = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "UTC",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    return fmt.format(new Date(iso));
  } catch {
    return iso;
  }
}

function compactLine(parts: Array<string | null | undefined>) {
  return parts.filter((p) => (p ?? "").toString().trim().length > 0).join(" • ");
}

function formatWater(ml?: number | null) {
  if (typeof ml !== "number" || !Number.isFinite(ml) || ml <= 0) return null;
  const liters = ml / 1000;
  const txt = Number.isInteger(liters) ? `${liters} L` : `${liters.toFixed(1)} L`;
  return txt.replace(".", ",");
}

function formatKcal(v?: number | null) {
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) return null;
  return `${Math.round(v)} kcal`;
}

function formatMacro(v?: number | null, suffix = "g") {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return null;
  return `${Math.round(v)}${suffix}`;
}

function formatAdherence(v?: number | null) {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return null;
  return `${Math.round(v)}%`;
}

function sortEntries(entries: MealLogEntry[]) {
  return [...(entries ?? [])].sort((a, b) => {
    const ta = a.time ?? "99:99";
    const tb = b.time ?? "99:99";
    return ta.localeCompare(tb);
  });
}

export default function MealLogDayDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const dayId = Number(params?.id);

  const [data, setData] = useState<MealLogDayDetails | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  async function fetchDay() {
    setErr(null);
    setInitialLoading(true);

    if (!Number.isFinite(dayId) || dayId <= 0) {
      setErr("Registro inválido.");
      setInitialLoading(false);
      return;
    }

    try {
      const res = await api.get<MealLogDayDetails>(`/meal-log-day/${dayId}`);
      setData(res.data);
    } catch (e) {
      if (isAxiosError(e)) setErr(e.response?.data?.message || e.message || "Falha ao carregar registro");
      else setErr("Falha ao carregar registro");
    } finally {
      setInitialLoading(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteErr(null);

    try {
      // ✅ assumindo DELETE /meal-log-day/:id
      await api.delete(`/meal-log-day/${dayId}`);
      router.push("/app/diets/meals");
    } catch (e) {
      if (isAxiosError(e)) setDeleteErr(e.response?.data?.message || e.message || "Falha ao excluir registro");
      else setDeleteErr("Falha ao excluir registro");
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    void fetchDay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayId]);

  const entries = useMemo(() => sortEntries(data?.entries ?? []), [data?.entries]);

  const totals = useMemo(() => {
    // se vier total do dia, usa; senão calcula a partir das entradas
    const hasDayTotals =
      typeof data?.totalKcal === "number" ||
      typeof data?.protein === "number" ||
      typeof data?.carbs === "number" ||
      typeof data?.fat === "number";

    if (hasDayTotals) {
      return {
        kcal: data?.totalKcal ?? null,
        p: data?.protein ?? null,
        c: data?.carbs ?? null,
        f: data?.fat ?? null,
        fromEntries: false,
      };
    }

    let kcal = 0,
      p = 0,
      c = 0,
      f = 0;
    let hasAny = false;

    for (const e of entries) {
      if (typeof e.kcal === "number") {
        kcal += e.kcal;
        hasAny = true;
      }
      if (typeof e.protein === "number") {
        p += e.protein;
        hasAny = true;
      }
      if (typeof e.carbs === "number") {
        c += e.carbs;
        hasAny = true;
      }
      if (typeof e.fat === "number") {
        f += e.fat;
        hasAny = true;
      }
    }

    return hasAny
      ? { kcal, p, c, f, fromEntries: true }
      : { kcal: null, p: null, c: null, f: null, fromEntries: true };
  }, [data?.totalKcal, data?.protein, data?.carbs, data?.fat, entries]);

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-28">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-2">
          <Button
            variant="outline"
            className="bg-card cursor-pointer"
            onClick={() => router.push("/app/diets/meals")}
            title="Voltar"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="bg-card cursor-pointer" title="Editar" disabled={initialLoading}>
              <Link href={`/app/diets/meals/${dayId}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Link>
            </Button>

            

            <Button
              type="button"
              variant="outline"
              className="bg-card cursor-pointer border-destructive/40 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                setDeleteErr(null);
                setDeleteOpen(true);
              }}
              disabled={initialLoading || deleting}
              title="Excluir"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </Button>
          </div>
        </div>

        {/* Loading */}
        {initialLoading ? (
          <div className="grid gap-3">
            <Card>
              <CardHeader className="space-y-2">
                <Skeleton className="h-5 w-56" />
                <Skeleton className="h-3 w-72" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
              </CardContent>
            </Card>

            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex-row items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="mt-2 h-3 w-28" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Skeleton className="h-20 w-full rounded-xl" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : err ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {err}
            <div className="mt-2">
              <Button size="sm" variant="outline" onClick={fetchDay}>
                Tentar novamente
              </Button>
            </div>
          </div>
        ) : !data ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="h-5 w-5" />
                Registro não encontrado
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Não foi possível carregar os dados.</CardContent>
          </Card>
        ) : (
          <>
            {/* Resumo */}
            <Card className="overflow-hidden">
              <div className="bg-primary/10 px-4 sm:px-6 py-4 border-b border-border/60">
                <h1 className="text-base sm:text-lg font-semibold truncate">Registro do dia</h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-4 w-4" />
                    {formatDate(data.date)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Utensils className="h-4 w-4" />
                    {entries.length} refeição(ões)
                  </span>
                  {formatAdherence(data.adherence) ? (
                    <span className="inline-flex items-center gap-1">
                      <Activity className="h-4 w-4" />
                      adesão {formatAdherence(data.adherence)}
                    </span>
                  ) : null}
                  {formatWater(data.waterMl) ? (
                    <span className="inline-flex items-center gap-1">
                      <Droplets className="h-4 w-4" />
                      água {formatWater(data.waterMl)}
                    </span>
                  ) : null}
                </div>
              </div>

              <CardContent className="grid gap-4 pt-5 px-4 sm:px-6">
                {data.notes ? (
                  <div className="rounded-xl border border-border/60 bg-card p-3 text-sm">
                    <div className="text-xs text-muted-foreground mb-1">Observações</div>
                    <div className="whitespace-pre-wrap">{data.notes}</div>
                  </div>
                ) : null}

                {/* Totais */}
                <div className="rounded-2xl bg-background/70 p-3 sm:p-4 border border-border/60">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">Totais</p>
                    <span className="text-[11px] text-muted-foreground">
                      {totals.fromEntries ? "calculado pelas entradas" : "informado no dia"}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="rounded-xl border border-border/60 bg-card p-3">
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Flame className="h-4 w-4" /> kcal
                      </div>
                      <div className="text-sm font-semibold">{formatKcal(totals.kcal) ?? "—"}</div>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-card p-3">
                      <div className="text-[11px] text-muted-foreground">Proteína</div>
                      <div className="text-sm font-semibold">{formatMacro(totals.p) ?? "—"}</div>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-card p-3">
                      <div className="text-[11px] text-muted-foreground">Carbo</div>
                      <div className="text-sm font-semibold">{formatMacro(totals.c) ?? "—"}</div>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-card p-3">
                      <div className="text-[11px] text-muted-foreground">Gordura</div>
                      <div className="text-sm font-semibold">{formatMacro(totals.f) ?? "—"}</div>
                    </div>
                  </div>

                  {data.dietId ? (
                    <div className="mt-3">
                      <Button asChild variant="outline" className="bg-card cursor-pointer">
                        <Link href={`/app/diets/meals/${data.dietId}`}>Abrir dieta vinculada</Link>
                      </Button>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {/* Entradas */}
            <div className="mt-4 grid gap-3">
              {entries.length === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Sem entradas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Este dia ainda não possui entradas de refeições.
                  </CardContent>
                </Card>
              ) : (
                <ul className="grid gap-3">
                  {entries.map((e) => {
                    const t = e.title?.trim() ? e.title : `Refeição #${e.id}`;
                    const time = e.time?.trim() ? e.time.trim() : null;

                    const macros = compactLine([
                      typeof e.kcal === "number" ? `${Math.round(e.kcal)} kcal` : null,
                      typeof e.protein === "number" ? `${Math.round(e.protein)}p` : null,
                      typeof e.carbs === "number" ? `${Math.round(e.carbs)}c` : null,
                      typeof e.fat === "number" ? `${Math.round(e.fat)}g` : null,
                    ]);

                    return (
                      <li key={e.id}>
                        <Card className="overflow-hidden">
                          <CardHeader className="flex-row items-center gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15">
                              <Utensils className="h-5 w-5 text-primary" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base truncate">{t}</CardTitle>
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                {time ? (
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {time}
                                  </span>
                                ) : null}
                                {macros ? <span>{macros}</span> : null}
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent className="pt-0 pb-4 px-4 sm:px-6">
                            <div className="rounded-xl border border-border/60 bg-card p-3 text-sm">
                              <div className="text-xs text-muted-foreground mb-1">Descrição</div>
                              <div className="whitespace-pre-wrap">{e.description}</div>
                            </div>

                            {e.notes ? (
                              <div className="mt-3 rounded-xl border border-border/60 bg-card p-3 text-sm">
                                <div className="text-xs text-muted-foreground mb-1">Notas</div>
                                <div className="whitespace-pre-wrap">{e.notes}</div>
                              </div>
                            ) : null}
                          </CardContent>
                        </Card>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}

        {/* ===== Modal confirmação de exclusão ===== */}
        <AlertDialog open={deleteOpen} onOpenChange={(open) => !deleting && setDeleteOpen(open)}>
          <AlertDialogContent className="w-[calc(100svw-2rem)] max-w-[560px] p-4 sm:p-6 rounded-2xl sm:rounded-xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir registro</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este registro do dia?
                <br />
                Essa ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {deleteErr ? (
              <div className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {deleteErr}
              </div>
            ) : null}

            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting} className="cursor-pointer">
                Cancelar
              </AlertDialogCancel>

              <AlertDialogAction
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:opacity-90"
                onClick={(e) => {
                  e.preventDefault();
                  void handleDelete();
                }}
              >
                {deleting ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
