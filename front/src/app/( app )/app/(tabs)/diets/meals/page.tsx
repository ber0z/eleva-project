// app/(app)/app/meals/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";
import { Plus, Utensils, RefreshCw, Droplets, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Modal from "@/components/ui/Modal";

type MealLogDay = {
  id: number;
  date: string; // ISO
  notes: string | null;
  adherence: number | null; // %
  totalKcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  waterMl: number | null;
  createdAt: string;
  updatedAt: string;
};

type MealLogDaysResponse = {
  items: MealLogDay[];
  total: number;
  page: number;
  pageSize: number;
};

const PAGE_SIZE = 10;

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
  // 2500ml -> 2.5L
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

export default function MealLogDaysPage() {

  const router = useRouter();

  const [items, setItems] = useState<MealLogDay[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState<number | null>(null);

  const [creatingOpen, setCreatingOpen] = useState(false);
  const [creatingBusy, setCreatingBusy] = useState(false);
  const [creatingMsg, setCreatingMsg] = useState("Criando registro...");
  const [creatingErr, setCreatingErr] = useState<string | null>(null);

  // ux
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const hasMore = useMemo(() => (totalPages ? page < totalPages : true), [page, totalPages]);

  // Sentinel para IntersectionObserver
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const fetchPage = useCallback(async (targetPage: number) => {
    const isFirst = targetPage === 1;

    if (isFirst) {
      setInitialLoading(true);
      setErr(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const { data } = await api.get<MealLogDaysResponse>("/meal-log-day", {
        params: { page: targetPage, pageSize: PAGE_SIZE },
      });

      setItems((prev) => {
        const merged = isFirst ? data.items : [...prev, ...data.items];
        const seen = new Set<number>();
        return merged.filter((d) => {
          if (seen.has(d.id)) return false;
          seen.add(d.id);
          return true;
        });
      });

      const tp = Math.max(1, Math.ceil((data.total ?? 0) / (data.pageSize ?? PAGE_SIZE)));
      setPage(data.page ?? targetPage);
      setTotalPages(tp);
      setErr(null);
    } catch (error) {
      if (isAxiosError(error)) {
        setErr(error.response?.data?.message || error.message || "Falha ao carregar registros de refeições");
      } else {
        setErr("Falha ao carregar registros de refeições");
      }
    } finally {
      setInitialLoading(false);
      setLoadingMore(false);
    }
  }, []);


  // initial load
  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);


  // intersection observer para infinito
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !loadingMore && !initialLoading) {
          fetchPage(page + 1);
        }
      },
      { root: null, rootMargin: "200px", threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, initialLoading, page, fetchPage]);


  function toLocalYMD(d = new Date()) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  async function findExistingDayIdByDate(yyyyMmDd: string): Promise<number | null> {
    // 1) tenta achar no que já está carregado
    const localMatch = items.find((it) => String(it.date).slice(0, 10) === yyyyMmDd)?.id ?? null;
    if (localMatch) return localMatch;

    // 2) fallback: varre páginas no backend
    const pageSize = 100;
    const maxPages = 20;

    try {
      const first = await api.get<MealLogDaysResponse>("/meal-log-day", { params: { page: 1, pageSize } });

      const matchIn = (arr: MealLogDay[]) => arr.find((it) => String(it.date).slice(0, 10) === yyyyMmDd)?.id ?? null;

      const id1 = matchIn(first.data.items ?? []);
      if (id1) return id1;

      const total = first.data.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const pagesToScan = Math.min(totalPages, maxPages);

      for (let p = 2; p <= pagesToScan; p++) {
        const res = await api.get<MealLogDaysResponse>("/meal-log-day", { params: { page: p, pageSize } });
        const id = matchIn(res.data.items ?? []);
        if (id) return id;
      }

      return null;
    } catch {
      return null;
    }
  }

  async function createTodayAndOpen() {
    if (creatingBusy) return;

    const targetDate = toLocalYMD();

    setCreatingErr(null);
    setCreatingMsg("Verificando se já existe...");
    setCreatingOpen(true);
    setCreatingBusy(true);

    try {
      const existingId = await findExistingDayIdByDate(targetDate);
      if (existingId) {
        setCreatingMsg("Abrindo edição...");
        router.push(`/app/diets/meals/${existingId}/edit`);
        return;
      }

      setCreatingMsg("Criando registro do dia...");
      const res = await api.post<{ id: number }>("/meal-log-day", { date: targetDate });

      if (res.data?.id) {
        setCreatingMsg("Abrindo edição...");
        router.push(`/app/diets/meals/${res.data.id}/edit`);
        return;
      }

      throw new Error("Resposta sem id.");
    } catch (e) {
      // se deu erro (ex.: duplicado), tenta achar de novo e abrir
      if (isAxiosError(e)) {
        setCreatingMsg("Verificando registro existente...");
        const existingId = await findExistingDayIdByDate(targetDate);
        if (existingId) {
          router.push(`/app/diets/meals/${existingId}/edit`);
          return;
        }
        setCreatingErr(e.response?.data?.message || e.message || "Falha ao criar registro");
      } else {
        setCreatingErr("Falha ao criar registro");
      }
    } finally {
      setCreatingBusy(false);
    }
  }

  return (
    <div className="min-h-svh bg-background text-foreground overflow-x-hidden">      <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-28">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">Refeições Diarias</h1>

        </div>

        <div className="mt-2">
          <Button size="sm" variant="default" onClick={() => fetchPage(1)}>
            <Link href="/app/diets/meals/new" aria-label="Criar novo registro de refeições">
              Registrar dias anteriores
            </Link>
          </Button>
        </div>

      </div>

      {/* Erro */}
      {err && !initialLoading && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {err}
          <div className="mt-2">
            <Button size="sm" variant="outline" onClick={() => fetchPage(1)}>
              Tentar novamente
            </Button>
          </div>
        </div>
      )}

      {/* Lista / Empty / Skeleton */}
      {initialLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex-row items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="mt-2 h-3 w-40" />
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5" />
              Sem registros ainda
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Registre seu primeiro dia de refeições para acompanhar adesão e macros.
            <div className="mt-4">
              <Button asChild>
                <Link href="/app/diets/meals/new">Criar registro</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <ul className="grid gap-3 min-w-0">
            {items.map((d) => {
              const title = formatDate(d.date);
              const kcal = formatKcal(d.totalKcal);
              const adh = formatAdherence(d.adherence);
              const p = formatMacro(d.protein);
              const c = formatMacro(d.carbs);
              const f = formatMacro(d.fat);
              const water = formatWater(d.waterMl);

              const subtitle = compactLine([
                kcal,
                adh ? `adesão ${adh}` : null,
                p ? `P ${p}` : null,
                c ? `C ${c}` : null,
                f ? `G ${f}` : null,
                water ? `água ${water}` : null,
              ]);

              const note = d.notes?.trim() ? d.notes.trim() : null;

              return (
                <li key={d.id} className="min-w-0">
                  {/* ajuste a rota de detalhes se você tiver /app/meals/[id] */}
                  <Link
                    href={`/app/diets/meals/${d.id}`}
                    className="block w-full min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
                    aria-label={`Abrir registro de ${title}`}
                  >
                    <Card className="group cursor-pointer transition hover:shadow-sm">
                      <CardHeader className="flex-row items-center gap-3 min-w-0">
                        <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15">
                          <Utensils className="h-5 w-5 text-primary" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base group-hover:underline truncate">
                            {title}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground truncate">
                            {subtitle || "—"}
                          </p>
                        </div>

                        {water ? (
                          <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                            <Droplets className="h-4 w-4" />
                            {water}
                          </div>
                        ) : null}
                      </CardHeader>

                      {note ? (
                        <CardContent className="pt-0 px-4 sm:px-6">
                          <div className="text-xs text-muted-foreground truncate">
                            {note}
                          </div>
                        </CardContent>
                      ) : null}
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Loading mais páginas */}
          <div className="mt-4 flex items-center justify-center">
            {loadingMore && (
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Carregando mais...
              </div>
            )}
          </div>

          {/* Sentinel */}
          <div ref={sentinelRef} className="h-8 w-full" />
        </>
      )}
    </div>

      <Button
        size="icon"
        className="fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-lg cursor-pointer"
        onClick={createTodayAndOpen}
        disabled={creatingBusy}
        aria-label="Criar registro de hoje"
        title="Criar registro de hoje"
      >
        {creatingBusy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Plus className="h-6 w-6" />}
      </Button>



      <Modal
        open={creatingOpen}
        onClose={() => {
          if (creatingBusy) return; // evita fechar enquanto está criando
          setCreatingOpen(false);
          setCreatingErr(null);
        }}
        title={creatingErr ? "Não foi possível criar" : "Criando registro"}
        maxWidthClassName="max-w-md"
      >
        {!creatingErr ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-primary" />
              <div className="min-w-0">
                <p className="text-sm font-medium">{creatingMsg}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Aguarde um instante… você será redirecionado automaticamente.
                </p>
              </div>
            </div>

            {/* “animação” simples sem depender de lib */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/2 bg-primary/40 animate-pulse" />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {creatingErr}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                className="bg-card cursor-pointer"
                onClick={() => {
                  setCreatingOpen(false);
                  setCreatingErr(null);
                }}
              >
                Fechar
              </Button>

              <Button className="cursor-pointer" onClick={createTodayAndOpen}>
                Tentar novamente
              </Button>
            </div>
          </div>
        )}
      </Modal>


    </div>
  );
}
