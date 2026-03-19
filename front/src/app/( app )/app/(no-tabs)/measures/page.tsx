"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import Image, { type StaticImageData } from "next/image";
import type { LucideIcon } from "lucide-react";
import { Weight, BicepsFlexed, AlertTriangle, Plus, TrendingUp } from "lucide-react";

import thigh1 from "../../../../../../public/icones/thigh1.png";
import heightImg from "../../../../../../public/icones/height.png";
import waist from "../../../../../../public/icones/waist.png";
import chest from "../../../../../../public/icones/chest.png";
import hips from "../../../../../../public/icones/hips.png";
import shoulders from "../../../../../../public/icones/shoulders.png";
import calf from "../../../../../../public/icones/calf.png";
import forearm from "../../../../../../public/icones/forearm.png";

/* ===== Tipos ===== */
type Evolution = {
  id: number;
  idUser: number;
  date: string;
  goal: string;
  height: number | null;
  weight: number | null;
  rightBiceps: number | null;
  leftBiceps: number | null;
  rightThigh: number | null;
  leftThigh: number | null;
  waist: number | null;
  hips: number | null;
  chest: number | null;
  shoulder: number | null;
  rightCalf: number | null;
  leftCalf: number | null;
  rightForearm: number | null;
  leftForearm: number | null;
  message: string | null;
  createdAt: string;
  updatedAt: string;
};

type MetricKey = keyof Pick<
  Evolution,
  | "height" | "weight" | "rightBiceps" | "leftBiceps"
  | "rightThigh" | "leftThigh" | "waist" | "hips"
  | "chest" | "shoulder" | "rightCalf" | "leftCalf"
  | "rightForearm" | "leftForearm"
>;

type IconDef =
  | { kind: "lucide"; Icon: LucideIcon }
  | { kind: "image"; src: StaticImageData; alt?: string };

type MetricCfgItem = { label: string; unit: string; icon: IconDef };
type MetricCfg = Record<MetricKey, MetricCfgItem>;

/* ===== Config ===== */
const METRIC_CONFIG: MetricCfg = {
  height:        { label: "Altura",               unit: "cm", icon: { kind: "image",  src: heightImg, alt: "Altura" } },
  weight:        { label: "Peso",                 unit: "kg", icon: { kind: "lucide", Icon: Weight } },
  chest:         { label: "Peitoral",             unit: "cm", icon: { kind: "image",  src: chest, alt: "Peito" } },
  rightBiceps:   { label: "Bíceps direito",       unit: "cm", icon: { kind: "lucide", Icon: BicepsFlexed } },
  leftBiceps:    { label: "Bíceps esquerdo",      unit: "cm", icon: { kind: "lucide", Icon: BicepsFlexed } },
  rightThigh:    { label: "Coxa direita",         unit: "cm", icon: { kind: "image",  src: thigh1, alt: "Coxa" } },
  leftThigh:     { label: "Coxa esquerda",        unit: "cm", icon: { kind: "image",  src: thigh1, alt: "Coxa" } },
  waist:         { label: "Cintura",              unit: "cm", icon: { kind: "image",  src: waist, alt: "Cintura" } },
  hips:          { label: "Quadril",              unit: "cm", icon: { kind: "image",  src: hips, alt: "Quadril" } },
  shoulder:      { label: "Ombro",                unit: "cm", icon: { kind: "image",  src: shoulders, alt: "Ombro" } },
  rightCalf:     { label: "Panturrilha direita",  unit: "cm", icon: { kind: "image",  src: calf, alt: "Panturrilha" } },
  leftCalf:      { label: "Panturrilha esquerda", unit: "cm", icon: { kind: "image",  src: calf, alt: "Panturrilha" } },
  rightForearm:  { label: "Antebraço direito",    unit: "cm", icon: { kind: "image",  src: forearm, alt: "Antebraço" } },
  leftForearm:   { label: "Antebraço esquerdo",   unit: "cm", icon: { kind: "image",  src: forearm, alt: "Antebraço" } },
};

const PRIMARY_KEYS: Array<keyof typeof METRIC_CONFIG> = ["weight", "height"];

/* ===== Utils ===== */
const nf1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 });

function roundTo(v: number, decimals: number) {
  const p = 10 ** decimals;
  return Math.round((v + Number.EPSILON) * p) / p;
}

function formatVal(v: number | null | undefined, decimals = 1) {
  if (v === null || v === undefined || !Number.isFinite(v as number)) return "—";
  return nf1.format(roundTo(v as number, decimals));
}

function hasNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

const GOAL_LABEL: Record<string, string> = {
  gain_muscle:       "Ganhar massa muscular",
  lose_fat:          "Perder gordura",
  recomposition:     "Recomposição corporal",
  maintain:          "Manutenção",
  increase_strength: "Aumentar força",
  improve_endurance: "Melhorar resistência",
  improve_health:    "Melhorar saúde geral",
};

function formatGoal(goal?: string | null) {
  if (!goal) return "";
  const raw = String(goal).trim();
  const normalized = raw.toLowerCase().replace(/[\s-]+/g, "_");
  if (!raw.includes("_") && /[A-Za-zÀ-ÿ]/.test(raw) && raw.includes(" ")) return raw;
  return GOAL_LABEL[normalized] ?? raw;
}

