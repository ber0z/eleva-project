"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";
import {
  Plus,
  RefreshCw,
  ChartColumn,
  SlidersHorizontal,
  X,
  Dumbbell,
  HeartPulse,
  Trophy,
  Accessibility,
  Flower2,
  Bandage,
  Shapes,
  ListChecks,
  Clock,
  Gauge,
  Flame,
  Zap,
  CalendarDays,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

/* ===================== Types ===================== */

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

function typeLabel(t: string) {
  const found = ACTIVITY_TYPES.find((x) => x.value === t);
  return found ? found.label : t;
}

type PhysicalActivity = {
  id: number;
  idUser: number;
  name: string;
  type: string;
  duration: number; // minutos
  calories: number | null;
  observations?: string | null;
  date: string; // ISO
  createdAt: string;
  updatedAt: string;
};

type ActivitiesResponse = {
  items: PhysicalActivity[];
  total: number;
  page: number;
  pageSize: number;
};

type Insight = {
  key: string;
  label: string;
  value: string | number;
  unit?: string;
  extra?: unknown;
};

type ActivitiesStatsResponse = {
  dateFrom: string;
  dateTo: string;
  groupBy: "day" | "week" | "month";
  typeFilter: ActivityType | null;
  totals: {
    totalRecords: number;
    totalDurationMin: number;
    totalCalories: number;
    avgDurationMin: number;
    avgCalories: number;
  };
  series: Array<{
    bucket: string;
    count: number;
    durationMin: number;
    calories: number;
  }>;
  byType: Array<{
    type: ActivityType;
    count: number;
    durationMin: number;
    calories: number;
    percent: number;
  }>;
  byWeekday: Array<{
    weekday: number;
    label: string;
    count: number;
    durationMin: number;
  }>;
  byHour: Array<{
    hour: number;
    count: number;
    durationMin: number;
  }>;
  topActivities: Array<{
    id: number;
    name: string;
    type: ActivityType;
    date: string;
    duration: number;
    calories: number;
  }>;
  insights: Insight[];
};

const TYPE_ICON: Record<ActivityType, LucideIcon> = {
  strength: Dumbbell,
  cardio: HeartPulse,
  sports: Trophy,
  mobility: Accessibility,
  yoga_pilates: Flower2,
  recovery: Bandage,
  other: Shapes,
};

function asActivityType(t: string): ActivityType | null {
  return (ACTIVITY_TYPES as Array<{ value: string }>).some((x) => x.value === t)
    ? (t as ActivityType)
    : null;
}

const PAGE_SIZE = 10;

/* ===================== Utils ===================== */

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

function fmtDuration(mins?: number | null) {
  if (typeof mins !== "number" || !Number.isFinite(mins)) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m} min`;
}

function todayYMD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ✅ semana atual começando na segunda-feira
function startOfWeekYMD() {
  const d = new Date();
  const day = d.getDay(); // 0 dom, 1 seg...
  const diff = (day + 6) % 7; // quantos dias voltar até segunda
  d.setDate(d.getDate() - diff);

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function formatDias(value: unknown) {
  const n = Number(String(value ?? "").trim());
  if (!Number.isFinite(n)) return String(value ?? "—");
  const i = Math.trunc(n);
  return `${i} ${i === 1 ? "dia" : "dias"}`;
}

function bucketLabel(bucket: string, groupBy: "day" | "week" | "month") {
  if (groupBy === "day" && bucket.length >= 10) return `${bucket.slice(8, 10)}/${bucket.slice(5, 7)}`;
  if (groupBy === "month" && bucket.length >= 7) return `${bucket.slice(5, 7)}/${bucket.slice(0, 4)}`;
  if (groupBy === "week" && bucket.length >= 10) return `Sem ${bucket.slice(8, 10)}/${bucket.slice(5, 7)}`;
  return bucket;
}

function formatDateFromYMD(value: unknown, yearDigits: 2 | 4 = 4) {
  const s = String(value ?? "").trim();
  if (!s) return "—";

  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s;

  const yyyy = m[1];
  const mm = m[2];
  const dd = m[3];

  const y = yearDigits === 2 ? yyyy.slice(-2) : yyyy;
  return `${dd}-${mm}-${y}`;
}

// cores fixas por tipo
const TYPE_COLORS: Record<ActivityType, string> = {
  strength: "#2ECC71",
  cardio: "#2D9CDB",
  sports: "#F2C94C",
  mobility: "#9B51E0",
  yoga_pilates: "#56CCF2",
  recovery: "#F2994A",
  other: "#EB5757",
};

/* ===================== UI helpers (KPIs + Insights) ===================== */

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-xl bg-card border border-border/70 p-3 shadow-sm transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground">{label}</p>
          <p className="mt-1 text-lg font-semibold leading-none tracking-tight">{value}</p>
          {sub ? <p className="mt-2 text-xs text-muted-foreground">{sub}</p> : null}
        </div>

        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted/70">
          <Icon className="h-4 w-4 text-foreground/80" />
        </div>
      </div>
    </div>
  );
}

function InsightsRow({
  streak,
  bestDay,
}: {
  streak: Insight | null;
  bestDay: Insight | null;
}) {
  if (!streak && !bestDay) return null;

  const streakValue = streak ? formatDias(streak.value) : null;
  // ✅ 22-01-26 (ano 2 dígitos)
  const bestDayValue = bestDay ? formatDateFromYMD(bestDay.value, 2) : null;

  return (
    <div className="rounded-xl bg-card border border-border/70 px-3 py-2 shadow-sm">
      {/* ✅ mesma linha: deixa streak truncar e mantém a data inteira visível */}
      <div className="flex items-center gap-3 flex-nowrap">
        {streak ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted/70">
              <Zap className="h-4 w-4 text-foreground/80" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground leading-tight">{streak.label}</p>
              <p className="text-sm font-semibold truncate">{streakValue}</p>
            </div>
          </div>
        ) : null}

        {streak && bestDay ? <div className="h-8 w-px bg-border/40 shrink-0" /> : null}

        {bestDay ? (
          <div className="flex shrink-0 items-center gap-2">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted/70">
              <CalendarDays className="h-4 w-4 text-foreground/80" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground leading-tight">{bestDay.label}</p>
              {/* ✅ não corta no mobile */}
              <p className="text-sm font-semibold whitespace-nowrap tabular-nums">{bestDayValue}</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ===================== Page ===================== */

export default function PhysicalActivitiesPage() {
  // ===== histórico (lista) =====
  const [items, setItems] = useState<PhysicalActivity[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState<number | null>(null);

  // ✅ histórico só carrega quando usuário clicar
  const [historyEnabled, setHistoryEnabled] = useState(false);

  // ✅ como não carregamos no mount, começa falso
  const [initialLoading, setInitialLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const hasMore = useMemo(() => {
    if (!historyEnabled) return false;
    if (!totalPages) return false;
    return page < totalPages;
  }, [historyEnabled, page, totalPages]);

  async function fetchPage(targetPage: number, reset = false) {
    const isFirst = targetPage === 1;

    if (isFirst) {
      setInitialLoading(true);
      if (reset) setErr(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const params: Record<string, number> = { page: targetPage, pageSize: PAGE_SIZE };
      const { data } = await api.get<ActivitiesResponse>("/physical-activities", { params });

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
        setErr(error.response?.data?.message || error.message || "Falha ao carregar atividades");
      } else {
        setErr("Falha ao carregar atividades");
      }
    } finally {
      setInitialLoading(false);
      setLoadingMore(false);
    }
  }

  function enableHistory() {
    if (historyEnabled) return;
    setHistoryEnabled(true);

    // reset
    setItems([]);
    setPage(1);
    setTotalPages(null);
    setErr(null);

    void fetchPage(1, true);
  }

  // ✅ infinite scroll só quando histórico estiver habilitado
  useEffect(() => {
    if (!historyEnabled) return;

    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !loadingMore && !initialLoading) {
          void fetchPage(page + 1);
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

  // ===== stats =====
  const [statsFiltersOpen, setStatsFiltersOpen] = useState(false);

  const [statsFrom, setStatsFrom] = useState<string>(() => startOfWeekYMD());
  const [statsTo, setStatsTo] = useState<string>(() => todayYMD());

  const defaultWeekFromRef = useRef<string>(startOfWeekYMD());
  const defaultWeekToRef = useRef<string>(todayYMD());

  const isDefaultWeekRange = useMemo(() => {
    return statsFrom === defaultWeekFromRef.current && statsTo === defaultWeekToRef.current;
  }, [statsFrom, statsTo]);

  const [statsGroupBy, setStatsGroupBy] = useState<ActivitiesStatsResponse["groupBy"]>("day");
  const [statsType, setStatsType] = useState<ActivityType | "">("");
  const [statsTop, setStatsTop] = useState<string>("3");

  const [statsLoading, setStatsLoading] = useState(true);
  const [statsErr, setStatsErr] = useState<string | null>(null);
  const [stats, setStats] = useState<ActivitiesStatsResponse | null>(null);

  const canFetchStats = useMemo(() => {
    if (!statsFrom || !statsTo) return false;
    if (statsFrom > statsTo) return false;
    const topN = statsTop.trim() ? Number(statsTop) : NaN;
    if (statsTop.trim() && (!Number.isFinite(topN) || topN <= 0)) return false;
    return true;
  }, [statsFrom, statsTo, statsTop]);

  async function fetchStats() {
    setStatsLoading(true);
    setStatsErr(null);

    try {
      const params: Record<string, string | number> = {
        dateFrom: statsFrom,
        dateTo: statsTo,
      };

      if (statsGroupBy) params.groupBy = statsGroupBy;
      if (statsType) params.type = statsType;
      if (statsTop.trim()) params.top = Number(statsTop);

      const { data } = await api.get<ActivitiesStatsResponse>("/physical-activities/stats", { params });
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

  useEffect(() => {
    void fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasStatsData = useMemo(() => {
    if (!stats) return false;
    return (stats.totals?.totalRecords ?? 0) > 0;
  }, [stats]);

  const seriesChart = useMemo(() => {
    const s = stats?.series ?? [];
    const gb = stats?.groupBy ?? "day";
    return s.map((x) => ({ ...x, xLabel: bucketLabel(x.bucket, gb) }));
  }, [stats]);

  const donutData = useMemo(() => {
    const list = stats?.byType ?? [];
    return list
      .slice()
      .sort((a, b) => b.percent - a.percent)
      .map((x) => ({
        key: x.type,
        name: typeLabel(x.type),
        value: x.percent,
        count: x.count,
      }));
  }, [stats]);

  const streak = useMemo(() => {
    return stats?.insights?.find((i) => i.key === "streak_current") ?? null;
  }, [stats]);

  const bestDay = useMemo(() => {
    return stats?.insights?.find((i) => i.key === "best_day") ?? null;
  }, [stats]);


  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-28">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">Atividades físicas</h1>
          </div>

      
        </div>

        {/* ===== Stats Card ===== */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <ChartColumn className="h-5 w-5" />
                Estatísticas
              </CardTitle>

              <Button
                variant="outline"
                size="sm"
                className="bg-yellow-500/5 border-yellow-500/15 text-yellow-500/40 hover:bg-yellow-500/10 hover:text-yellow-500/60 cursor-pointer"
                onClick={() => setStatsFiltersOpen((v) => !v)}
                disabled={statsLoading}
              >
                {statsFiltersOpen ? <X className="mr-2 h-4 w-4" /> : <SlidersHorizontal className="mr-2 h-4 w-4" />}
                {statsFiltersOpen ? "Fechar" : "Filtros"}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {statsFiltersOpen ? (
              <div className="rounded-xl border border-border/30 bg-card/60 p-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs text-muted-foreground">De</label>
                    <input
                      type="date"
                      value={statsFrom}
                      onChange={(e) => setStatsFrom(e.target.value)}
                      className="w-full rounded-md border border-border/30 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                      disabled={statsLoading}
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs text-muted-foreground">Até</label>
                    <input
                      type="date"
                      value={statsTo}
                      onChange={(e) => setStatsTo(e.target.value)}
                      className="w-full rounded-md border border-border/30 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                      disabled={statsLoading}
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="bg-card cursor-pointer"
                    disabled={!canFetchStats || statsLoading}
                    onClick={() => void fetchStats()}
                    title={!canFetchStats ? "Verifique as datas" : "Aplicar"}
                  >
                    {statsLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Aplicar
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Agrupar</label>
                    <select
                      value={statsGroupBy}
                      onChange={(e) => setStatsGroupBy(e.target.value as ActivitiesStatsResponse["groupBy"])}
                      className="w-full rounded-md border border-border/30 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                      disabled={statsLoading}
                    >
                      <option value="day">Dia</option>
                      <option value="week">Semana</option>
                      <option value="month">Mês</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Tipo (opcional)</label>
                    <select
                      value={statsType}
                      onChange={(e) => setStatsType(e.target.value as ActivityType | "")}
                      className="w-full rounded-md border border-border/30 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                      disabled={statsLoading}
                    >
                      <option value="">Todos</option>
                      {ACTIVITY_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Top atividades (opcional)</label>
                    <input
                      type="number"
                      min={1}
                      value={statsTop}
                      onChange={(e) => setStatsTop(e.target.value)}
                      className="w-full rounded-md border border-border/30 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                      disabled={statsLoading}
                      placeholder="15"
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {statsErr ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {statsErr}
              </div>
            ) : statsLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : stats && !hasStatsData ? (
              isDefaultWeekRange ? (
                <div className="rounded-xl border border-border/30 bg-muted/20 p-4">
                  <div className="text-sm font-medium">Nenhuma atividade nesta semana ainda</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Assim que você registrar uma atividade, suas estatísticas semanais vão aparecer aqui.
                  </div>

                  <div className="mt-4">
                    <Button asChild>
                      <Link href="/app/activities/physical/new">Registrar atividade</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-border/30 bg-muted/20 p-4">
                  <div className="text-sm font-medium">Sem dados no período</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Não encontramos atividades entre <b>{fmtDateShort(statsFrom)}</b> e <b>{fmtDateShort(statsTo)}</b>.
                    Ajuste as datas nos filtros para ver estatísticas.
                  </div>
                </div>
              )
            ) : stats ? (
              <>
                {/* KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <KpiCard label="Registros" value={String(stats.totals.totalRecords)} icon={ListChecks} />
                  <KpiCard label="Tempo total" value={fmtDuration(stats.totals.totalDurationMin)} icon={Clock} />
                  <KpiCard label="Média" value={fmtDuration(Math.round(stats.totals.avgDurationMin))} icon={Gauge} />
                  <KpiCard label="Calorias" value={`${stats.totals.totalCalories} kcal`} icon={Flame} />
                </div>

                <InsightsRow streak={streak} bestDay={bestDay} />

                {/* charts (mantidos como estavam) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border/30 bg-card/60 p-3">
                    <div className="mb-2 text-xs text-muted-foreground">
                      Tempo por {stats.groupBy === "day" ? "dia" : stats.groupBy === "week" ? "semana" : "mês"} (min)
                    </div>
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={seriesChart}>
                          <XAxis dataKey="xLabel" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <RTooltip
                            formatter={(value: unknown, name?: string) => {
                              const key = name ?? "";
                              if (key === "durationMin") return [`${value} min`, "Duração"];
                              if (key === "count") return [String(value), "Registros"];
                              if (key === "calories") return [String(value), "Calorias"];
                              return [String(value), key || "Valor"];
                            }}
                          />
                          <Bar dataKey="durationMin" name="durationMin" fill="#3467eb" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/30 bg-card/60 p-3">
                    <div className="mb-2 text-xs text-muted-foreground">Distribuição por tipo</div>
                    {donutData.length === 0 ? (
                      <div className="text-sm text-muted-foreground">Sem dados.</div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                        <div className="h-56 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
                              <Pie
                                data={donutData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={52}
                                outerRadius={78}
                                paddingAngle={2}
                                stroke="transparent"
                              >
                                {donutData.map((d) => (
                                  <Cell key={d.key} fill={TYPE_COLORS[d.key as ActivityType] ?? "#999"} />
                                ))}
                              </Pie>

                              <RTooltip
                                formatter={(
                                  value: unknown,
                                  _name?: string,
                                  props?: { payload?: { count?: number; name?: string } }
                                ) => {
                                  const v = Number(value ?? 0);
                                  const c = props?.payload?.count ?? 0;
                                  return [`${v.toFixed(0)}% • ${c}x`, props?.payload?.name ?? "Tipo"];
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="space-y-2">
                          {donutData.map((d) => (
                            <div key={d.key} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{ background: TYPE_COLORS[d.key as ActivityType] ?? "#999" }}
                                />
                                <span className="text-muted-foreground truncate">{d.name}</span>
                              </div>
                              <span className="font-medium">{d.value}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Top atividades */}
                <div className="rounded-xl border border-border/30 bg-muted/10 p-3">
                  <div className="text-xs text-muted-foreground mb-2">Top atividades (mais longas)</div>

                  {stats.topActivities?.length ? (
                    <ul className="space-y-2">
                      {stats.topActivities
                        .slice(0, Math.min(stats.topActivities.length, Number(statsTop) || 5))
                        .map((t) => (
                          <li key={t.id} className="rounded-lg border border-border/30 bg-background px-3 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate">{t.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {fmtDateShort(t.date)} • {typeLabel(t.type)} • {fmtDuration(t.duration)}
                                  {typeof t.calories === "number" && t.calories > 0 ? ` • ${t.calories} kcal` : ""}
                                </div>
                              </div>

                              <Link
                                href={`/app/activities/physical/${t.id}`}
                                className="text-xs text-primary underline underline-offset-2 shrink-0"
                              >
                                Abrir
                              </Link>
                            </div>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <div className="text-sm text-muted-foreground">Sem registros no período.</div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Sem dados.</div>
            )}
          </CardContent>
        </Card>

        {/* ===== Histórico ===== */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-sm font-semibold">Histórico de atividades</div>

          {!historyEnabled ? (
            <Button variant="outline" size="sm" className="bg-card cursor-pointer" onClick={enableHistory}>
              Exibir histórico
            </Button>
          ) : null}
        </div>

        {!historyEnabled ? (
         <></>
        ) : (
          <>
            {/* Erro */}
            {err && !initialLoading && (
              <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {err}
                <div className="mt-2">
                  <Button size="sm" variant="outline" onClick={() => fetchPage(1, true)}>
                    Tentar novamente
                  </Button>
                </div>
              </div>
            )}

            {/* Lista */}
            {initialLoading ? (
              <div className="grid gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="flex-row items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-44" />
                        <Skeleton className="mt-2 h-3 w-40" />
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : sortedItems.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Dumbbell className="h-5 w-5" />
                    Sem atividades ainda
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Registre sua primeira atividade para acompanhar duração e calorias.
                  <div className="mt-4">
                    <Button asChild>
                      <Link href="/app/activities/physical/new">Registrar atividade</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <ul className="grid gap-3">
                  {sortedItems.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={`/app/activities/physical/${a.id}`}
                        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
                        aria-label={`Abrir atividade ${a.name}`}
                      >
                        <Card className="group cursor-pointer transition hover:shadow-sm">
                          <CardHeader className="flex-row items-center gap-3">
                            {(() => {
                              const t = asActivityType(a.type);
                              const Icon = t ? TYPE_ICON[t] : Dumbbell;
                              return (
                                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15">
                                  <Icon className="h-5 w-5 text-primary" />
                                </div>
                              );
                            })()}

                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base truncate group-hover:underline">{a.name}</CardTitle>
                              <p className="text-xs text-muted-foreground">
                                {fmtDateShort(a.date)} • {typeLabel(a.type)} • {fmtDuration(a.duration)}
                                {typeof a.calories === "number" && a.calories > 0 ? ` • ${a.calories} kcal` : ""}
                              </p>
                            </div>
                          </CardHeader>
                        </Card>
                      </Link>
                    </li>
                  ))}
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
      <Button asChild size="icon" className="fixed bottom-28 md:bottom-6 right-6 h-14 w-14 rounded-full shadow-lg">
        <Link href="/app/activities/physical/new" aria-label="Registrar atividade">
          <Plus className="h-6 w-6" />
        </Link>
      </Button>
    </div>
  );
}
