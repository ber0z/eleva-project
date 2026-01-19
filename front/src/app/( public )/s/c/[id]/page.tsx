// app/( public )/s/c/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState, use as useUnwrap } from "react";
import Image from "next/image";
import eleva from "../../../../../../public/imgs/eleva.png";
import { api } from "@/lib/api";
import type { LucideIcon } from "lucide-react";
import {
  Weight,
  BicepsFlexed,
  // Smartphone,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Link as LinkIcon,

} from "lucide-react";
import NextImage, { type StaticImageData } from "next/image";

// ===== Imagens estáticas (mesmo padrão da página de metrics)
import thigh1 from "../../../../../../public/icones/thigh1.png";
import height from "../../../../../../public/icones/height.png";
import waist from "../../../../../../public/icones/waist.png";
import chest from "../../../../../../public/icones/chest.png";
import hips from "../../../../../../public/icones/hips.png";
import shoulders from "../../../../../../public/icones/shoulders.png";
import calf from "../../../../../../public/icones/calf.png";
import forearm from "../../../../../../public/icones/forearm.png";

/* ===================== Tipos ===================== */
type SharedUser = { name: string; username: string };
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
  calf: number | null;
  forearm: number | null;
  message?: string | null;
  images?: SharedImage[];
};

type DateDiff = { years: number; months: number; days: number };
type MetricKey =
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
  | "calf"
  | "forearm";

type ShareCompareResponse = {
  expiresAt: string;
  user: SharedUser;
  evolution1: SharedEvolution;
  evolution2: SharedEvolution;
  differences?: Record<MetricKey, number> & { dateDifference?: DateDiff };
};

/* ===================== Branding / Links ===================== */
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? "Eleva";
// const ANDROID_URL = process.env.NEXT_PUBLIC_ANDROID_URL ?? "";
// const HAS_ANDROID = ANDROID_URL.length > 0;

/* ===================== Métricas (padrão metrics) ===================== */
const METRIC_KEYS: readonly MetricKey[] = [
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
  "calf",
  "forearm",
];

type IconDef =
  | { kind: "lucide"; Icon: LucideIcon }
  | { kind: "image"; src: StaticImageData; alt?: string };

type MetricCfgItem = { label: string; unit: string; icon: IconDef };
type MetricCfg = Record<MetricKey, MetricCfgItem>;

const METRICS: MetricCfg = {
  height: { label: "Altura", unit: "cm", icon: { kind: "image", src: height, alt: "Altura" } },
  weight: { label: "Peso", unit: "kg", icon: { kind: "lucide", Icon: Weight } },
  chest: { label: "Peitoral", unit: "cm", icon: { kind: "image", src: chest, alt: "peito" } },
  rightBiceps: { label: "Bíceps direito", unit: "cm", icon: { kind: "lucide", Icon: BicepsFlexed } },
  leftBiceps: { label: "Bíceps esquerdo", unit: "cm", icon: { kind: "lucide", Icon: BicepsFlexed } },
  rightThigh: { label: "Coxa direita", unit: "cm", icon: { kind: "image", src: thigh1, alt: "Coxa" } },
  leftThigh: { label: "Coxa esquerda", unit: "cm", icon: { kind: "image", src: thigh1, alt: "Coxa" } },
  waist: { label: "Cintura", unit: "cm", icon: { kind: "image", src: waist, alt: "Cintura" } },
  hips: { label: "Quadril", unit: "cm", icon: { kind: "image", src: hips, alt: "Quadril" } },
  shoulder: { label: "Ombro", unit: "cm", icon: { kind: "image", src: shoulders, alt: "Ombro" } },
  calf: { label: "Panturrilha", unit: "cm", icon: { kind: "image", src: calf, alt: "Panturrilha" } },
  forearm: { label: "Antebraço", unit: "cm", icon: { kind: "image", src: forearm, alt: "Antebraço" } },
};

const PRIMARY_KEYS: readonly MetricKey[] = ["weight"];

/* ===================== Utils ===================== */
function formatVal(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return Number.isFinite(v) ? String(v) : "—";
}

function formatDateUTC(iso?: string | null) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "UTC",
      dateStyle: "medium",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}


function MetricIcon({ icon, className }: { icon: IconDef; className?: string }) {
  if (icon.kind === "lucide") {
    const Ico = icon.Icon;
    return <Ico className={className} strokeWidth={2} aria-hidden />;
  }
  return (
    <NextImage
      src={icon.src}
      alt={icon.alt ?? ""}
      width={20}
      height={20}
      className={className}
      priority={false}
    />
  );
}

