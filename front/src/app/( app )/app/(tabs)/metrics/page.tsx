// app/app/metrics/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import Image, { type StaticImageData } from "next/image";
import type { LucideIcon } from "lucide-react";
import { Weight, BicepsFlexed } from "lucide-react";
import thigh1 from "../../../../../../public/icones/thigh1.png";
import height from "../../../../../../public/icones/height.png";
import waist from "../../../../../../public/icones/waist.png";
import chest from "../../../../../../public/icones/chest.png";
import hips from "../../../../../../public/icones/hips.png";
import shoulders from "../../../../../../public/icones/shoulders.png";
import calf from "../../../../../../public/icones/calf.png";
import forearm from "../../../../../../public/icones/forearm.png";

/* ===== Tipos ===== */
type EvolutionImage = {
  id: number;
  idEvolution: number;
  position: number;
  path: string;
  createdAt: string;
  updatedAt: string;
};

type Evolution = {
  id: number;
  idUser: number;
  date: string; // ISO
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
  EvolutionImages?: EvolutionImage[];
};

type MetricKey = keyof Pick<
  Evolution,
  | "height"
  | "weight"
  | "rightBiceps"
  | "leftBiceps"
  | "rightThigh"
  | "leftThigh"
  | "waist"
  | "hips"
  | "chest"
  | "shoulder"
  | "rightCalf"
  | "leftCalf"
  | "rightForearm"
  | "leftForearm"
>;

/** Discriminated union para aceitar lucide ou imagem */
type IconDef =
  | { kind: "lucide"; Icon: LucideIcon }
  | { kind: "image"; src: StaticImageData; alt?: string };

type MetricCfgItem = { label: string; unit: string; icon: IconDef };
type MetricCfg = Record<MetricKey, MetricCfgItem>;

/* ===== Config ===== */
const METRIC_CONFIG: MetricCfg = {
  height: { label: "Altura", unit: "cm", icon: { kind: "image", src: height, alt: "Altura" } },
  weight: { label: "Peso", unit: "kg", icon: { kind: "lucide", Icon: Weight } },
  chest: { label: "Peitoral", unit: "cm", icon: { kind: "image", src: chest, alt: "peito" }},
  rightBiceps: { label: "Bíceps direito", unit: "cm", icon: { kind: "lucide", Icon: BicepsFlexed } },
  leftBiceps: { label: "Bíceps esquerdo", unit: "cm", icon: { kind: "lucide", Icon: BicepsFlexed } },
  rightThigh: { label: "Coxa direita", unit: "cm", icon: { kind: "image", src: thigh1, alt: "Coxa" } },
  leftThigh: { label: "Coxa esquerda", unit: "cm", icon: { kind: "image", src: thigh1, alt: "Coxa" } },
  waist: { label: "Cintura", unit: "cm", icon: { kind: "image", src: waist, alt: "Cintura" } },
  hips: { label: "Quadril", unit: "cm", icon: { kind: "image", src: hips, alt: "Quadril" } },
  shoulder: { label: "Ombro", unit: "cm", icon: { kind: "image", src: shoulders, alt: "Ombro" } },
  rightCalf: { label: "Panturrilha direita", unit: "cm", icon: { kind: "image", src: calf, alt: "Panturrilha" } },
  leftCalf: { label: "Panturrilha esquerda", unit: "cm", icon: { kind: "image", src: calf, alt: "Panturrilha" } },
  rightForearm: { label: "Antebraço direito", unit: "cm", icon: { kind: "image", src: forearm, alt: "Antebraço" } },
  leftForearm: { label: "Antebraço esquerdo", unit: "cm", icon: { kind: "image", src: forearm, alt: "Antebraço" } },
};

const PRIMARY_KEYS: Array<keyof typeof METRIC_CONFIG> = ["weight", "height"];

/* ===== Utils ===== */
function formatVal(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return Number.isFinite(v) ? String(v) : "—";
}

function GoalBadge({ goal }: { goal: string | null | undefined }) {
  const text =
    goal && goal.trim().length > 0 ? goal : "Sem objetivo definido";

  // você pode deixar uma cor fixa ou ajustar do jeito que quiser
  const color =
    "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${color}`}
    >
      <span>🎯</span> {text}
    </span>
  );
}

