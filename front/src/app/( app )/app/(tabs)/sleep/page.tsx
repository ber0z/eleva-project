"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";
import { Plus, Moon, RefreshCw, ChartColumn } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

type SleepQuality = "excellent" | "good" | "average" | "poor" | "very_poor";

type Sleep = {
  id: number;
  idUser: number;
  date: string; // ISO
  startTime: string;
  endTime: string;
  duration?: number | null; // horas decimais
  sleepQuality: SleepQuality;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type SleepListResponse = {
  items: Sleep[];
  total: number;
  page: number;
  pageSize: number;
};

type SleepStatsResponse = {
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
  avgSleepHours: number; // horas
  totalRecords: number;
  quality: {
    totalRated: number;
    unknown: number;
    count: Record<SleepQuality, number>;
    percent: Record<SleepQuality, number>;
  };
};

const PAGE_SIZE = 10;

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

function formatYMD(ymd: string) {
  try {
    const [y, m, d] = ymd.split("-").map(Number);
    const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "UTC",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(dt);
  } catch {
    return ymd;
  }
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

function fmtDurationHours(duration?: number | null) {
  if (typeof duration !== "number" || !Number.isFinite(duration)) return null;
  const totalMinutes = Math.round(duration * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfWeekMonday(d: Date) {
  const x = new Date(d);
  const day = x.getDay(); // 0 dom .. 6 sab
  const diff = (day + 6) % 7; // seg=0 ... dom=6
  x.setDate(x.getDate() - diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function getThisWeekRange() {
  const today = new Date();
  return {
    from: toYMD(startOfWeekMonday(today)),
    to: toYMD(today),
  };
}

function QualityDonutChart({
  percent,
  count,
  totalRated,
}: {
  percent: Record<SleepQuality, number>;
  count: Record<SleepQuality, number>;
  totalRated: number;
}) {
  const ORDER: SleepQuality[] = ["excellent", "good", "average", "poor", "very_poor"];

  const COLOR_BY_QUALITY: Record<SleepQuality, string> = {
    excellent: "#2ECC71",  // verde
    good: "#2D9CDB",       // azul
    average: "#F2C94C",    // amarelo
    poor: "#F2994A",       // laranja
    very_poor: "#EB5757",  // vermelho
  };

  const data = ORDER.map((q) => ({
    key: q,
    name: qualityLabel(q),
    value: Math.max(0, Number(percent?.[q] ?? 0)), // %
    count: Math.max(0, Number(count?.[q] ?? 0)),
    color: COLOR_BY_QUALITY[q],
  })).filter((d) => d.value > 0);

  if (!totalRated || totalRated <= 0) {
    return <div className="text-sm text-muted-foreground">Sem registros no período.</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={75}
              paddingAngle={2}
              stroke="transparent"
            >
              {data.map((entry) => (
                <Cell key={entry.key} fill={entry.color} />
              ))}
            </Pie>

            <Tooltip
              formatter={(value, _name, props) => {
                const v = Number(value ?? 0);
                const c = props?.payload?.count ?? 0;
                const label = props?.payload?.name ?? "Qualidade";
                return [`${v.toFixed(0)}% • ${c}x`, label];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        {ORDER.map((q) => {
          const p = Math.max(0, Number(percent?.[q] ?? 0));
          const c = Math.max(0, Number(count?.[q] ?? 0));
          return (
            <div key={q} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR_BY_QUALITY[q] }} />
                <span className="text-muted-foreground">{qualityLabel(q)}</span>
              </div>
              <span className="font-medium">
                {p.toFixed(0)}% • {c}x
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}


export default function SleepPage() {
  // ===== histórico (lista) =====
  const [items, setItems] = useState<Sleep[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState<number | null>(null);

  // agora o histórico começa DESLIGADO
  const [historyEnabled, setHistoryEnabled] = useState(false);

  // loading do histórico começa falso (não vamos buscar nada ao abrir)
  const [initialLoading, setInitialLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const hasMore = useMemo(() => {
    if (!historyEnabled) return false;
    if (!totalPages) return false;
    return page < totalPages;
  }, [historyEnabled, page, totalPages]);

  // ===== stats (semana atual + filtros ocultos) =====
  const initialWeek = getThisWeekRange();
  const [dateFrom, setDateFrom] = useState(() => initialWeek.from);
  const [dateTo, setDateTo] = useState(() => initialWeek.to);

  const [filtersOpen, setFiltersOpen] = useState(false);

  const canApplyStats = useMemo(() => {
    if (!dateFrom || !dateTo) return false;
    return dateFrom <= dateTo;
  }, [dateFrom, dateTo]);

  const [statsLoading, setStatsLoading] = useState(true);
  const [statsErr, setStatsErr] = useState<string | null>(null);
  const [stats, setStats] = useState<SleepStatsResponse | null>(null);

  async function fetchStats(override?: { dateFrom: string; dateTo: string }) {
    setStatsLoading(true);
    setStatsErr(null);

    const df = override?.dateFrom ?? dateFrom;
    const dt = override?.dateTo ?? dateTo;

    try {
      const { data } = await api.get<SleepStatsResponse>("/sleep/stats", {
        params: { dateFrom: df, dateTo: dt },
      });
      setStats(data);
    } catch (error) {
      if (isAxiosError(error)) {
        setStatsErr(error.response?.data?.message || error.message || "Falha ao carregar estatísticas");
      } else {
        setStatsErr("Falha ao carregar estatísticas");
      }
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }

  async function fetchPage(targetPage: number) {
    const isFirst = targetPage === 1;

    if (isFirst) {
      setInitialLoading(true);
      setErr(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const { data } = await api.get<SleepListResponse>("/sleep", {
        params: { page: targetPage, pageSize: PAGE_SIZE },
      });

      const tp = Math.max(1, Math.ceil((data.total ?? 0) / (data.pageSize ?? PAGE_SIZE)));

      setItems((prev) => {
        const merged = isFirst ? data.items : [...prev, ...data.items];
        const seen = new Set<number>();
        return merged.filter((it) => {
          if (seen.has(it.id)) return false;
          seen.add(it.id);
          return true;
        });
      });

      setPage(data.page);
      setTotalPages(tp);
      setErr(null);
    } catch (error) {
      if (isAxiosError(error)) {
        setErr(error.response?.data?.message || error.message || "Falha ao carregar registros de sono");
      } else {
        setErr("Falha ao carregar registros de sono");
      }
    } finally {
      setInitialLoading(false);
      setLoadingMore(false);
    }
  }

  // ✅ ao abrir a página: SOMENTE stats
  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ infinite scroll só quando histórico estiver habilitado
  useEffect(() => {
    if (!historyEnabled) return;

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
  }, [historyEnabled, hasMore, loadingMore, initialLoading, page]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [items]);

  const avgSleepLabel = useMemo(() => {
    const v = stats?.avgSleepHours;
    return typeof v === "number" && Number.isFinite(v) ? fmtDurationHours(v) ?? "—" : "—";
  }, [stats]);

  function enableHistory() {
    if (historyEnabled) return;
    setHistoryEnabled(true);
    // reset básico (caso já tenha usado antes)
    setItems([]);
    setPage(1);
    setTotalPages(null);
    // agora sim busca o histórico
    fetchPage(1);
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-28">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">Sono</h1>
          </div>

          <Button
            variant="outline"
            className="shrink-0 bg-card cursor-pointer"
            onClick={() => {
              fetchStats();
              if (historyEnabled) fetchPage(1);
            }}
            disabled={initialLoading || loadingMore || statsLoading}
            title="Atualizar"
          >
            <RefreshCw className={initialLoading || loadingMore || statsLoading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
            Atualizar
          </Button>
        </div>

        {/* ===== Card compacto: stats ===== */}
        <Card className="mb-4">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ChartColumn className="h-5 w-5" />
                Semana atual
              </CardTitle>

              <Button
                variant="outline"
                size="sm"
                className="bg-card cursor-pointer"
                onClick={() => setFiltersOpen((v) => !v)}
                disabled={statsLoading}
              >
                {filtersOpen ? "Fechar" : "Alterar período"}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-0 pb-3 space-y-3">
            {statsErr ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {statsErr}
              </div>
            ) : statsLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : stats ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2">
                <div className="text-xs text-muted-foreground">
                  {formatYMD(stats.dateFrom)} → {formatYMD(stats.dateTo)}
                </div>

                <div className="text-sm font-medium">
                  <span className="text-muted-foreground">Média:</span> {avgSleepLabel}
                  <span className="mx-2 text-muted-foreground">•</span>
                  <span className="text-muted-foreground">Registros:</span> {stats.totalRecords}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Sem dados.</div>
            )}

            {filtersOpen ? (
              <div className="rounded-xl border border-border bg-card/60 p-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Início</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                      disabled={statsLoading}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Fim</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                      disabled={statsLoading}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="bg-card cursor-pointer flex-1"
                      onClick={() => fetchStats()}
                      disabled={statsLoading || !canApplyStats}
                      title={!canApplyStats ? "Verifique as datas" : "Aplicar"}
                    >
                      {statsLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                      Aplicar
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="bg-card cursor-pointer"
                      onClick={() => {
                        const w = getThisWeekRange();
                        setDateFrom(w.from);
                        setDateTo(w.to);
                        fetchStats({ dateFrom: w.from, dateTo: w.to });
                      }}
                      disabled={statsLoading}
                      title="Semana atual"
                    >
                      Semana atual
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {stats && !statsLoading ? (
              <>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="text-sm text-muted-foreground">Qualidade do sono </div>
                </div>
                <div className="-mt-1">
                  <QualityDonutChart percent={stats.quality.percent} count={stats.quality.count} totalRated={stats.quality.totalRated} />
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        {/* ===== Histórico ===== */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-sm font-semibold">Histórico</div>

          {!historyEnabled ? (
            <Button variant="outline" size="sm" className="bg-card cursor-pointer" onClick={enableHistory}>
              Exibir histórico
            </Button>
          ) : null}
        </div>

        {/* ✅ se ainda não habilitou, não faz GET e mostra “anúncio” */}
        {!historyEnabled ? (
          <></>
        ) : (
          <>
            {/* Erro lista */}
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
                        <Skeleton className="mt-2 h-3 w-44" />
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : sortedItems.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Moon className="h-5 w-5" />
                    Sem registros de sono
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Registre seu sono para acompanhar qualidade e horários.
                  <div className="mt-4">
                    <Button asChild>
                      <Link href="/app/sleep/new">Registrar sono</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <ul className="grid gap-3">
                  {sortedItems.map((s) => {
                    const title = fmtDateShort(s.date);
                    const dur = fmtDurationHours(s.duration) ?? "—";
                    return (
                      <li key={s.id}>
                        <Link
                          href={`/app/sleep/${s.id}`}
                          className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
                          aria-label={`Abrir registro de sono de ${title}`}
                        >
                          <Card className="group cursor-pointer transition hover:shadow-sm">
                            <CardHeader className="flex-row items-center gap-3">
                              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15">
                                <Moon className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <CardTitle className="text-base group-hover:underline">{title}</CardTitle>
                                <p className="text-xs text-muted-foreground">
                                  {dur} • Qualidade: {qualityLabel(s.sleepQuality)}
                                </p>
                              </div>
                            </CardHeader>
                          </Card>
                        </Link>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-4 flex items-center justify-center">
                  {loadingMore && (
                    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Carregando mais...
                    </div>
                  )}
                </div>

                <div ref={sentinelRef} className="h-8 w-full" />
              </>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <Button asChild size="icon" className="fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-lg">
        <Link href="/app/sleep/new" aria-label="Registrar sono">
          <Plus className="h-6 w-6" />
        </Link>
      </Button>
    </div>
  );
}

