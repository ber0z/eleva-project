// app/app/evolutions/compare/[id1]/[id2]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";
import Image, { type StaticImageData } from "next/image";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  MoreVertical,
  Share2,
  Copy,
  Link as LinkIcon,
  Loader2,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  Weight,
  BicepsFlexed,
} from "lucide-react";

// ===== Imagens estáticas
import thigh1 from "../../../../../../../../../public/icones/thigh1.png";
import heightIcon from "../../../../../../../../../public/icones/height.png";
import waistIcon from "../../../../../../../../../public/icones/waist.png";
import chest from "../../../../../../../../../public/icones/chest.png";
import hipsIcon from "../../../../../../../../../public/icones/hips.png";
import shoulders from "../../../../../../../../../public/icones/shoulders.png";
import calf from "../../../../../../../../../public/icones/calf.png";
import forearm from "../../../../../../../../../public/icones/forearm.png";

/* ===================== Tipos ===================== */
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
  | "rightCalf"
  | "leftCalf"
  | "rightForearm"
  | "leftForearm";

type DateDiff = { years: number; months: number; days: number };

type CompareEvolution = {
  id: number;
  idUser: number;
  date: string; // ISO
  goal: string | null;
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
  createdAt: string;
  updatedAt: string;
};

type CompareResponse = {
  evolution1: CompareEvolution;
  evolution2: CompareEvolution;
  differences: Partial<Record<MetricKey, number | null>> & { dateDifference?: DateDiff };
};

type EvoImage = {
  id: number;
  position: number; // 1=frente, 2=lado, 3=costas
  url: string;
};

type EvolutionDetail = CompareEvolution & {
  EvolutionImages?: EvoImage[];
};



type ShareCompareResponse = {
  url: string;
  expiresAt?: string | null;
  tokenHash?: string | null;
};

/* ===================== TTL options ===================== */
const TTL_OPTIONS = [
  { label: "15 min", minutes: 15 },
  { label: "1 hora", minutes: 60 },
  { label: "6 horas", minutes: 360 },
  { label: "1 dia", minutes: 1440 },
  { label: "1 semana", minutes: 10080 },
] as const;

/* ===================== Métricas ===================== */
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
  "rightCalf",
  "leftCalf",
  "rightForearm",
  "leftForearm",
];

const PRIMARY_KEYS: readonly MetricKey[] = ["weight"];

type IconDef =
  | { kind: "lucide"; Icon: LucideIcon }
  | { kind: "image"; src: StaticImageData; alt?: string };

type MetricCfgItem = { label: string; unit: string; icon: IconDef };
type MetricCfg = Record<MetricKey, MetricCfgItem>;

const METRICS: MetricCfg = {
  height: { label: "Altura", unit: "cm", icon: { kind: "image", src: heightIcon, alt: "Altura" } },
  weight: { label: "Peso", unit: "kg", icon: { kind: "lucide", Icon: Weight } },
  chest: { label: "Peitoral", unit: "cm", icon: { kind: "image", src: chest, alt: "peito" } },
  rightBiceps: { label: "Bíceps direito", unit: "cm", icon: { kind: "lucide", Icon: BicepsFlexed } },
  leftBiceps: { label: "Bíceps esquerdo", unit: "cm", icon: { kind: "lucide", Icon: BicepsFlexed } },
  rightThigh: { label: "Coxa direita", unit: "cm", icon: { kind: "image", src: thigh1, alt: "Coxa" } },
  leftThigh: { label: "Coxa esquerda", unit: "cm", icon: { kind: "image", src: thigh1, alt: "Coxa" } },
  waist: { label: "Cintura", unit: "cm", icon: { kind: "image", src: waistIcon, alt: "Cintura" } },
  hips: { label: "Quadril", unit: "cm", icon: { kind: "image", src: hipsIcon, alt: "Quadril" } },
  shoulder: { label: "Ombro", unit: "cm", icon: { kind: "image", src: shoulders, alt: "Ombro" } },
  rightCalf: { label: "Panturrilha direita", unit: "cm", icon: { kind: "image", src: calf, alt: "Panturrilha" } },
  leftCalf: { label: "Panturrilha esquerda", unit: "cm", icon: { kind: "image", src: calf, alt: "Panturrilha" } },
  rightForearm: { label: "Antebraço direito", unit: "cm", icon: { kind: "image", src: forearm, alt: "Antebraço" } },
  leftForearm: { label: "Antebraço esquerdo", unit: "cm", icon: { kind: "image", src: forearm, alt: "Antebraço" } },
};

