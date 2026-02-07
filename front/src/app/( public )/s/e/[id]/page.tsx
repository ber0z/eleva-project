// app/(public)/e/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState, use as useUnwrap } from "react";
import { api } from "@/lib/api";
import type { LucideIcon } from "lucide-react";
import {
  Weight,
  BicepsFlexed,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Link as LinkIcon,
} from "lucide-react";

import Image, { type StaticImageData } from "next/image";

// ===== Imagens estáticas (icones)
import thigh1 from "../../../../../../public/icones/thigh1.png";
import height from "../../../../../../public/icones/height.png";
import waist from "../../../../../../public/icones/waist.png";
import chest from "../../../../../../public/icones/chest.png";
import hips from "../../../../../../public/icones/hips.png";
import eleva from "../../../../../../public/imgs/eleva.png";
import shoulders from "../../../../../../public/icones/shoulders.png";
import calf from "../../../../../../public/icones/calf.png";
import forearm from "../../../../../../public/icones/forearm.png";

/* ===================== Tipos ===================== */
type SharedUser = {
  name: string;
  username: string;
};

type SharedImage = { position: number; url: string };

type SharedEvolution = {
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
  message?: string | null;
  images?: SharedImage[];
};

type ShareEvolutionResponse = {
  expiresAt: string;
  user: SharedUser;
  evolution: SharedEvolution;
};

/* ===================== Branding ===================== */
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? "Eleva";

/* ===================== Tradução goal ===================== */
const GOAL_LABEL: Record<string, string> = {
  gain_muscle: "Ganhar massa muscular",
  lose_fat: "Perder gordura",
  recomposition: "Recomposição corporal",
  maintain: "Manutenção",
  increase_strength: "Aumentar força",
  improve_endurance: "Melhorar resistência",
  improve_health: "Melhorar saúde geral",
};

function normalizeGoalKey(v: string) {
  return v
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_");
}

function translateGoal(goal?: string | null) {
  if (!goal || !goal.trim()) return null;
  const key = normalizeGoalKey(goal);
  return GOAL_LABEL[key] ?? goal; // fallback: mostra como veio da API
}

/* ===================== Métricas ===================== */
const METRIC_KEYS = [
  "height",
  "weight",
  "rightBiceps",
  "leftBiceps",
  "rightThigh",
  "leftThigh",
  "waist",
  "hips",
  "chest",
  "shoulder",
  "rightCalf",
  "leftCalf",
  "rightForearm",
  "leftForearm",
] as const;
type MetricKey = typeof METRIC_KEYS[number];

/** Discriminated union para aceitar lucide OU imagem */
type IconDef =
  | { kind: "lucide"; Icon: LucideIcon }
  | { kind: "image"; src: StaticImageData; alt?: string };

type MetricCfgItem = { label: string; unit: string; icon: IconDef };
type MetricCfg = Record<MetricKey, MetricCfgItem>;

const METRICS: MetricCfg = {
  height: { label: "Altura", unit: "cm", icon: { kind: "image", src: height, alt: "Altura" } },
  weight: { label: "Peso", unit: "kg", icon: { kind: "lucide", Icon: Weight } },
  chest: { label: "Peitoral", unit: "cm", icon: { kind: "image", src: chest, alt: "Peito" } },
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

const PRIMARY_KEYS: readonly MetricKey[] = ["weight"];

/* ===================== Utils ===================== */
function formatVal(v: number) {
  return Number.isFinite(v) ? String(v) : "—";
}

function hasNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function useCountdown(target?: string) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);

  return useMemo(() => {
    if (!target) return { text: "", expired: false };
    const ms = new Date(target).getTime() - now;
    if (Number.isNaN(ms)) return { text: "", expired: false };
    if (ms <= 0) return { text: "Expirado", expired: true };
    const s = Math.floor(ms / 1000);
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const parts: string[] = [];
    if (hh) parts.push(String(hh).padStart(2, "0"));
    parts.push(String(mm).padStart(2, "0"), String(ss).padStart(2, "0"));
    return { text: `Expira em ${parts.join(":")}`, expired: false };
  }, [target, now]);
}

/* Renderizador de ícone no padrão metrics
   ✅ imagens invertidas no LIGHT MODE (pra ficarem escuras no fundo claro)
   e voltam ao normal no DARK MODE.
*/
function MetricIcon({ icon, className }: { icon: IconDef; className?: string }) {
  if (icon.kind === "lucide") {
    const Ico = icon.Icon;
    return <Ico className={className} strokeWidth={2} aria-hidden />;
  }

  const cls = `${className ?? ""} invert dark:invert-0`;
  return (
    <Image
      src={icon.src}
      alt={icon.alt ?? ""}
      width={20}
      height={20}
      className={cls}
      priority={false}
    />
  );
}

