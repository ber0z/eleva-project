// app/(app)/app/diets/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";
import { Plus, FileText, RefreshCw } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Diet = {
  id: number;
  title: string;
  notes: string | null;
  date: string; // ISO
  createdAt: string;
  updatedAt: string;
};

type DietsResponse = {
  items: Diet[];
  total: number;
  page: number;
  pageSize: number;
};

const PAGE_SIZE = 10;

export default function DietsPage() {
  // list state
  const [items, setItems] = useState<Diet[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState<number | null>(null);

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


  const fetchPage = useCallback(async (targetPage: number) => {
  const isFirst = targetPage === 1;
  if (isFirst) {
    setInitialLoading(true);
    setErr(null);
  } else {
    setLoadingMore(true);
  }

  try {
    const { data } = await api.get<DietsResponse>("/diet", {
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
      setErr(error.response?.data?.message || error.message || "Falha ao carregar dietas");
    } else {
      setErr("Falha ao carregar dietas");
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


  return (
    <div className="min-h-svh bg-background text-foreground overflow-x-hidden">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-28">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">Dietas</h1>
            
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
                    <Skeleton className="mt-2 h-3 w-28" />
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Sem dietas ainda
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Crie sua primeira dieta para organizar suas refeições.
              <div className="mt-4">
                <Button asChild>
                  <Link href="/app/diets/plans/new">Criar dieta</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <ul className="grid gap-3 min-w-0">
              {items.map((d) => {
                const title = d.title?.trim() ? d.title : `Dieta #${d.id}`;
                const dateLabel = d.date ? formatDate(d.date) : "—";
                const subtitle = d.notes?.trim() ? d.notes.trim() : "Sem observações";

                return (
                  <li key={d.id} className="min-w-0">
                    <Link
                      href={`/app/diets/plans/${d.id}`}
                      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
                      aria-label={`Abrir dieta ${title}`}
                    >
                      <Card className="group cursor-pointer transition hover:shadow-sm">
                        <CardHeader className="flex-row items-center gap-3">
                          <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base group-hover:underline truncate">
                              {title}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground truncate">
                              {dateLabel} • {subtitle}
                            </p>
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
      <Button asChild size="icon" className="fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-lg">
        <Link href="/app/diets/plans/new" aria-label="Criar nova dieta">
          <Plus className="h-6 w-6" />
        </Link>
      </Button>
    </div>
  );
}