/* ===================== Página ===================== */
export default function CompareEvolutionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = useUnwrap(params);

  // ---- state
  const [data, setData] = useState<ShareCompareResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // posição atualmente aberta no lightbox (comparação)
  const [lbPos, setLbPos] = useState<number | null>(null);

  // ---- fetch
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get<ShareCompareResponse>(
          `/share/evolution/compare/${encodeURIComponent(id)}`,
          { withCredentials: false }
        );
        if (!active) return;
        setErr(null);
        setData(res.data);
      } catch {
        if (!active) return;
        setErr("Link inválido ou evoluções não encontradas.");
        setData(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  // ---- derivados
  const evo1 = data?.evolution1 ?? null;
  const evo2 = data?.evolution2 ?? null;


  const date1 = useMemo(() => formatDateUTC(evo1?.date), [evo1?.date]);
  const date2 = useMemo(() => formatDateUTC(evo2?.date), [evo2?.date]);


  const images1 = useMemo(
    () => (evo1?.images ? [...evo1.images].sort((a, b) => a.position - b.position) : []),
    [evo1]
  );
  const images2 = useMemo(
    () => (evo2?.images ? [...evo2.images].sort((a, b) => a.position - b.position) : []),
    [evo2]
  );

  // position → index (para achar rápido)
  const posIndex1 = useMemo(() => {
    const m = new Map<number, number>();
    images1.forEach((img, idx) => m.set(img.position, idx));
    return m;
  }, [images1]);

  const posIndex2 = useMemo(() => {
    const m = new Map<number, number>();
    images2.forEach((img, idx) => m.set(img.position, idx));
    return m;
  }, [images2]);

  // todas as positions existentes (união ordenada)
  const allPositions = useMemo(() => {
    const set = new Set<number>();
    images1.forEach((i) => set.add(i.position));
    images2.forEach((i) => set.add(i.position));
    return Array.from(set).sort((a, b) => a - b);
  }, [images1, images2]);

  // diferenças (fallback caso o servidor não mande)
  const differences = useMemo(() => {
    if (data?.differences) return data.differences;

    const diff: Partial<Record<MetricKey, number | null>> = {};

    for (const k of METRIC_KEYS) {
      const a = (evo1?.[k] as number | null) ?? null;
      const b = (evo2?.[k] as number | null) ?? null;

      const hasA = typeof a === "number" && Number.isFinite(a);
      const hasB = typeof b === "number" && Number.isFinite(b);

      diff[k] = hasA && hasB ? a - b : null;
    }

    return diff as Record<MetricKey, number> & { dateDifference?: DateDiff };
  }, [data?.differences, evo1, evo2]);


  // ---- ações
  function openCompareByPosition(position: number) {
    setLbPos(position);
  }
  function closeLightbox() {
    setLbPos(null);
  }
  function goPrev() {
    if (lbPos == null) return;
    const idx = allPositions.indexOf(lbPos);
    if (idx > 0) setLbPos(allPositions[idx - 1]);
  }
  function goNext() {
    if (lbPos == null) return;
    const idx = allPositions.indexOf(lbPos);
    if (idx >= 0 && idx < allPositions.length - 1) setLbPos(allPositions[idx + 1]);
  }

  // ---- loading / erro
  if (loading) {
    return (
      <div className="min-h-dvh grid place-items-center bg-background">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-7 w-7 animate-spin text-foreground/80" />
          <div className="text-sm text-muted-foreground">Carregando a comparação…</div>
        </div>
      </div>
    );
  }

  if (!data || err) {
    const msg = "Link inválido ou evoluções não encontradas.";
    const hint = "Verifique se o endereço está correto ou se o link ainda é válido.";

    return (
      <div className="min-h-dvh grid place-items-center bg-background px-3">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-sm text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-300">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight mb-1">Não foi possível exibir a comparação</h1>
          <p className="text-sm text-muted-foreground">{msg}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>

          <div className="mt-4 flex items-center justify-center gap-2">
            <a
              href={'/'}
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs shadow hover:opacity-90"
            >
              <LinkIcon className="h-4 w-4" />
              <span>Compartilhe suas evoluções</span>
            </a>
            {/* {HAS_ANDROID ? (
              <a
                href={ANDROID_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs shadow hover:opacity-90"
              >
                <Smartphone className="h-4 w-4" />
                <span>Baixar app Android</span>
              </a>
            ) : null} */}
          </div>
        </div>
      </div>
    );
  }

  // ---- UI principal
  return (
    <div className="min-h-dvh bg-background">
      {/* HERO */}
      <div
        className="relative w-full overflow-hidden  rounded-b-3xl border-b border-border bg-linear-to-br from-primary/20 via-primary/10 to-transparent h-36 sm:h-44"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        {/* Brand bar */}
        <div className="absolute inset-x-0 top-0 z-10 mt-1">
          <div className="mx-auto w-full max-w-5xl px-3 sm:px-4  py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-24 rounded-md ">
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

            {/* <div className="flex items-center gap-2">
              <span className="text-xs text-white/90">Baixe o app:</span>
              {HAS_ANDROID ? (
                <a
                  href={ANDROID_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${BRAND_NAME} no Android`}
                  className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs shadow hover:opacity-90"
                >
                  <Smartphone className="h-4 w-4" />
                  <span>Android</span>
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  aria-disabled
                  className="inline-flex items-center gap-2 rounded-full bg-primary/40 text-primary-foreground/80 px-3 py-1.5 text-xs opacity-60 cursor-not-allowed"
                >
                  <Smartphone className="h-4 w-4" />
                  <span>Android</span>
                </button>
              )}
            </div> */}
          </div>
        </div>

        {/* ornamento */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background:radial-gradient(40rem_40rem_at_20%_-10%,--theme(--color-primary/60),transparent_60%),radial-gradient(32rem_32rem_at_120%_20%,--theme(--color-primary/40),transparent_60%)]" />

      </div>

      {/* CARTÃO */}
      <section className="mx-auto -mt-16 sm:-mt-24 lg:-mt-28 w-full max-w-5xl px-3 sm:px-4 pb-8">
        <div className="rounded-2xl border border-border bg-card/90 backdrop-blur p-4 sm:p-6 shadow-md">
          {/* header */}
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Comparando evoluções de {data.user.name}
            </h1>
            <p className="text-sm text-muted-foreground">{data.user.username ? `@${data.user.username}` : ""}</p>
          </div>

          {/* datas */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <div className="text-sm sm:text-base font-medium">{date1 || "—"}</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <div className="text-sm sm:text-base font-medium">{date2 || "—"}</div>
            </div>
          </div>

          {/* destaques */}
          <div className="mt-5 grid grid-cols-1 gap-2 sm:gap-3">
            {PRIMARY_KEYS.map((k) => {
              const cfg = METRICS[k];
              const v1 = evo1 ? (evo1[k] as number | null) : null;
              const v2 = evo2 ? (evo2[k] as number | null) : null;

              const hasV1 = typeof v1 === "number" && Number.isFinite(v1);
              const hasV2 = typeof v2 === "number" && Number.isFinite(v2);

              const raw = (differences)?.[k] as number | null | undefined;
              const hasDiff = typeof raw === "number" && Number.isFinite(raw);

              const showDiff = hasV1 && hasV2 && hasDiff;

              const deltaAbs = showDiff ? Math.abs(raw) : 0;

              const state = !showDiff
                ? "text-muted-foreground"
                : raw > 0
                  ? "text-emerald-600"
                  : raw < 0
                    ? "text-rose-600"
                    : "text-muted-foreground";

              const badge = !showDiff
                ? "Sem dados"
                : raw === 0
                  ? "Sem diferença"
                  : raw > 0
                    ? `+${deltaAbs} ${cfg.unit}`
                    : `-${deltaAbs} ${cfg.unit}`;

              return (
                <div
                  key={k}
                  className="rounded-xl border border-border bg-linear-to-br from-primary/10 to-transparent p-3 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <MetricIcon icon={cfg.icon} className="h-5 w-5 text-foreground/80" />
                    <span className="text-[11px] sm:text-xs text-muted-foreground">{cfg.label}</span>
                  </div>

                  <div className="mt-2 grid grid-cols-3 items-end gap-2">
                    <div className="text-base sm:text-lg font-semibold">
                      {formatVal(v1)} <span className="text-xs text-muted-foreground">{cfg.unit}</span>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{date1 || "—"}</div>
                    </div>

                    <div className="text-center text-xs sm:text-sm font-medium">
                      <span className={`inline-block rounded-full px-2 py-0.5 ${state} bg-black/5 dark:bg-white/5`}>
                        {badge}
                      </span>
                    </div>

                    <div className="text-right text-base sm:text-lg font-semibold">
                      {formatVal(v2)} <span className="text-xs text-muted-foreground">{cfg.unit}</span>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{date2 || "—"}</div>
                    </div>
                  </div>
                </div>
              );
            })}

          </div>

          {/* tabela medidas */}
          <div className="mt-6 space-y-2 sm:space-y-3">
            <h2 className="text-xs sm:text-sm font-medium text-muted-foreground">Medidas</h2>
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="grid grid-cols-4 bg-muted/40 px-3 py-2 text-[11px] sm:text-xs text-muted-foreground">
                <div>Medida</div>
                <div className="text-right">{date1 || "—"}</div>
                <div className="text-center">Diferença</div>
                <div className="text-right">{date2 || "—"}</div>
              </div>
              <div className="divide-y divide-border">
                {METRIC_KEYS.filter((k) => !PRIMARY_KEYS.includes(k)).map((k) => {
                  const cfg = METRICS[k];

                  const a = evo1 ? (evo1[k] as number | null) : null;
                  const b = evo2 ? (evo2[k] as number | null) : null;

                  const hasA = typeof a === "number" && Number.isFinite(a);
                  const hasB = typeof b === "number" && Number.isFinite(b);

                  const raw = (differences)?.[k] as number | null | undefined;
                  const hasDiff = typeof raw === "number" && Number.isFinite(raw);

                  const showDiff = hasA && hasB && hasDiff;

                  const sign = !showDiff
                    ? "—"
                    : raw === 0
                      ? "="
                      : raw > 0
                        ? `+${Math.abs(raw)} ${cfg.unit}`
                        : `-${Math.abs(raw)} ${cfg.unit}`;

                  const state = !showDiff
                    ? "text-muted-foreground"
                    : raw > 0
                      ? "text-emerald-600"
                      : raw < 0
                        ? "text-rose-600"
                        : "text-muted-foreground";

                  return (
                    <div key={k} className="grid grid-cols-4 px-3 py-2 items-center">
                      <div className="flex items-center gap-2">
                        <MetricIcon icon={cfg.icon} className="h-4 w-4 text-foreground/80" />
                        <span className="text-xs">{cfg.label}</span>
                      </div>

                      <div className="text-right text-sm">
                        {formatVal(a)} <span className="text-[11px] text-muted-foreground">{cfg.unit}</span>
                      </div>

                      <div className="text-center text-xs">
                        <span className={`inline-block rounded-full px-2 py-0.5 ${state} bg-black/5 dark:bg-white/5`}>
                          {sign}
                        </span>
                      </div>

                      <div className="text-right text-sm">
                        {formatVal(b)} <span className="text-[11px] text-muted-foreground">{cfg.unit}</span>
                      </div>
                    </div>
                  );
                })}

              </div>
            </div>
          </div>

          {/* mensagens */}
          {(evo1?.message || evo2?.message) && (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {evo1?.message ? (
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-sm"><span className="mr-1">📝</span>{evo1.message}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{date1 || "—"}</p>
                </div>
              ) : null}
              {evo2?.message ? (
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-sm"><span className="mr-1">📝</span>{evo2.message}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{date2 || "—"}</p>
                </div>
              ) : null}
            </div>
          )}

          {/* galerias: clique abre por position (comparação) */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">Fotos — {date1 || "—"}</h3>
              <div className="mt-2 flex gap-2 sm:gap-3 overflow-x-auto no-scrollbar snap-x">
                {images1.map((img) => (
                  <button
                    key={`D1-${img.position}`}
                    type="button"
                    onClick={() => openCompareByPosition(img.position)}
                    className="snap-start shrink-0 w-28 sm:w-40 aspect-3/4 overflow-hidden rounded-lg border border-border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    title={`${date1 || "—"} — posição ${img.position}`}
                  >
                    <NextImage
                      src={img.url}
                      alt={`${date1 || "—"} — posição ${img.position}`}
                      width={320}
                      height={426}
                      className="h-full w-full object-cover"
                      sizes="(max-width: 640px) 112px, 160px"
                      unoptimized
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">Fotos — {date2 || "—"}</h3>
              <div className="mt-2 flex gap-2 sm:gap-3 overflow-x-auto no-scrollbar snap-x">
                {images2.map((img) => (
                  <button
                    key={`D2-${img.position}`}
                    type="button"
                    onClick={() => openCompareByPosition(img.position)}
                    className="snap-start shrink-0 w-28 sm:w-40 aspect-3/4 overflow-hidden rounded-lg border border-border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    title={`${date2 || "—"} — posição ${img.position}`}
                  >
                    <NextImage
                      src={img.url}
                      alt={`${date2 || "—"} — posição ${img.position}`}
                      width={320}
                      height={426}
                      className="h-full w-full object-cover"
                      sizes="(max-width: 640px) 112px, 160px"
                      unoptimized
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Página pública de compartilhamento — {BRAND_NAME}
        </p>
      </section>

      {/* LIGHTBOX DE COMPARAÇÃO (lado a lado por position) */}
      {lbPos !== null && (
        <CompareLightbox
          position={lbPos}
          allPositions={allPositions}
          leftTitle={date1 || "—"}
          rightTitle={date2 || "—"}
          leftImages={images1}
          rightImages={images2}
          leftMap={posIndex1}
          rightMap={posIndex2}
          onClose={closeLightbox}
          onPrev={goPrev}
          onNext={goNext}
        />
      )}
    </div>
  );
}

/* ===================== Lightbox de comparação (2 colunas) ===================== */
type CompareLightboxProps = {
  position: number;
  allPositions: number[];
  leftTitle: string;
  rightTitle: string;
  leftImages: { url: string; position: number }[];
  rightImages: { url: string; position: number }[];
  leftMap: Map<number, number>;
  rightMap: Map<number, number>;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

function CompareLightbox(props: CompareLightboxProps) {
  const {
    position,
    allPositions,
    leftTitle,
    rightTitle,
    leftImages,
    rightImages,
    leftMap,
    rightMap,
    onClose,
    onPrev,
    onNext,
  } = props;

  // indices existentes nessa position (ou -1 se não existir)
  const leftIdx = leftMap.get(position) ?? -1;
  const rightIdx = rightMap.get(position) ?? -1;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onPrev, onNext]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 p-0 sm:p-4 grid place-items-center"
      onClick={onClose}
    >
      <div
        className="relative w-[min(96vw,1280px)] h-[min(88vh,calc(100svh-64px))] grid grid-cols-1 sm:grid-cols-2 gap-2 items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fechar */}
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-3 right-3 sm:top-4 sm:right-4 rounded-full bg-white/10 hover:bg-white/20 text-white p-2 z-20"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Prev / Next (navegam por position) */}
        <button
          onClick={onPrev}
          aria-label="Anterior"
          className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 hover:bg-white/20 text-white p-2 z-20"
          disabled={allPositions.indexOf(position) <= 0}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          onClick={onNext}
          aria-label="Próxima"
          className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 hover:bg-white/20 text-white p-2 z-20"
          disabled={allPositions.indexOf(position) >= allPositions.length - 1}
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        {/* Coluna esquerda (evolução 1) */}
        <div className="relative w-full h-full rounded-lg overflow-hidden">
          {leftIdx >= 0 ? (
            <NextImage
              key={leftImages[leftIdx].url}
              src={leftImages[leftIdx].url}
              alt={`${leftTitle} — posição ${position}`}
              fill
              sizes="100vw"
              className="object-contain"
              unoptimized
              priority
              draggable={false}
            />
          ) : (
            <div className="grid place-items-center w-full h-full text-white/70 text-sm">
              Sem foto nessa posição
            </div>
          )}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-center text-xs text-white/80">
            {leftTitle} • posição {position}
          </div>
        </div>

        {/* Coluna direita (evolução 2) */}
        <div className="relative w-full h-full rounded-lg overflow-hidden">
          {rightIdx >= 0 ? (
            <NextImage
              key={rightImages[rightIdx].url}
              src={rightImages[rightIdx].url}
              alt={`${rightTitle} — posição ${position}`}
              fill
              sizes="100vw"
              className="object-contain"
              unoptimized
              priority
              draggable={false}
            />
          ) : (
            <div className="grid place-items-center w-full h-full text-white/70 text-sm">
              Sem foto nessa posição
            </div>
          )}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-center text-xs text-white/80">
            {rightTitle} • posição {position}
          </div>
        </div>
      </div>
    </div>
  );
}