/* ===================== Página ===================== */
export default function SharedEvolutionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = useUnwrap(params);

  const [data, setData] = useState<ShareEvolutionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Lightbox
  const [lbIndex, setLbIndex] = useState<number | null>(null);
  // Preview principal da galeria
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const res = await api.get<ShareEvolutionResponse>(
          `/share/evolution/${encodeURIComponent(id)}`,
          { withCredentials: false }
        );
        if (!active) return;
        setErr(null);
        setData(res.data);
      } catch {
        if (!active) return;
        setErr("Link inválido ou evolução não encontrada.");
        setData(null);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [id]);

  const evo = data?.evolution ?? null;

  const imagesSorted = useMemo(
    () => (evo?.images ? [...evo.images].sort((a, b) => a.position - b.position) : []),
    [evo]
  );

  useEffect(() => {
    setActiveIdx(0);
  }, [imagesSorted.length]);

  const hasAnyPhoto = imagesSorted.length > 0;

  const dateStr = useMemo(() => {
    if (!evo?.date) return "";
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        timeZone: "UTC",
        dateStyle: "medium",
      }).format(new Date(evo.date));
    } catch {
      return "";
    }
  }, [evo?.date]);

  const goalLabel = useMemo(() => translateGoal(evo?.goal ?? null), [evo?.goal]);

  // ✅ só mantém métricas que tenham valor numérico
  const primary = useMemo(() => {
    if (!evo) return [];
    return PRIMARY_KEYS.map((k) => ({
      key: k,
      ...METRICS[k],
      value: evo[k] as number | null,
    })).filter((m) => hasNumber(m.value));
  }, [evo]);

  const secondary = useMemo(() => {
    if (!evo) return [];
    return (METRIC_KEYS as readonly MetricKey[])
      .filter((k) => !PRIMARY_KEYS.includes(k))
      .map((k) => ({
        key: k,
        ...METRICS[k],
        value: evo[k] as number | null,
      }))
      .filter((m) => hasNumber(m.value));
  }, [evo]);

  const hasAnyMetric = primary.length + secondary.length > 0;

  const { expired } = useCountdown(data?.expiresAt);
  const isExpired = Boolean(expired);

  function openLightbox(i: number) {
    if (!imagesSorted.length) return;
    setLbIndex(i);
  }
  function closeLightbox() {
    setLbIndex(null);
  }
  function goPrev() {
    if (lbIndex === null) return;
    setLbIndex((i) => (i! > 0 ? i! - 1 : i));
  }
  function goNext() {
    if (lbIndex === null) return;
    setLbIndex((i) => (i! < imagesSorted.length - 1 ? i! + 1 : i));
  }

  /* ======= 1) LOADING FULLSCREEN ======= */
  if (loading) {
    return (
      <div
        className="
          min-h-dvh grid place-items-center bg-background
          [background:radial-gradient(70rem_40rem_at_50%_-10%,--theme(--color-primary/14),transparent_60%),radial-gradient(40rem_30rem_at_100%_10%,--theme(--color-ring/10),transparent_55%)]
        "
      >
        <div className="flex flex-col items-center gap-3 text-center rounded-2xl border border-border/70 bg-card/95 px-6 py-5 shadow-sm">
          <Loader2 className="h-7 w-7 animate-spin text-foreground/80" />
          <div className="text-sm text-foreground/70">
            Carregando a evolução… aguarde um instante.
          </div>
        </div>
      </div>
    );
  }

  /* ======= 2) ERRO / EXPIRADO ======= */
  if (!data || err || isExpired) {
    const msg = isExpired
      ? "Este link de compartilhamento expirou."
      : err || "Link inválido ou evolução não encontrada.";

    const hint = isExpired
      ? "Peça um novo link para quem compartilhou com você."
      : "Verifique se o endereço está correto ou se o link ainda é válido.";

    return (
      <div
        className="
          min-h-dvh grid place-items-center bg-background px-3
          [background:radial-gradient(70rem_40rem_at_50%_-10%,--theme(--color-primary/14),transparent_60%),radial-gradient(40rem_30rem_at_100%_10%,--theme(--color-ring/10),transparent_55%)]
        "
      >
        <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card/95 p-5 shadow-sm text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/12 text-rose-700 dark:text-rose-300 border border-rose-500/20">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight mb-1 text-foreground">
            Não foi possível exibir a evolução
          </h1>
          <p className="text-sm text-foreground/75">{msg}</p>
          <p className="mt-1 text-xs text-foreground/60">{hint}</p>

          <div className="mt-4 flex items-center justify-center gap-2">
            <a
              href={"/"}
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs shadow hover:opacity-90"
            >
              <LinkIcon className="h-4 w-4" />
              <span>Compartilhe suas evoluções</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  /* ======= 3) CONTEÚDO ======= */
  return (
    <div
      className="
        min-h-dvh bg-background
        [background:radial-gradient(70rem_40rem_at_50%_-10%,--theme(--color-primary/14),transparent_60%),radial-gradient(40rem_30rem_at_100%_10%,--theme(--color-ring/10),transparent_55%)]
      "
    >
      {/* HERO */}
      <div
        className="
          relative w-full overflow-hidden rounded-b-3xl
          border-b border-border/70
          bg-linear-to-br from-primary/25 via-primary/12 to-transparent
          h-32 sm:h-40
        "
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="absolute inset-x-0 top-0 z-10">
          <div className="mx-auto w-full max-w-6xl px-3 sm:px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 pt-5">
              <div className="h-7 w-24 rounded-md">
                <Image
                  src={eleva}
                  alt="Eleva"
                  width={96}
                  height={96}
                  priority
                  className="mb-6 rounded-lg"
                />
              </div>
              <span className="sr-only">{BRAND_NAME}</span>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background:radial-gradient(40rem_40rem_at_20%_-10%,--theme(--color-primary/60),transparent_60%),radial-gradient(32rem_32rem_at_120%_20%,--theme(--color-primary/40),transparent_60%)]" />
      </div>

      {/* GRID */}
      <section className="mx-auto -mt-10 sm:-mt-14 w-full max-w-6xl px-3 sm:px-4 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* ✅ Coluna esquerda: Galeria (só se tiver fotos) */}
          {hasAnyPhoto ? (
            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-border/70 bg-muted/35 dark:bg-card/90 backdrop-blur p-3 sm:p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <div className="text-sm text-foreground/70">
                    Evolução de{" "}
                    <span className="font-medium text-foreground">{data.user.name}</span>
                    {data.user.username ? (
                      <span className="text-foreground/60"> • @{data.user.username}</span>
                    ) : null}
                  </div>

                  {dateStr ? (
                    <div className="text-xs px-2 py-1 rounded-md border border-border/70 bg-muted/20 text-foreground/80">
                      {dateStr}
                    </div>
                  ) : null}
                </div>

                {/* Preview principal */}
                <div className="relative w-full overflow-hidden rounded-xl border border-border/70 bg-muted/15">
                  <div className="relative w-full aspect-3/4">
                    <Image
                      key={imagesSorted[activeIdx]?.url}
                      src={imagesSorted[activeIdx].url}
                      alt={`Foto ${imagesSorted[activeIdx].position}`}
                      fill
                      sizes="(max-width: 1024px) 100vw, 58vw"
                      className="object-contain"
                      priority
                      unoptimized
                      draggable={false}
                      onClick={() => openLightbox(activeIdx)}
                    />
                  </div>

                  {/* Controles no preview */}
                  {imagesSorted.length > 1 ? (
                    <>
                      <button
                        onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
                        aria-label="Anterior"
                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/45 hover:bg-black/60 text-white p-2 shadow-sm"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setActiveIdx((i) => Math.min(imagesSorted.length - 1, i + 1))}
                        aria-label="Próxima"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/45 hover:bg-black/60 text-white p-2 shadow-sm"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  ) : null}
                </div>

                {/* Miniaturas */}
                {imagesSorted.length > 1 ? (
                  <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
                    {imagesSorted.map((img, i) => (
                      <button
                        key={img.position}
                        type="button"
                        onClick={() => setActiveIdx(i)}
                        className={`relative shrink-0 rounded-lg border overflow-hidden
                          ${i === activeIdx
                            ? "border-primary ring-2 ring-primary/40"
                            : "border-border/70 hover:border-border"
                          }`}
                        title={`Foto ${img.position}`}
                        style={{ width: 72, height: 96 }}
                      >
                        <Image
                          src={img.url}
                          alt={`Thumb ${img.position}`}
                          width={72}
                          height={96}
                          className="object-cover"
                          unoptimized
                        />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Coluna direita: Info e métricas */}
          <div className={hasAnyPhoto ? "lg:col-span-5" : "lg:col-span-12"}>
            <div className="lg:sticky lg:top-6 space-y-4">
              <div className="rounded-2xl border border-border/70 bg-muted/35 dark:bg-card/90 backdrop-blur p-4 sm:p-5 shadow-sm">
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                  Resumo da evolução
                </h1>

                {/* ✅ GOAL traduzido */}
                {goalLabel ? (
                  <p className="mt-1 text-sm text-foreground/70">
                    Objetivo: <span className="font-medium text-foreground">{goalLabel}</span>
                  </p>
                ) : null}

                {/* ✅ Destaques (só se tiver valor) */}
                {primary.length ? (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                    {primary.map(({ key, label, unit, icon, value }) => (
                      <div
                        key={String(key)}
                        className="
                          rounded-xl border border-border/70
                          bg-muted/25 dark:bg-card/90
                          bg-linear-to-br from-primary/18 to-transparent
                          p-3 shadow-sm
                        "
                      >
                        <div className="flex items-center justify-between">
                          <MetricIcon icon={icon} className="h-5 w-5 text-foreground/90" />
                          <span className="text-[11px] sm:text-xs text-foreground/70">{label}</span>
                        </div>
                        <div className="mt-2 text-xl font-semibold text-foreground">
                          {formatVal(Number(value))}{" "}
                          <span className="text-xs text-foreground/70">{unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* ✅ Outras medidas (só se tiver valor) */}
                {secondary.length ? (
                  <div className="mt-5 space-y-2">
                    <h2 className="text-xs sm:text-sm font-medium text-foreground/70">Medidas</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                      {secondary.map(({ key, label, unit, icon, value }) => (
                        <div
                          key={String(key)}
                          className="rounded-xl border border-border/70 bg-muted/25 dark:bg-card/90 p-3"
                        >
                          <div className="flex items-start justify-between">
                            <MetricIcon icon={icon} className="h-5 w-5 text-foreground/90" />
                            <span className="text-[11px] sm:text-xs text-foreground/70">{label}</span>
                          </div>
                          <div className="mt-2 text-base font-semibold text-foreground">
                            {formatVal(Number(value))}{" "}
                            <span className="text-xs text-foreground/70">{unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Mensagem */}
                {evo?.message ? (
                  <div className="mt-5 rounded-xl border border-border/70 bg-muted/20 p-3">
                    <p className="text-sm text-foreground">
                      <span className="mr-1">📝</span>
                      {evo.message}
                    </p>
                  </div>
                ) : null}

                {/* (Opcional) fallback sem cards */}
                {!hasAnyMetric && !evo?.message && !goalLabel ? (
                  <p className="mt-3 text-sm text-foreground/70">
                    Sem informações adicionais nesta evolução.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-foreground/55">
          Página pública de evolução — {BRAND_NAME}
        </p>
      </section>

      {/* LIGHTBOX */}
      {lbIndex !== null && imagesSorted[lbIndex] && (
        <Lightbox
          images={imagesSorted}
          index={lbIndex}
          onClose={closeLightbox}
          onPrev={goPrev}
          onNext={goNext}
        />
      )}
    </div>
  );
}

/* ===================== Lightbox ===================== */
type LightboxProps = {
  images: { url: string; position: number }[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

function Lightbox({ images, index, onClose, onPrev, onNext }: LightboxProps) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onPrev, onNext]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/90 p-0 sm:p-4 grid place-items-center"
      onClick={onClose}
    >
      <div
        className="relative w-[min(92vw,1200px)] h-[min(88vh,calc(100svh-64px))] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fechar */}
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 rounded-full bg-white/12 hover:bg-white/22 text-white p-2 shadow-sm"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Prev */}
        <button
          onClick={onPrev}
          aria-label="Anterior"
          disabled={index <= 0}
          className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-20 rounded-full bg-white/12 hover:bg-white/22 text-white p-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        {/* Next */}
        <button
          onClick={onNext}
          aria-label="Próxima"
          disabled={index >= images.length - 1}
          className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-20 rounded-full bg-white/12 hover:bg-white/22 text-white p-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        {/* Palco */}
        <div className="relative z-10 w-full h-full">
          {images.map((img, i) => {
            const visible = i === index;
            return (
              <div
                key={img.url}
                className={`absolute inset-0 transition-opacity duration-150 ${visible ? "opacity-100" : "opacity-0 pointer-events-none"
                  }`}
              >
                <Image
                  src={img.url}
                  alt={`Foto ${img.position}`}
                  fill
                  sizes="100vw"
                  className="object-contain rounded-lg shadow-2xl"
                  priority={Math.abs(i - index) <= 1}
                  unoptimized
                  draggable={false}
                />
              </div>
            );
          })}
        </div>

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-center text-xs text-white/85">
          Foto {images[index].position} • {index + 1} / {images.length}
        </div>
      </div>
    </div>
  );
}