/* ===================== Utils ===================== */
function formatVal(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return Number.isFinite(v) ? String(v) : "—";
}

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

function fmtDateTimeBR(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function fmtDateDiff(diff?: { years: number; months: number; days: number } | null) {
  if (!diff) return "";
  const parts: string[] = [];
  if (diff.years > 0) parts.push(`${diff.years}a`);
  if (diff.months > 0) parts.push(`${diff.months}m`);
  if (diff.days > 0) parts.push(`${diff.days}d`);
  if (parts.length === 0) return "mesmo dia";
  return parts.join(" ");
}

/**
 * Contraste + invert no LIGHT:
 * - lucide: mais forte no light
 * - png: invert no light, normal no dark
 */
function MetricIcon({ icon, className }: { icon: IconDef; className?: string }) {
  if (icon.kind === "lucide") {
    const Ico = icon.Icon;
    return (
      <Ico
        className={className}
        strokeWidth={2}
        aria-hidden
      />
    );
  }

  return (
    <Image
      src={icon.src}
      alt={icon.alt ?? ""}
      width={20}
      height={20}
      className={`${className ?? ""} invert dark:invert-0`}
      priority={false}
    />
  );
}

function sortImagesByPosition(images: EvoImage[]) {
  return [...images].sort((a, b) => a.position - b.position);
}

function posLabel(position: number) {
  return position === 1 ? "Frente" : position === 2 ? "Lado" : position === 3 ? "Costas" : `Posição ${position}`;
}

/* ===================== Página ===================== */
export default function CompareInternalPage() {
  const { id1, id2 } = useParams<{ id1: string; id2: string }>();

  const evolutionAId = Number(id1);
  const evolutionBId = Number(id2);

  const [data, setData] = useState<CompareResponse | null>(null);
  const [detailA, setDetailA] = useState<EvolutionDetail | null>(null);
  const [detailB, setDetailB] = useState<EvolutionDetail | null>(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // ===== Share compare (popup) =====
  const [shareOpen, setShareOpen] = useState(false);
  const [shareTtlMinutes, setShareTtlMinutes] = useState<number>(60);
  const [shareIncludeImages, setShareIncludeImages] = useState<boolean>(true);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareErr, setShareErr] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareExpiresAt, setShareExpiresAt] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  // Lightbox por position (lado a lado)
  const [lbPos, setLbPos] = useState<number | null>(null);

  async function fetchAll() {
    if (!Number.isFinite(evolutionAId) || !Number.isFinite(evolutionBId)) {
      setErr("IDs inválidos na URL.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      const compareReq = api.get<CompareResponse>(`/evolution/compare/${evolutionAId}/${evolutionBId}`, {
        withCredentials: true,
      });

      const aReq = api.get<EvolutionDetail>(`/evolution/${evolutionAId}`, { withCredentials: true });
      const bReq = api.get<EvolutionDetail>(`/evolution/${evolutionBId}`, { withCredentials: true });

      const [compareRes, aRes, bRes] = await Promise.all([compareReq, aReq, bReq]);

      setData(compareRes.data);
      setDetailA(aRes.data);
      setDetailB(bRes.data);
    } catch (error) {
      if (isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 403) setErr("Você não tem permissão para comparar essas evoluções.");
        else setErr(error.response?.data?.message || error.message || "Falha ao carregar comparação");
      } else {
        setErr("Falha ao carregar comparação");
      }
      setData(null);
      setDetailA(null);
      setDetailB(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id1, id2]);

  const evo1 = data?.evolution1 ?? null;
  const evo2 = data?.evolution2 ?? null;
  const differences = data?.differences ?? null;

  const date1 = useMemo(() => (evo1?.date ? fmtDateShort(evo1.date) : "—"), [evo1?.date]);
  const date2 = useMemo(() => (evo2?.date ? fmtDateShort(evo2.date) : "—"), [evo2?.date]);

  const images1 = useMemo(() => sortImagesByPosition(detailA?.EvolutionImages ?? []), [detailA?.EvolutionImages]);
  const images2 = useMemo(() => sortImagesByPosition(detailB?.EvolutionImages ?? []), [detailB?.EvolutionImages]);

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

  const allPositions = useMemo(() => {
    const set = new Set<number>();
    images1.forEach((i) => set.add(i.position));
    images2.forEach((i) => set.add(i.position));
    return Array.from(set).sort((a, b) => a - b);
  }, [images1, images2]);

  function openShare() {
    setShareOpen(true);
    setShareErr(null);
    setShareUrl(null);
    setShareExpiresAt(null);
    setShareCopied(false);
  }

  async function generateCompareShare() {
    if (!Number.isFinite(evolutionAId) || !Number.isFinite(evolutionBId)) {
      setShareErr("IDs inválidos para compartilhar.");
      return;
    }

    setShareErr(null);
    setShareLoading(true);

    try {
      const body = {
        evolutionAId,
        evolutionBId,
        ttlMinutes: Number(shareTtlMinutes) || 60,
        includeImages: Boolean(shareIncludeImages),
      };

      const res = await api.post<ShareCompareResponse>("/share/evolution/compare", body, {
        withCredentials: true,
      });

      setShareUrl(res.data.url);
      setShareExpiresAt(res.data.expiresAt ?? null);
    } catch {
      setShareErr("Não foi possível gerar o link de compartilhamento da comparação.");
      setShareUrl(null);
      setShareExpiresAt(null);
    } finally {
      setShareLoading(false);
    }
  }

  async function copyShareLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1200);
    } catch {
      setShareCopied(false);
    }
  }

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

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        {/* Topbar */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="bg-muted/30 dark:bg-card/90 border-border/70 shadow-sm"
            >
              <Link href="/app/evolutions" aria-label="Voltar para lista de evoluções">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Link>
            </Button>
          </div>

          {/* Ações no desktop */}
          <div className="hidden sm:flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-muted/30 dark:bg-card/90 border-border/70 shadow-sm cursor-pointer"
              onClick={openShare}
              disabled={loading || !!err}
            >
              <Share2 className="mr-2 h-4 w-4" />
              Compartilhar
            </Button>
          </div>

          {/* Ações no mobile */}
          <div className="sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Mais ações" className="border-border/70 shadow-sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44 dark:bg-card/95 border-border/70 shadow-lg">
                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={openShare} disabled={loading || !!err}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Compartilhar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Erro */}
        {err && (
          <Card className="mb-4 border-border/70 bg-muted/35 dark:bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Não foi possível carregar
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-destructive">{err}</CardContent>
          </Card>
        )}

        {/* Loading */}
        {loading && (
          <Card className="border-border/70 bg-muted/35 dark:bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Carregando...
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Buscando dados da comparação.</CardContent>
          </Card>
        )}

        {/* Conteúdo */}
        {!loading && !err && evo1 && evo2 && differences && (
          <>
            <div className="relative w-full overflow-hidden rounded-2xl border border-border/70 bg-linear-to-br from-primary/20 via-primary/10 to-transparent h-12" />

            <section className="mx-auto -mt-10 sm:-mt-12 w-full">
              <div className="rounded-2xl border border-border/70 bg-muted/35 dark:bg-card/90 backdrop-blur p-4 sm:p-6 shadow-md">
                <div className="flex flex-col gap-1">
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Comparação de evoluções</h1>
                  <p className="text-sm text-muted-foreground">
                    {differences.dateDifference ? `tempo: ${fmtDateDiff(differences.dateDifference)}` : ""}
                  </p>
                </div>

                {/* Datas */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border/70 bg-muted/40 dark:bg-card/80 p-3">
                    <div className="text-sm sm:text-base font-semibold text-foreground">{date1}</div>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-muted/40 dark:bg-card/80 p-3">
                    <div className="text-sm sm:text-base font-semibold text-foreground">{date2}</div>
                  </div>
                </div>

                {/* Destaque: peso */}
                <div className="mt-5 grid grid-cols-1 gap-2 sm:gap-3">
                  {PRIMARY_KEYS.map((k) => {
                    const cfg = METRICS[k];
                    const v1 = evo1[k] as number | null;
                    const v2 = evo2[k] as number | null;

                    const hasV1 = typeof v1 === "number" && Number.isFinite(v1);
                    const hasV2 = typeof v2 === "number" && Number.isFinite(v2);

                    const raw = differences?.[k] as number | null | undefined;
                    const hasDiff = typeof raw === "number" && Number.isFinite(raw);

                    const showDiff = hasV1 && hasV2 && hasDiff;
                    const deltaAbs = showDiff ? Math.abs(raw) : 0;

                    const state = !showDiff
                      ? "text-muted-foreground"
                      : raw > 0
                        ? "text-emerald-700 dark:text-emerald-400"
                        : raw < 0
                          ? "text-rose-700 dark:text-rose-400"
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
                        className="rounded-xl border border-border/70 bg-muted/40 dark:bg-card/85 p-3 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <MetricIcon icon={cfg.icon} className="h-5 w-5 text-foreground dark:text-foreground/80" />
                          <span className="text-[11px] sm:text-xs text-muted-foreground">{cfg.label}</span>
                        </div>

                        <div className="mt-2 grid grid-cols-3 items-end gap-2">
                          <div className="text-base sm:text-lg font-semibold">
                            {formatVal(v1)} <span className="text-xs text-muted-foreground">{cfg.unit}</span>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{date1}</div>
                          </div>

                          <div className="text-center text-xs sm:text-sm font-medium">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 ${state} bg-background/60 dark:bg-white/5 border border-border/60`}
                            >
                              {badge}
                            </span>
                          </div>

                          <div className="text-right text-base sm:text-lg font-semibold">
                            {formatVal(v2)} <span className="text-xs text-muted-foreground">{cfg.unit}</span>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{date2}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Tabela medidas */}
                <div className="mt-6 space-y-2 sm:space-y-3">
                  <h2 className="text-xs sm:text-sm font-medium text-muted-foreground">Medidas</h2>

                  <div className="rounded-xl border border-border/70 overflow-hidden bg-muted/40 dark:bg-card/85">
                    <div className="grid grid-cols-4 bg-muted/50 dark:bg-card/80 px-3 py-2 text-[11px] sm:text-xs text-muted-foreground border-b border-border/70">
                      <div>Medida</div>
                      <div className="text-right">{date1}</div>
                      <div className="text-center">Diferença</div>
                      <div className="text-right">{date2}</div>
                    </div>

                    <div className="divide-y divide-border/70">
                      {METRIC_KEYS.filter((k) => !PRIMARY_KEYS.includes(k)).map((k) => {
                        const cfg = METRICS[k];

                        const a = evo1[k] as number | null;
                        const b = evo2[k] as number | null;

                        const hasA = typeof a === "number" && Number.isFinite(a);
                        const hasB = typeof b === "number" && Number.isFinite(b);

                        const raw = differences?.[k] as number | null | undefined;
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
                            ? "text-emerald-700 dark:text-emerald-400"
                            : raw < 0
                              ? "text-rose-700 dark:text-rose-400"
                              : "text-muted-foreground";

                        return (
                          <div key={k} className="grid grid-cols-4 px-3 py-2 items-center">
                            <div className="flex items-center gap-2">
                              <MetricIcon icon={cfg.icon} className="h-4 w-4 text-foreground dark:text-foreground/80" />
                              <span className="text-xs text-foreground/90">{cfg.label}</span>
                            </div>

                            <div className="text-right text-sm">
                              {formatVal(a)} <span className="text-[11px] text-muted-foreground">{cfg.unit}</span>
                            </div>

                            <div className="text-center text-xs">
                              <span
                                className={`inline-block rounded-full px-2 py-0.5 ${state} bg-background/60 dark:bg-white/5 border border-border/60`}
                              >
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

                {/* Mensagens */}
                {(evo1.message || evo2.message) && (
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {evo1.message ? (
                      <div className="rounded-xl border border-border/70 bg-muted/40 dark:bg-card/85 p-4">
                        <p className="text-sm text-foreground/90">
                          <span className="mr-1">📝</span>
                          {evo1.message}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{date1}</p>
                      </div>
                    ) : null}

                    {evo2.message ? (
                      <div className="rounded-xl border border-border/70 bg-muted/40 dark:bg-card/85 p-4">
                        <p className="text-sm text-foreground/90">
                          <span className="mr-1">📝</span>
                          {evo2.message}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{date2}</p>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Galerias */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">Fotos — {date1}</h3>
                    {images1.length === 0 ? (
                      <p className="mt-2 text-sm text-muted-foreground">Sem fotos nessa evolução.</p>
                    ) : (
                      <div className="mt-2 flex gap-2 sm:gap-3 overflow-x-auto no-scrollbar snap-x">
                        {images1.map((img) => (
                          <button
                            key={`A-${img.position}`}
                            type="button"
                            onClick={() => openCompareByPosition(img.position)}
                            className="snap-start shrink-0 w-28 sm:w-40 aspect-3/4 overflow-hidden rounded-lg border border-border/70 bg-muted/40 dark:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                            title={`${date1} — ${posLabel(img.position)}`}
                          >
                            <Image
                              src={img.url}
                              alt={`${date1} — ${posLabel(img.position)}`}
                              width={320}
                              height={426}
                              className="h-full w-full object-cover"
                              sizes="(max-width: 640px) 112px, 160px"
                              unoptimized
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">Fotos — {date2}</h3>
                    {images2.length === 0 ? (
                      <p className="mt-2 text-sm text-muted-foreground">Sem fotos nessa evolução.</p>
                    ) : (
                      <div className="mt-2 flex gap-2 sm:gap-3 overflow-x-auto no-scrollbar snap-x">
                        {images2.map((img) => (
                          <button
                            key={`B-${img.position}`}
                            type="button"
                            onClick={() => openCompareByPosition(img.position)}
                            className="snap-start shrink-0 w-28 sm:w-40 aspect-3/4 overflow-hidden rounded-lg border border-border/70 bg-muted/40 dark:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                            title={`${date2} — ${posLabel(img.position)}`}
                          >
                            <Image
                              src={img.url}
                              alt={`${date2} — ${posLabel(img.position)}`}
                              width={320}
                              height={426}
                              className="h-full w-full object-cover"
                              sizes="(max-width: 640px) 112px, 160px"
                              unoptimized
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ===== Pop-up de compartilhar comparação ===== */}
        <AlertDialog open={shareOpen} onOpenChange={(open) => !shareLoading && setShareOpen(open)}>
          <AlertDialogContent className="w-[calc(100svw-2rem)] max-w-[520px] p-4 sm:p-6 rounded-2xl sm:rounded-xl border-border/70  dark:bg-card/95 shadow-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>Compartilhar comparação</AlertDialogTitle>
              <AlertDialogDescription>Gere um link temporário para compartilhar esta comparação.</AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Tempo de expiração do link</label>
                  <select
                    value={String(shareTtlMinutes)}
                    onChange={(e) => setShareTtlMinutes(Number(e.target.value))}
                    className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                    disabled={shareLoading}
                  >
                    {TTL_OPTIONS.map((opt) => (
                      <option key={opt.minutes} value={String(opt.minutes)}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={shareIncludeImages}
                      onChange={(e) => setShareIncludeImages(e.target.checked)}
                      className="h-4 w-4"
                      disabled={shareLoading}
                    />
                    Incluir imagens
                  </label>
                </div>
              </div>

              {shareErr ? (
                <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300">
                  {shareErr}
                </div>
              ) : null}

              {shareUrl ? (
                <div className="rounded-md border border-border/70 bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <LinkIcon className="h-3.5 w-3.5" />
                        Link gerado
                      </div>

                      <a
                        href={shareUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium break-all underline underline-offset-2 text-foreground"
                      >
                        {shareUrl}
                      </a>

                      <div className="text-xs text-muted-foreground mt-1">Expira em: {fmtDateTimeBR(shareExpiresAt)}</div>
                    </div>

                    <button
                      type="button"
                      onClick={copyShareLink}
                      className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-muted/40 dark:bg-card px-3 py-2 text-sm hover:bg-accent cursor-pointer"
                      title="Copiar link"
                    >
                      <Copy className="h-4 w-4" />
                      {shareCopied ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={shareLoading} className="cursor-pointer">
                Fechar
              </AlertDialogCancel>

              <button
                type="button"
                onClick={generateCompareShare}
                disabled={shareLoading}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm disabled:opacity-60 cursor-pointer"
              >
                {shareLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                Gerar link
              </button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ===== Lightbox de comparação (lado a lado por position) ===== */}
        {lbPos !== null && (
          <CompareLightbox
            position={lbPos}
            allPositions={allPositions}
            leftTitle={date1}
            rightTitle={date2}
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
  const { position, allPositions, leftTitle, rightTitle, leftImages, rightImages, leftMap, rightMap, onClose, onPrev, onNext } =
    props;

  const leftIdx = leftMap.get(position) ?? -1;
  const rightIdx = rightMap.get(position) ?? -1;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
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
      className="fixed inset-0 z-50 bg-black/85 p-0 sm:p-4 grid place-items-center"
      onClick={onClose}
    >
      <div
        className="relative w-[min(96vw,1280px)] h-[min(88vh,calc(100svh-64px))] grid grid-cols-1 sm:grid-cols-2 gap-2 items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-3 right-3 sm:top-4 sm:right-4 rounded-full bg-white/15 hover:bg-white/25 text-white p-2 z-20 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <button
          onClick={onPrev}
          aria-label="Anterior"
          className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/15 hover:bg-white/25 text-white p-2 z-20 disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={allPositions.indexOf(position) <= 0}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <button
          onClick={onNext}
          aria-label="Próxima"
          className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/15 hover:bg-white/25 text-white p-2 z-20 disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={allPositions.indexOf(position) >= allPositions.length - 1}
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        <div className="relative w-full h-full rounded-lg overflow-hidden">
          {leftIdx >= 0 ? (
            <Image
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
            <div className="grid place-items-center w-full h-full text-white/80 text-sm">Sem foto nessa posição</div>
          )}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-center text-xs text-white/85">
            {leftTitle} • posição {position}
          </div>
        </div>

        <div className="relative w-full h-full rounded-lg overflow-hidden">
          {rightIdx >= 0 ? (
            <Image
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
            <div className="grid place-items-center w-full h-full text-white/80 text-sm">Sem foto nessa posição</div>
          )}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-center text-xs text-white/85">
            {rightTitle} • posição {position}
          </div>
        </div>
      </div>
    </div>
  );
}
