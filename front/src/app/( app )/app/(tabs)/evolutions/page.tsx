"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";
import { Plus, Activity, RefreshCw, ArrowLeftRight } from "lucide-react";

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

type Evolution = {
  id: number;
  evaluationDate: string; // ISO
  weight: number;
};

type EvolutionsResponse = {
  data: Evolution[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const PAGE_SIZE = 10;
// para o modal: puxa um "lote grande" sem ficar paginando
const COMPARE_PAGE_SIZE = 200;

export default function EvolutionsPage() {
  const router = useRouter();

  // list state
  const [items, setItems] = useState<Evolution[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);

  // ux
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const hasMore = useMemo(() => (totalPages ? page < totalPages : true), [page, totalPages]);

  // Sentinel para IntersectionObserver
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // ===== modal comparar =====
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareErr, setCompareErr] = useState<string | null>(null);
  const [compareOptions, setCompareOptions] = useState<Evolution[]>([]);
  const [evoAId, setEvoAId] = useState<number | null>(null);
  const [evoBId, setEvoBId] = useState<number | null>(null);

  function formatDate(iso: string) {
    try {
      // força formatação em UTC para preservar o dia da string ISO
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

  // fetch page
  async function fetchPage(targetPage: number) {
    const isFirst = targetPage === 1;
    if (isFirst) {
      setInitialLoading(true);
      setErr(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const { data } = await api.get<EvolutionsResponse>("/evolution/all", {
        params: { page: targetPage, pageSize: PAGE_SIZE },
      });

      // dedup por id
      setItems((prev) => {
        const merged = isFirst ? data.data : [...prev, ...data.data];
        const seen = new Set<number>();
        return merged.filter((e) => {
          const isNew = !seen.has(e.id);
          seen.add(e.id);
          return isNew;
        });
      });

      setPage(data.page);
      setTotalPages(data.totalPages);
      setTotal(data.total);
      setErr(null);
    } catch (error) {
      if (isAxiosError(error)) {
        setErr(error.response?.data?.message || error.message || "Falha ao carregar evoluções");
      } else {
        setErr("Falha ao carregar evoluções");
      }
    } finally {
      setInitialLoading(false);
      setLoadingMore(false);
    }
  }

  // initial load
  useEffect(() => {
    fetchPage(1);
  }, []);

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
  }, [hasMore, loadingMore, initialLoading, page]);

  function openCompareModal() {
    setCompareErr(null);
    setCompareOpen(true);
    // carrega opções ao abrir (ou usa o que já tem)
    void loadCompareOptions();
  }

  function dedupAndSortByDate(list: Evolution[]) {
    const seen = new Set<number>();
    const dedup = list.filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });

    // ordena por data desc (mais recente primeiro)
    return dedup.sort((a, b) => {
      const da = new Date(a.evaluationDate).getTime();
      const db = new Date(b.evaluationDate).getTime();
      return db - da;
    });
  }

  async function loadCompareOptions() {
    setCompareLoading(true);
    setCompareErr(null);

    try {
      // tenta pegar um lote grande (para o seletor ficar completo)
      const res = await api.get<EvolutionsResponse>("/evolution/all", {
        params: { page: 1, pageSize: COMPARE_PAGE_SIZE },
      });

      // junta com itens já carregados (caso o user tenha rolado mais)
      const merged = dedupAndSortByDate([...(res.data.data ?? []), ...(items ?? [])]);
      setCompareOptions(merged);

      // pré-seleção inteligente (2 primeiras distintas)
      if (merged.length >= 2) {
        setEvoAId((prev) => prev ?? merged[0].id);
        setEvoBId((prev) => {
          if (prev != null && prev !== (merged[0]?.id ?? null)) return prev;
          return merged[1].id;
        });
      } else {
        setEvoAId(null);
        setEvoBId(null);
      }
    } catch {
      // fallback: usa o que já tem na tela
      const merged = dedupAndSortByDate([...(items ?? [])]);
      setCompareOptions(merged);

      if (merged.length < 2) {
        setCompareErr("Você precisa ter pelo menos 2 evoluções para comparar.");
      } else {
        setCompareErr("Não foi possível carregar todas as evoluções. Usando as evoluções já carregadas.");
        setEvoAId((prev) => prev ?? merged[0].id);
        setEvoBId((prev) => (prev != null && prev !== merged[0].id ? prev : merged[1].id));
      }
    } finally {
      setCompareLoading(false);
    }
  }

  const canCompare = useMemo(() => {
    if (!evoAId || !evoBId) return false;
    if (evoAId === evoBId) return false;
    return true;
  }, [evoAId, evoBId]);

  function doCompare() {
    if (!canCompare || !evoAId || !evoBId) return;
    setCompareOpen(false);
    router.push(`/app/evolutions/compare/${evoAId}/${evoBId}`);
  }

  const optionLabel = (e: Evolution) => `${formatDate(e.evaluationDate)} • ${e.weight} kg`;

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-28">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">Evoluções</h1>
            {typeof total === "number" && (
              <span className="text-sm text-muted-foreground">{total} no total</span>
            )}
          </div>

          {/* Botão comparar */}
          <Button
            variant="outline"
            className="shrink-0 bg-card cursor-pointer"
            onClick={openCompareModal}
            disabled={initialLoading || items.length < 2}
            title={items.length < 2 ? "Você precisa ter pelo menos 2 evoluções" : "Comparar evoluções"}
          >
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Comparar
          </Button>
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
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="mt-2 h-3 w-24" />
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Sem evoluções ainda
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Registre a sua primeira evolução para acompanhar seu progresso.
              <div className="mt-4">
                <Button asChild>
                  <Link href="/app/evolutions/new">Criar evolução</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <ul className="grid gap-3">
              {items.map((e) => {
                const title = formatDate(e.evaluationDate);
                return (
                  <li key={e.id}>
                    <Link
                      href={`/app/evolutions/${e.id}`}
                      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
                      aria-label={`Abrir evolução de ${title}`}
                    >
                      <Card className="group cursor-pointer transition hover:shadow-sm ">
                        <CardHeader className="flex-row items-center gap-3">
                          <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15">
                            <Activity className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base group-hover:underline">{title}</CardTitle>
                            <p className="text-xs text-muted-foreground">Peso: {e.weight} kg</p>
                          </div>
                        </CardHeader>
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

      {/* FAB */}
      <Button asChild size="icon" className="fixed bottom-28 md:bottom-6 right-6 h-14 w-14 rounded-full shadow-lg">
        <Link href="/app/evolutions/new" aria-label="Criar nova evolução">
          <Plus className="h-6 w-6" />
        </Link>
      </Button>

      {/* ===== Modal: Selecionar evoluções para comparar ===== */}
      <AlertDialog open={compareOpen} onOpenChange={(open) => !compareLoading && setCompareOpen(open)}>
        <AlertDialogContent className="w-[calc(100svw-2rem)] max-w-[560px] p-4 sm:p-6 rounded-2xl sm:rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Comparar evoluções</AlertDialogTitle>
            <AlertDialogDescription>
              Selecione duas evoluções diferentes para abrir a página de comparação.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Evolução 1</label>
                <select
                  value={evoAId ?? ""}
                  onChange={(e) => setEvoAId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full rounded-md border border-border/30 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  disabled={compareLoading || compareOptions.length === 0}
                >
                  <option value="" disabled>
                    Selecione...
                  </option>
                  {compareOptions.map((e) => (
                    <option key={e.id} value={e.id}>
                      {optionLabel(e)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Evolução 2</label>
                <select
                  value={evoBId ?? ""}
                  onChange={(e) => setEvoBId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full rounded-md border border-border/30 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  disabled={compareLoading || compareOptions.length === 0}
                >
                  <option value="" disabled>
                    Selecione...
                  </option>
                  {compareOptions.map((e) => (
                    <option key={e.id} value={e.id}>
                      {optionLabel(e)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {evoAId && evoBId && evoAId === evoBId ? (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                Selecione duas evoluções diferentes.
              </div>
            ) : null}

            {compareErr ? (
              <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-600 dark:text-rose-300">
                {compareErr}
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                className="bg-card cursor-pointer"
                onClick={loadCompareOptions}
                disabled={compareLoading}
                title="Recarregar lista"
              >
                {compareLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Atualizar lista
              </Button>

              <Button
                type="button"
                variant="outline"
                className="bg-card cursor-pointer"
                onClick={() => {
                  if (!evoAId || !evoBId) return;
                  setEvoAId(evoBId);
                  setEvoBId(evoAId);
                }}
                disabled={compareLoading || !evoAId || !evoBId}
                title="Trocar 1 ↔ 2"
              >
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                Trocar
              </Button>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={compareLoading} className="cursor-pointer">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                doCompare();
              }}
              disabled={!canCompare || compareLoading}
              className="bg-primary text-primary-foreground hover:opacity-90 "
              title={!canCompare ? "Selecione duas evoluções diferentes" : "Abrir comparação"}
            >
              Comparar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
