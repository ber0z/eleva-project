// app/admin/page.tsx  (ou app/admin/dashboard/page.tsx)
"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Activity, TrendingUp, RefreshCw, Calendar as CalendarIcon } from "lucide-react";

type DashboardReport = {
  totalUsers: number;
  newUsers: { count: number };
  activeUsers: { count: number };
};

type QuickKey = "day" | "7d" | "30d" | "90d" | "month";

export default function AdminDashboardPage() {
  // datas visíveis no formulário
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");

  // datas efetivas (enviadas à API)
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // qual atalho está ativo (para estilizar botão)
  const [activeQuick, setActiveQuick] = useState<QuickKey | null>("day");

  const [data, setData] = useState<DashboardReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);

  // inicial: HOJE
  useEffect(() => {
    const { from: f, to: t } = rangeQuick("day");
    setFromInput(f);
    setToInput(t);
    setFrom(f);
    setTo(t);
    setActiveQuick("day");
  }, []);

  async function load(reportFrom = from, reportTo = to) {
    if (!reportFrom || !reportTo) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await api.get<DashboardReport>("/report/dashboard", {
        params: { from: reportFrom, to: reportTo },
      });
      setData(res.data);
    } catch (error) {
      setData(null);
      if (isAxiosError(error)) {
        setErr(error.response?.data?.message || error.message || "Falha ao carregar dashboard");
      } else {
        setErr("Falha ao carregar dashboard");
      }
    } finally {
      setLoading(false);
    }
  }

  // carrega quando período efetivo mudar
  useEffect(() => {
    if (from && to) load(from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  // aplicar datas digitadas manualmente
  function onApply() {
    const msg = validateDates(fromInput, toInput);
    if (msg) {
      setFormErr(msg);
      return;
    }
    setFormErr(null);
    setFrom(fromInput);
    setTo(toInput);
    setActiveQuick(null); // range manual, nenhum atalho ativo
  }

  // atalhos rápidos
  function applyQuick(k: QuickKey) {
    const r = rangeQuick(k);
    setFromInput(r.from);
    setToInput(r.to);
    setFormErr(null);
    setFrom(r.from);
    setTo(r.to);
    setActiveQuick(k);
  }

  const periodLabel = useMemo(
    () => (from && to ? `${fmtDateBR(from)} — ${fmtDateBR(to)}` : "—"),
    [from, to]
  );

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        {/* Topbar com controle de datas */}
        <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Período aplicado: {periodLabel}</p>
          </div>

          <div className="rounded-xl border p-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div>
                <Label htmlFor="from">De</Label>
                <div className="relative">
                  <CalendarIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="from"
                    type="date"
                    value={fromInput}
                    max={todayYMD()}
                    onChange={(e) => setFromInput(e.target.value)}
                    className="mt-1 h-10 rounded-xl pr-9"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="to">Até</Label>
                <div className="relative">
                  <CalendarIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="to"
                    type="date"
                    value={toInput}
                    max={todayYMD()}
                    onChange={(e) => setToInput(e.target.value)}
                    className="mt-1 h-10 rounded-xl pr-9"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant={activeQuick === "day" ? "default" : "outline"}
                  onClick={() => applyQuick("day")}
                  className="h-10"
                >
                  Hoje
                </Button>
                <Button
                  variant={activeQuick === "7d" ? "default" : "outline"}
                  onClick={() => applyQuick("7d")}
                  className="h-10"
                >
                  7d
                </Button>
                <Button
                  variant={activeQuick === "30d" ? "default" : "outline"}
                  onClick={() => applyQuick("30d")}
                  className="h-10"
                >
                  30d
                </Button>
                <Button
                  variant={activeQuick === "90d" ? "default" : "outline"}
                  onClick={() => applyQuick("90d")}
                  className="h-10"
                >
                  90d
                </Button>
                <Button
                  variant={activeQuick === "month" ? "default" : "outline"}
                  onClick={() => applyQuick("month")}
                  className="h-10"
                >
                  Este mês
                </Button>

                <Button onClick={onApply} className="h-10">
                  Aplicar
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => load()}
                  disabled={loading}
                  className="h-10 w-10"
                  aria-label="Recarregar"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {formErr && <div className="mt-2 text-xs text-destructive">{formErr}</div>}
          </div>
        </div>

        {/* Erro */}
        {err && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Erro</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-destructive">{err}</CardContent>
          </Card>
        )}

        {/* KPIs */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            title="usuários totais"
            icon={<Users className="h-5 w-5 text-primary" />}
            value={data?.totalUsers}
            loading={loading}
          />
          <KpiCard
            title="novos usuários"
            icon={<TrendingUp className="h-5 w-5 text-primary" />}
            value={data?.newUsers?.count}
            loading={loading}
          />
          <KpiCard
            title="usuarios ativos"
            icon={<Activity className="h-5 w-5 text-primary" />}
            value={data?.activeUsers?.count}
            loading={loading}
          />
        </section>
      </div>
    </div>
  );
}

/* ----------------- Componentes ----------------- */

function KpiCard({
  title,
  icon,
  value,
  loading,
}: {
  title: string;
  icon: React.ReactNode;
  value?: number;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>{title}</span>
          {icon}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24 rounded-xl" />
        ) : (
          <div className="text-2xl font-bold">{formatNumber(value ?? 0)}</div>
        )}
      </CardContent>
    </Card>
  );
}

/* ----------------- Utils ----------------- */

function formatNumber(n: number) {
  return new Intl.NumberFormat("pt-BR").format(n);
}

function todayYMD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function toDateYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function fmtDateBR(ymd: string) {
  try {
    const [y, m, d] = ymd.split("-");
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return ymd;
  }
}

function validateDates(from: string, to: string) {
  if (!from || !to) return "Preencha as duas datas.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to))
    return "Datas inválidas.";
  if (from > to) return "A data inicial não pode ser maior que a final.";
  if (to > todayYMD()) return "A data final não pode ser no futuro.";
  return null;
}

function rangeQuick(k: QuickKey) {
  const now = new Date();
  const end = toDateYMD(now);

  if (k === "day") {
    // somente hoje
    return { from: end, to: end };
  }

  if (k === "month") {
    // primeiro dia do mês até hoje
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: toDateYMD(first), to: end };
  }

  const back = k === "7d" ? 6 : k === "30d" ? 29 : 89; // inclui hoje
  const start = new Date(now);
  start.setDate(start.getDate() - back);
  return { from: toDateYMD(start), to: end };
}