function SkeletonCard({ tall = false }: { tall?: boolean }) {
  return (
    <div className={`rounded-xl border border-border bg-muted/30 animate-pulse ${tall ? "p-3 sm:p-4" : "p-2 sm:p-3"}`}>
      <div className="h-4 w-16 bg-muted rounded" />
      <div className="mt-3 h-6 w-24 bg-muted rounded" />
    </div>
  );
}

/* Renderizador de ícone unificado */
function MetricIcon({ icon, className }: { icon: IconDef; className?: string }) {
  if (icon.kind === "lucide") {
    const Ico = icon.Icon;
    return <Ico className={className} strokeWidth={2} aria-hidden />;
  }
  // imagem estática
  return (
    <Image
      src={icon.src}
      alt={icon.alt ?? ""}
      width={20}
      height={20}
      className={className}
      priority={false}
    />
  );
}

/* ===== Página ===== */
export default function MetricsPage() {
  const [data, setData] = useState<Evolution | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    api
      .get<Evolution[]>("/evolution/last", { withCredentials: true })
      .then((res) => {
        if (!mounted) return;
        const evo = Array.isArray(res.data) ? res.data[0] : null;
        setData(evo ?? null);
        setErr(null);
      })
      .catch(() => {
        setErr("Não foi possível carregar suas métricas agora.");
        setData(null);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const dateStr = useMemo(() => {
    if (!data?.date) return "";
    try {
      return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(data.date));
    } catch {
      return "";
    }
  }, [data]);

  const primary = PRIMARY_KEYS.map((k) => ({
    key: k,
    ...METRIC_CONFIG[k],
    value: data ? (data[k] as number | null) : null,
  }));
  const secondary = (Object.keys(METRIC_CONFIG) as Array<keyof typeof METRIC_CONFIG>)
    .filter((k) => !PRIMARY_KEYS.includes(k))
    .map((k) => ({
      key: k,
      ...METRIC_CONFIG[k],
      value: data ? (data[k] as number | null) : null,
    }));

  return (
    <section className="mx-auto max-w-5xl px-2 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <header className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Medidas atuais</h1>
          <p className="text-sm text-muted-foreground">
            {loading
              ? "Carregando sua última evolução…"
              : data
              ? (
                <>
                  Última atualização: <span className="font-medium">{dateStr}</span>
                </>
                )
              : "Sem evoluções registradas ainda."}
          </p>
          {data?.goal ? (
            <div className="mt-2">
              <GoalBadge goal={data.goal} />
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Link href="/app/evolutions" className="text-sm text-primary underline-offset-4 hover:underline">
            Ver histórico
          </Link>
        </div>
      </header>

      {/* Destaques */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {loading
          ? Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)
          : primary.map(({ key, label, unit, icon, value }) => (
              <div
                key={String(key)}
                className="rounded-xl border border-border bg-linear-to-br from-primary/10 to-transparent p-2 sm:p-3 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <MetricIcon icon={icon} className="h-5 w-5 text-foreground/80" />
                  <span className="text-[11px] sm:text-xs text-muted-foreground">{label}</span>
                </div>
                <div className="mt-2">
                  <div className="text-xl sm:text-2xl font-semibold tracking-tight">
                    {formatVal(value)} <span className="text-sm text-muted-foreground">{unit}</span>
                  </div>
                </div>
              </div>
            ))}
      </div>

      {/* Outras medidas */}
      <div className="space-y-2 sm:space-y-3">
        <h2 className="text-xs sm:text-sm font-medium text-muted-foreground">Medidas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
          {loading
            ? Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)
            : secondary.map(({ key, label, unit, icon, value }) => (
                <div key={String(key)} className="rounded-xl border border-border bg-card p-2 sm:p-3">
                  <div className="flex items-start justify-between">
                    <MetricIcon icon={icon} className="h-5 w-5 text-foreground/80" />
                    <span className="text-[11px] sm:text-xs text-muted-foreground">{label}</span>
                  </div>
                  <div className="mt-2 text-base sm:text-lg font-semibold">
                    {formatVal(value)} <span className="text-xs sm:text-sm text-muted-foreground">{unit}</span>
                  </div>
                </div>
              ))}
        </div>
      </div>

      {!loading && !data && (
        <div className="rounded-xl border border-border bg-muted/30 p-6 text-center">
          {err ? (
            <p className="text-sm text-muted-foreground">{err}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Você ainda não tem evoluções.{" "}
              <Link href="/app/evolutions/new" className="text-primary underline-offset-4 hover:underline">
                Adicionar agora
              </Link>
              .
            </p>
          )}
        </div>
      )}
    </section>
  );
}
