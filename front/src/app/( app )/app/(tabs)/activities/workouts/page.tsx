"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";
import { Plus, Dumbbell, RefreshCw, UserCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Workout = {
  id: number;
  dayOfWeek: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
  title: string;
  _count?: { exercises: number };
};

type Training = {
  id: number;
  title: string;
  notes?: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  idProfessional?: number | null;
  workouts: Workout[];
};

type TrainingsResponse = {
  items: Training[];
  total: number;
  page: number;
  pageSize: number;
};

const PAGE_SIZE = 10;

export default function TrainingsPage() {
  // list state
  const [items, setItems] = useState<Training[]>([]);
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
      const { data } = await api.get<TrainingsResponse>("/training", {
        params: { page: targetPage, pageSize: PAGE_SIZE },
      });

      // dedup por id
      setItems((prev) => {
        const merged = isFirst ? data.items : [...prev, ...data.items];
        const seen = new Set<number>();
        return merged.filter((t) => {
          const isNew = !seen.has(t.id);
          seen.add(t.id);
          return isNew;
        });
      });

      setPage(data.page);
      setTotal(data.total);

      const pages = Math.max(1, Math.ceil((data.total ?? 0) / (data.pageSize ?? PAGE_SIZE)));
      setTotalPages(pages);

      setErr(null);
    } catch (error) {
      if (isAxiosError(error)) {
        setErr(error.response?.data?.message || error.message || "Falha ao carregar treinos");
      } else {
        setErr("Falha ao carregar treinos");
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

  return (
    <div className="min-h-svh bg-background text-foreground overflow-x-hidden">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-28">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">Fichas de Treino</h1>
            {typeof total === "number" && <span className="text-sm text-muted-foreground">{total} no total</span>}
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
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="mt-2 h-3 w-56" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Skeleton className="h-3 w-40" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5" />
                Sem treinos ainda
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Crie seu primeiro treino.
              <div className="mt-4">
                <Button asChild>
                  <Link href="/app/activities/workouts/new">Criar treino</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <ul className="grid gap-3">
              {items.map((t) => {
                const subtitle =
                  (t.notes && t.notes.trim()) || (t.updatedAt ? `Atualizado em ${formatDate(t.updatedAt)}` : "");

                const workoutsCount = t.workouts?.length ?? 0;

                return (
                  <li key={t.id}>
                    <Link
                      href={`/app/activities/workouts/${t.id}`}
                      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
                      aria-label={`Abrir treino ${t.title}`}
                    >
                      <Card className="group cursor-pointer transition hover:shadow-sm">
                        <CardHeader className="flex-row items-center gap-3">
                          <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15">
                            <Dumbbell className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base group-hover:underline truncate">{t.title}</CardTitle>
                            <p className="text-xs text-muted-foreground truncate">
                              {subtitle}
                              {subtitle ? " • " : ""}
                              {workoutsCount} {workoutsCount === 1 ? "treino" : "treinos"}
                            </p>
                            {t.idProfessional != null && (
                              <span className="inline-flex items-center gap-1 mt-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-600 dark:text-violet-400">
                                <UserCheck className="h-3 w-3" />
                                Profissional
                              </span>
                            )}
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
        <Link href="/app/activities/workouts/new" aria-label="Criar novo treino">
          <Plus className="h-6 w-6" />
        </Link>
      </Button>
    </div>
  );
}
