// app/(app)/app/diets/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";
import {
  ArrowLeft,
  FileText,
  ExternalLink,
  Utensils,
  Clock,
  CalendarDays,
  Pencil,
  Trash2,
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

type Meal = {
  id: number;
  idDiet: number;
  title: string;
  time: string | null;
  meal: string;
  notes: string | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  createdAt: string;
  updatedAt: string;
};

type DietDetails = {
  id: number;
  idUser: number;
  title: string;
  notes: string | null;
  date: string; // ISO
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  createdAt: string;
  updatedAt: string;
  idProfessional: number | null;
  professional?: { id: number; name: string } | null;
  meals: Meal[];
  documentUrl?: string | null;
  documentUrlExpiresAt?: string | null;
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

function nonNullNum(n: number | null | undefined) {
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function sortMeals(meals: Meal[]) {
  // ordena por horário (HH:mm). Sem hora -> vai pro fim.
  return [...(meals ?? [])].sort((a, b) => {
    const ta = a.time ?? "99:99";
    const tb = b.time ?? "99:99";
    return ta.localeCompare(tb);
  });
}

export default function DietDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const dietId = Number(params?.id);

  const [data, setData] = useState<DietDetails | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // delete diet
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  async function fetchDiet() {
    setErr(null);
    setInitialLoading(true);

    if (!Number.isFinite(dietId) || dietId <= 0) {
      setErr("Dieta inválida.");
      setInitialLoading(false);
      return;
    }

    try {
      const res = await api.get<DietDetails>(`/diet/${dietId}`);
      setData(res.data);
    } catch (e) {
      if (isAxiosError(e)) setErr(e.response?.data?.message || e.message || "Falha ao carregar dieta");
      else setErr("Falha ao carregar dieta");
    } finally {
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    void fetchDiet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dietId]);

  const meals = useMemo(() => sortMeals(data?.meals ?? []), [data?.meals]);

  const totals = useMemo(() => {
    const p = nonNullNum(data?.protein);
    const c = nonNullNum(data?.carbs);
    const f = nonNullNum(data?.fat);

    // se vier null nos totais, calcula pelos meals (fallback)
    if (p != null || c != null || f != null) return { p, c, f, fromMeals: false };

    let sp = 0,
      sc = 0,
      sf = 0;
    let hasAny = false;

    for (const m of meals) {
      if (typeof m.protein === "number") {
        sp += m.protein;
        hasAny = true;
      }
      if (typeof m.carbs === "number") {
        sc += m.carbs;
        hasAny = true;
      }
      if (typeof m.fat === "number") {
        sf += m.fat;
        hasAny = true;
      }
    }

    return hasAny
      ? { p: sp, c: sc, f: sf, fromMeals: true }
      : { p: null, c: null, f: null, fromMeals: true };
  }, [data?.protein, data?.carbs, data?.fat, meals]);

  function openDeleteDialog() {
    setDeleteErr(null);
    setDeleteOpen(true);
  }

  async function doDelete() {
    if (!dietId || !Number.isFinite(dietId)) return;

    setDeleting(true);
    setDeleteErr(null);

    try {
      await api.delete(`/diet/${dietId}`);
      setDeleteOpen(false);
      router.push("/app/diets/plans");
      router.refresh();
    } catch (e) {
      const msg = isAxiosError(e) ? e.response?.data?.message || e.message : "Falha ao excluir dieta";
      setDeleteErr(msg);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-28">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-2">
          <Button
            variant="outline"
            className="bg-card cursor-pointer"
            onClick={() => router.push("/app/diets/plans")}
            title="Voltar"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              className="bg-card cursor-pointer"
              title="Editar"
              disabled={initialLoading || !data}
            >
              <Link href={`/app/diets/plans/${dietId}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Link>
            </Button>

            <Button
              variant="outline"
              className="cursor-pointer border-destructive/40 text-destructive hover:text-destructive hover:bg-destructive/10 bg-card"
              onClick={openDeleteDialog}
              disabled={initialLoading || !data}
              title="Excluir dieta"
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

            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex-row items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="mt-2 h-3 w-28" />
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : err ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {err}
            <div className="mt-2">
              <Button size="sm" variant="outline" onClick={fetchDiet}>
                Tentar novamente
              </Button>
            </div>
          </div>
        ) : !data ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Dieta não encontrada
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Não foi possível carregar os dados.</CardContent>
          </Card>
        ) : (
          <>
            {/* Resumo */}
            <Card className="overflow-hidden">
              <div className="bg-primary/10 px-4 sm:px-6 py-4 border-b border-border/30">
                <h1 className="text-base sm:text-lg font-semibold truncate">{data.title}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-4 w-4" />
                    {formatDate(data.date)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Utensils className="h-4 w-4" />
                    {meals.length} refeição(ões)
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

              <CardContent className="grid gap-4 pt-5 px-4 sm:px-6">
                {data.notes ? (
                  <div className="rounded-xl border border-border/30 bg-card p-3 text-sm">
                    <div className="text-xs text-muted-foreground mb-1">Observações</div>
                    <div className="whitespace-pre-wrap">{data.notes}</div>
                  </div>
                ) : null}

                {/* Macros */}
                <div className="rounded-2xl bg-background/70 p-3 sm:p-4 border border-border/30">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">Macros</p>
                    {totals.fromMeals ? (
                      <span className="text-[11px] text-muted-foreground">
                        {totals.p != null || totals.c != null || totals.f != null
                          ? "calculado pelas refeições"
                          : "não informado"}
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">informado na dieta</span>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-border/30 bg-card p-3">
                      <div className="text-[11px] text-muted-foreground">Proteína</div>
                      <div className="text-sm font-semibold">
                        {totals.p ?? "—"}
                        {totals.p != null ? " g" : ""}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/30 bg-card p-3">
                      <div className="text-[11px] text-muted-foreground">Carbo</div>
                      <div className="text-sm font-semibold">
                        {totals.c ?? "—"}
                        {totals.c != null ? " g" : ""}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/30 bg-card p-3">
                      <div className="text-[11px] text-muted-foreground">Gordura</div>
                      <div className="text-sm font-semibold">
                        {totals.f ?? "—"}
                        {totals.f != null ? " g" : ""}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Documento */}
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
                </div>
              </CardContent>
            </Card>

            {/* Refeições */}
            <div className="mt-4 grid gap-3">
              {meals.length === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Utensils className="h-5 w-5" />
                      Sem refeições
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Esta dieta ainda não possui refeições cadastradas.
                    <div className="mt-4">
                      <Button asChild>
                        <Link href={`/app/diets/plans/${data.id}/edit`}>Editar</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <ul className="grid gap-3">
                  {meals.map((m) => {
                    const mealTitle = m.title?.trim() ? m.title : `Refeição #${m.id}`;
                    const time = m.time?.trim() ? m.time.trim() : null;

                    const macroLine = [
                      typeof m.protein === "number" ? `${m.protein}p` : null,
                      typeof m.carbs === "number" ? `${m.carbs}c` : null,
                      typeof m.fat === "number" ? `${m.fat}g` : null,
                    ]
                      .filter(Boolean)
                      .join(" • ");

                    return (
                      <li key={m.id}>
                        <Card className="overflow-hidden">
                          <CardHeader className="flex-row items-center gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15">
                              <Utensils className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base truncate">{mealTitle}</CardTitle>
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                {time ? (
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {time}
                                  </span>
                                ) : null}
                                {macroLine ? <span>{macroLine}</span> : null}
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent className="pt-0 pb-4 px-4 sm:px-6">
                            <div className="rounded-xl border border-border/30 bg-card p-3 text-sm">
                              <div className="text-xs text-muted-foreground mb-1">Refeição</div>
                              <div className="whitespace-pre-wrap">{m.meal}</div>
                            </div>

                            {m.notes ? (
                              <div className="mt-3 rounded-xl border border-border/30 bg-card p-3 text-sm">
                                <div className="text-xs text-muted-foreground mb-1">Notas</div>
                                <div className="whitespace-pre-wrap">{m.notes}</div>
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
      </div>

      {/* ✅ Modal confirmação Excluir Dieta */}
      <AlertDialog open={deleteOpen} onOpenChange={(open) => !deleting && setDeleteOpen(open)}>
        <AlertDialogContent className="w-[calc(100svw-2rem)] max-w-[560px] p-4 sm:p-6 rounded-2xl sm:rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir dieta</AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai excluir a dieta e todas as refeições associadas. Essa ação não pode ser desfeita.
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
                void doDelete();
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
    </div>
  );
}