function MetricIcon({ icon, size = 20 }: { icon: IconDef; size?: number }) {
  if (icon.kind === "lucide") {
    const Ico = icon.Icon;
    return <Ico style={{ width: size, height: size }} strokeWidth={2} aria-hidden />;
  }
  return (
    <Image
      src={icon.src}
      alt={icon.alt ?? ""}
      width={size}
      height={size}
      className="invert dark:invert-0 opacity-90"
      priority={false}
    />
  );
}

function SkeletonPrimary() {
  return (
    <div className="rounded-2xl border border-border/30 bg-muted/30 animate-pulse p-5 space-y-3">
      <div className="h-4 w-12 bg-muted rounded" />
      <div className="h-9 w-24 bg-muted rounded" />
      <div className="h-3 w-16 bg-muted rounded" />
    </div>
  );
}

function SkeletonSecondary() {
  return (
    <div className="rounded-xl border border-border/20 bg-muted/20 animate-pulse p-3 space-y-2">
      <div className="h-3 w-16 bg-muted rounded" />
      <div className="h-5 w-14 bg-muted rounded" />
    </div>
  );
}

/* ===== Página ===== */
export default function MeasuresPage() {
  const [data, setData] = useState<Evolution | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    api
      .get<Evolution[]>("/evolution/last", { withCredentials: true })
      .then((res) => {
        if (!mounted) return;
        setData(Array.isArray(res.data) ? (res.data[0] ?? null) : null);
        setErr(null);
      })
      .catch(() => {
        if (!mounted) return;
        setErr("Não foi possível carregar suas métricas agora.");
        setData(null);
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const dateStr = useMemo(() => {
    if (!data?.date) return "";
    try {
      return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(data.date));
    } catch { return ""; }
  }, [data]);

  const primary = useMemo(() => {
    if (!data) return [];
    return PRIMARY_KEYS
      .map((k) => ({ key: k, ...METRIC_CONFIG[k], value: data[k] as number | null }))
      .filter((m) => hasNumber(m.value));
  }, [data]);

  const secondary = useMemo(() => {
    if (!data) return [];
    return (Object.keys(METRIC_CONFIG) as Array<keyof typeof METRIC_CONFIG>)
      .filter((k) => !PRIMARY_KEYS.includes(k))
      .map((k) => ({ key: k, ...METRIC_CONFIG[k], value: data[k] as number | null }))
      .filter((m) => hasNumber(m.value));
  }, [data]);

  const hasAnyMetric = primary.length + secondary.length > 0;
  const goalLabel = data?.goal ? formatGoal(data.goal) : null;

  return (
    <section className="mx-auto max-w-5xl px-3 sm:px-4 lg:px-6 py-5 sm:py-8 space-y-6 sm:space-y-8">

      {/* ── Header ── */}
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Medidas corporais</h1>
          <p className="text-sm text-muted-foreground">
            {loading
              ? "Carregando…"
              : data
              ? <>Atualizado em <span className="font-medium text-foreground">{dateStr}</span></>
              : "Nenhuma evolução registrada ainda."}
          </p>
          {goalLabel && (
            <span className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
              🎯 {goalLabel}
            </span>
          )}
        </div>

        <Link
          href="/app/evolutions"
          className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline underline-offset-4"
        >
          <TrendingUp className="h-3.5 w-3.5" />
          Histórico
        </Link>
      </header>

      {/* ── Empty / Error state ── */}
      {!loading && (!data || !hasAnyMetric) && (
        <div className="rounded-2xl border border-dashed border-border/50 bg-muted/20 p-8 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Sem medidas registradas</h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">
              {err ?? "Adicione sua primeira evolução para acompanhar o progresso das suas medidas."}
            </p>
          </div>
          <Link
            href="/app/evolutions/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Adicionar evolução
          </Link>
        </div>
      )}

      {/* ── Primary metrics (peso / altura) ── */}
      {(loading || primary.length > 0) && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {loading
            ? Array.from({ length: 2 }).map((_, i) => <SkeletonPrimary key={i} />)
            : primary.map(({ key, label, unit, icon, value }) => (
                <div
                  key={String(key)}
                  className="rounded-2xl border border-border/30 bg-card p-5 shadow-sm space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
                    <span className="text-muted-foreground/60">
                      <MetricIcon icon={icon} size={16} />
                    </span>
                  </div>
                  <div className="text-3xl sm:text-4xl font-bold tracking-tight">
                    {formatVal(value)}
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">{unit}</div>
                </div>
              ))}
        </div>
      )}

      {/* ── Secondary metrics ── */}
      {(loading || secondary.length > 0) && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Circunferências
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <SkeletonSecondary key={i} />)
              : secondary.map(({ key, label, unit, icon, value }) => (
                  <div
                    key={String(key)}
                    className="group rounded-xl border border-border/20 bg-card hover:border-border/50 hover:shadow-sm transition-all p-3 sm:p-4 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        <MetricIcon icon={icon} size={14} />
                      </span>
                      <span className="text-[11px] text-muted-foreground leading-tight">{label}</span>
                    </div>
                    <div className="text-lg sm:text-xl font-bold tracking-tight">
                      {formatVal(value)}{" "}
                      <span className="text-xs font-normal text-muted-foreground">{unit}</span>
                    </div>
                  </div>
                ))}
          </div>
        </div>
      )}

    </section>
  );
}
