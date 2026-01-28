"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";
import {
  ArrowLeft,
  Dumbbell,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type ExerciseItem = {
  id: number;
  name: string;
  muscleGroup: string;
  equipment: string;
  difficultyLevel: string;
  type: string;
  description?: string | null;
  videoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

type ExercisesResponse = {
  items: ExerciseItem[];
  total: number;
  page: number;
  pageSize: number;
};

const inputBase =
  "w-full max-w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40";

function compactLine(parts: Array<string | null | undefined>) {
  return parts.filter((p) => (p ?? "").toString().trim().length > 0).join(" • ");
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-xs text-muted-foreground">
      {children}
    </span>
  );
}

export default function ExercisesListPage() {
  const router = useRouter();

  // ✅ NÃO VAI MAIS PARA A URL
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10); // se quiser manter fixo
  // se quiser permitir trocar, use setPageSize e um select, mas sem sync na URL

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<ExercisesResponse | null>(null);

  const [query, setQuery] = useState("");

  const totalPages = useMemo(() => {
    const total = data?.total ?? 0;
    return Math.max(1, Math.ceil(total / pageSize));
  }, [data?.total, pageSize]);


  const filteredItems = useMemo(() => {
    const list = data?.items ?? []; // <- variável local
    const q = query.trim().toLowerCase();

    if (!q) return list;

    return list.filter((it) => {
      const hay = [
        it.name,
        it.muscleGroup,
        it.equipment,
        it.difficultyLevel,
        it.type,
        it.description ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [data?.items, query]);

  async function fetchExercises(targetPage: number, targetPageSize: number) {
    setLoading(true);
    setErr(null);

    try {
      const res = await api.get<ExercisesResponse>("/exercise", {
        // ✅ params vão só na REQUISIÇÃO, não na URL do front
        params: { page: targetPage, pageSize: targetPageSize },
      });

      setData(res.data);

      const tp = Math.max(1, Math.ceil((res.data.total ?? 0) / targetPageSize));
      if (res.data.page > tp) setPage(tp);
      if (res.data.page < 1) setPage(1);
    } catch (e) {
      if (isAxiosError(e)) setErr(e.response?.data?.message || e.message || "Falha ao carregar exercícios");
      else setErr("Falha ao carregar exercícios");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchExercises(page, pageSize);
  }, [page, pageSize]);

  function openDetails(id: number) {
    router.push(`/admin/exercises/${id}`);
  }

  const pageMeta = compactLine([
    data?.total != null ? `${data.total} no total` : null,
    `Página ${page} de ${totalPages}`,
  ]);

  return (
    <div className="min-h-svh bg-background text-foreground overflow-x-hidden">
      <div className="mx-auto w-full max-w-6xl px-3 sm:px-4 py-5 sm:py-6 pb-28">
        {/* Top bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <Button variant="outline" className="bg-card cursor-pointer" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          <Button className="cursor-pointer" onClick={() => router.push("/admin/exercises/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Novo exercício
          </Button>
        </div>

        {/* Header */}
        <div className="mb-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              Catálogo de exercícios
            </h1>
            <p className="text-sm text-muted-foreground">{pageMeta || "—"}</p>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-3 lg:grid-cols-[320px_1fr]">
            <Card className="overflow-hidden">
              <CardHeader className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-56" />
              </CardHeader>
              <CardContent className="grid gap-3">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="space-y-2">
                <Skeleton className="h-5 w-52" />
                <Skeleton className="h-3 w-72" />
              </CardHeader>
              <CardContent className="grid gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                ))}
              </CardContent>
            </Card>
          </div>
        ) : err ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {err}
            <div className="mt-2">
              <Button size="sm" variant="outline" onClick={() => fetchExercises(page, pageSize)}>
                Tentar novamente
              </Button>
            </div>
          </div>
        ) : !data ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5" />
                Não foi possível carregar
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Tente novamente.</CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-[320px_1fr]">
            {/* Sidebar */}
            <Card className="overflow-hidden h-fit lg:sticky lg:top-4">
              <div className="bg-primary/10 px-4 py-4 border-b border-border/60">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  Filtros
                </h2>
                <p className="text-xs text-muted-foreground">Filtra apenas os itens da página atual.</p>
              </div>

              <CardContent className="p-4 grid gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Buscar</label>
                  <div className="relative mt-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className={`${inputBase} pl-9`}
                      placeholder="Nome, grupo, equipamento..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lista */}
            <Card className="overflow-hidden">
              <div className="bg-card px-4 sm:px-6 py-4 border-b border-border/60">
                <h2 className="text-sm font-semibold">Lista de Exercícios</h2>
                <p className="text-xs text-muted-foreground">Clique em um item para abrir os detalhes.</p>
              </div>

              <CardContent className="p-3 sm:p-4">
                {filteredItems.length === 0 ? (
                  <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
                    Nenhum exercício encontrado nesta página.
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {filteredItems.map((it) => {
                      const meta = compactLine([it.muscleGroup, it.equipment, it.difficultyLevel, it.type]);

                      return (
                        <div
                          key={it.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => openDetails(it.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") openDetails(it.id);
                          }}
                          className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card px-4 py-3 outline-none transition hover:bg-muted/20 focus:ring-2 focus:ring-ring/40 cursor-pointer"
                        >
                          <div className="absolute left-0 top-0 h-full w-1 bg-primary/50 group-hover:bg-primary/70" />

                          <div className="pl-2">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                
                                <p className="text-sm font-semibold truncate">
                                  {it.name} <span className="text-xs text-muted-foreground"></span>
                                </p>

                                <p className="mt-1 text-xs text-muted-foreground truncate">{meta || "—"}</p>

                                {it.description ? (
                                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{it.description}</p>
                                ) : null}
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <Chip>{it.muscleGroup}</Chip>
                                {it.videoUrl ? <Chip>vídeo</Chip> : <Chip>sem vídeo</Chip>}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Paginação (não mexe na URL) */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/20 px-3 py-3">
                  <p className="text-xs text-muted-foreground">
                    Total no catálogo: <b>{data.total}</b>
                  </p>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="bg-card cursor-pointer"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <span className="text-xs text-muted-foreground">
                      Página <b>{page}</b> de <b>{totalPages}</b>
                    </span>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="bg-card cursor-pointer"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
