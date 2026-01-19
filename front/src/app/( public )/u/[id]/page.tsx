// app/u/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState, use as useUnwrap } from "react";
import { api } from "@/lib/api";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import eleva from "../../../../../public/imgs/eleva.png";
import {
  Weight,
  BicepsFlexed,
  // Smartphone,
  // Apple,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Link as LinkIcon,

} from "lucide-react";
import NextImage, { type StaticImageData } from "next/image";

// imagens estáticas (mesmo padrão da página de metrics)
import thigh1 from "../../../../../public/icones/thigh1.png";
import height from "../../../../../public/icones/height.png";
import waist from "../../../../../public/icones/waist.png";
import chest from "../../../../../public/icones/chest.png";
import hips from "../../../../../public/icones/hips.png";
import shoulders from "../../../../../public/icones/calf.png";
import calf from "../../../../../public/icones/hips.png";
import forearm from "../../../../../public/icones/forearm.png";

/* ===================== Tipos ===================== */
type SharedUser = {
  name: string;
  username: string;
  avatarUrl?: string | null;
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
  calf: number | null;
  forearm: number | null;
  message?: string | null;
  createdAt: string;
  updatedAt: string;
  images?: SharedImage[];
};

type ShareProfileResponse = {
  kind: "token" | "username";
  expiresAt?: string; // quando kind === "token"
  user: SharedUser;
  latestEvolution?: SharedEvolution | null;
};

/* ===================== Branding / Links ===================== */
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? "Eleva";
// const ANDROID_URL = process.env.NEXT_PUBLIC_ANDROID_URL ?? "";
// const IOS_URL = process.env.NEXT_PUBLIC_IOS_URL ?? "";
// const HAS_ANDROID = ANDROID_URL.length > 0;
// const HAS_IOS = IOS_URL.length > 0;

/* ===================== Métricas (padrão da metrics) ===================== */
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
  "calf",
  "forearm",
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

// function useCountdown(target?: string) {
//   const [now, setNow] = useState(() => Date.now());
//   useEffect(() => {
//     if (!target) return;
//     const t = setInterval(() => setNow(Date.now()), 1000);
//     return () => clearInterval(t);
//   }, [target]);

//   const { text, expired } = useMemo(() => {
//     if (!target) return { text: "", expired: false };
//     const ms = new Date(target).getTime() - now;
//     if (Number.isNaN(ms)) return { text: "", expired: false };
//     if (ms <= 0) return { text: "Expirado", expired: true };
//     const s = Math.floor(ms / 1000);
//     const hh = Math.floor(s / 3600);
//     const mm = Math.floor((s % 3600) / 60);
//     const ss = s % 60;
//     const parts: string[] = [];
//     if (hh) parts.push(String(hh).padStart(2, "0"));
//     parts.push(String(mm).padStart(2, "0"), String(ss).padStart(2, "0"));
//     return { text: `Expira em ${parts.join(":")}`, expired: false };
//   }, [target, now]);

//   return { text, expired };
// }

/* Renderizador unificado de ícones (igual ao da metrics) */
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
export default function SharedProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = useUnwrap(params); // Next 15: params é Promise

  const [data, setData] = useState<ShareProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Lightbox
  const [lbIndex, setLbIndex] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const res = await api.get<ShareProfileResponse>(
          `/share/profile/${encodeURIComponent(id)}`,
          { withCredentials: false }
        );
        if (!active) return;
        setErr(null);          // ok: dentro do callback async
        setData(res.data);
      } catch {
        if (!active) return;
        setErr("Link inválido ou perfil não encontrado.");
        setData(null);
      } finally {
        if (active) setLoading(false); // ok: dentro do callback async
      }
    })();

    return () => { active = false; };
  }, [id]);

  const evo = data?.latestEvolution ?? null;

  const dateStr = useMemo(() => {
    if (!evo?.date) return "";
    try {
      return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(evo.date));
    } catch {
      return "";
    }
  }, [evo]);

  const primary = PRIMARY_KEYS.map((k) => ({
    key: k,
    ...METRICS[k],
    value: evo ? (evo[k] as number | null) : null,
  }));

  const secondary = (METRIC_KEYS as readonly MetricKey[])
    .filter((k) => !PRIMARY_KEYS.includes(k))
    .map((k) => ({
      key: k,
      ...METRICS[k],
      value: evo ? (evo[k] as number | null) : null,
    }));

  const imagesSorted = useMemo(
    () => (evo?.images ? [...evo.images].sort((a, b) => a.position - b.position) : []),
    [evo]
  );


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
      <div className="min-h-dvh grid place-items-center bg-background">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-7 w-7 animate-spin text-foreground/80" />
          <div className="text-sm text-muted-foreground">
            Carregando o perfil do usuário…
          </div>
        </div>
      </div>
    );
  }

  /* ======= 2) ERRO / EXPIRADO ======= */
  if (!data || err || !id) {
    const msg = err || "Link inválido ou perfil não encontrado.";
    const hint = "Verifique se o endereço está correto ou se o link ainda é válido.";

    return (
      <div className="min-h-dvh grid place-items-center bg-background px-3">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-sm text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-300">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight mb-1">Não foi possível exibir o perfil</h1>
          <p className="text-sm text-muted-foreground">{msg}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>

          <div className="mt-4 flex items-center justify-center gap-2">
            <a
              href={'/'}
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs shadow hover:opacity-90"
            >
              <LinkIcon className="h-4 w-4" />
              <span>Compartilhe seu perfil</span>
            </a>
            {/* {ANDROID_URL ? (
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
            {/* {IOS_URL ? (
              <a
                href={IOS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 text-foreground px-3 py-1.5 text-xs backdrop-blur hover:bg-white/20"
              >
                <Apple className="h-4 w-4" />
                <span>Baixar no iOS</span>
              </a>
            ) : null} */}
          </div>
        </div>
      </div>
    );
  }

  /* ======= 3) CONTEÚDO NORMAL ======= */
  return (
    <div className="min-h-dvh bg-background ">
      {/* HERO (ajustado para deixar tudo mais alto na tela) */}
      <div
        className="relative w-full  overflow-hidden rounded-b-3xl border-b border-border bg-linear-to-br from-primary/20 via-primary/10 to-transparent h-36 sm:h-44"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >        {/* Brand bar (logo + CTAs) */}
        <div className="absolute inset-x-0 top-0 z-10 ">
          <div className="mx-auto w-full max-w-3xl px-3 sm:px-4 py-2 flex   items-center justify-end ">
            {/* LOGO placeholder */}
            <div className="flex items-center gap-2 bottom-3.5" >
              <div>
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

        {/* ornamento de fundo */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background:radial-gradient(40rem_40rem_at_20%_-10%,--theme(--color-primary/60),transparent_60%),radial-gradient(32rem_32rem_at_120%_20%,--theme(--color-primary/40),transparent_60%)]" />


      </div>

      {/* CARTÃO CENTRAL */}
      <section className="mx-auto -mt-16 sm:-mt-24 lg:-mt-28 w-full max-w-3xl px-3 sm:px-4 pb-8">
        <div className="rounded-2xl border border-border bg-card/90 backdrop-blur p-4 sm:p-6 shadow-md">
          {/* header do cartão */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div className="shrink-0 relative size-28 sm:size-32 -mt-12 sm:-mt-16 rounded-full ring-4 ring-background">
              {/* ⬇️ torne este wrapper relative para o fill funcionar */}
              <div className="relative size-full rounded-full overflow-hidden border border-border bg-muted">
                {data.user.avatarUrl ? (
                  <NextImage
                    src={data.user.avatarUrl}
                    alt={`${data.user.name} — foto de perfil`}
                    fill
                    sizes="(max-width: 640px) 112px, 128px" // size-28=112px, size-32=128px
                    className="object-cover object-center"
                    unoptimized // URLs assinadas do R2
                    priority
                  />
                ) : (
                  <div className="size-full grid place-items-center text-muted-foreground">
                    <svg viewBox="0 0 24 24" className="h-7 w-7">
                      <path
                        fill="currentColor"
                        d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                {data.user.name ?? "Usuário"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {data.user.username ? `@${data.user.username}` : ""}
              </p>

              {evo && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Última evolução: <span className="font-medium">{dateStr || "—"}</span>
                  {evo.goal ? <> • Objetivo: <span className="font-medium">{evo.goal}</span></> : null}
                </p>
              )}
            </div>
          </div>

          {/* destaques */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {primary.map(({ key, label, unit, icon, value }) => (
              <div
                key={String(key)}
                className="rounded-xl border border-border bg-linear-to-br from-primary/10 to-transparent p-3 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <MetricIcon icon={icon} className="h-5 w-5 text-foreground/80" />
                  <span className="text-[11px] sm:text-xs text-muted-foreground">{label}</span>
                </div>
                <div className="mt-2 text-xl sm:text-2xl font-semibold">
                  {formatVal(value)} <span className="text-xs sm:text-sm text-muted-foreground">{unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* demais medidas */}
          <div className="mt-6 space-y-2 sm:space-y-3">
            <h2 className="text-xs sm:text-sm font-medium text-muted-foreground">Medidas</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
              {secondary.map(({ key, label, unit, icon, value }) => (
                <div key={String(key)} className="rounded-xl border border-border bg-card p-3">
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

          {/* mensagem */}
          {evo?.message ? (
            <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-sm">
                <span className="mr-1">📝</span>
                {evo.message}
              </p>
            </div>
          ) : null}

          {/* galeria (scroll horizontal no mobile) */}
          {imagesSorted.length ? (
            <div className="mt-6 space-y-2 sm:space-y-3">
              <h2 className="text-xs sm:text-sm font-medium text-muted-foreground">Fisico atual</h2>
              <div className="flex gap-2 sm:gap-3 overflow-x-auto no-scrollbar snap-x">
                {imagesSorted.map((img, i) => (
                  <button
                    key={img.position}
                    type="button"
                    onClick={() => openLightbox(i)}
                    // ⬇️ precisa ser relative para o fill funcionar
                    className="relative snap-start shrink-0 w-28 sm:w-40 aspect-3/4 overflow-hidden rounded-lg border border-border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    title={`Ver posição ${img.position} em tela cheia`}
                  >
                    <NextImage
                      src={img.url}
                      alt={`Posição ${img.position}`}
                      fill
                      // w-28 = 112px; sm:w-40 = 160px
                      sizes="(max-width: 640px) 112px, 160px"
                      className="object-cover"
                      loading="lazy"
                    // NextImage não usa 'decoding'; remova essa prop
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* rodapé simples da página pública */}
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Página pública de compartilhamento — {BRAND_NAME}
        </p>
      </section>

      {/* LIGHTBOX (otimizado) */}
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

/* ===================== Lightbox (rápido) ===================== */
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
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    images.forEach((im) => {
      const pre = new window.Image();
      pre.decoding = "async";
      pre.loading = "eager";
      pre.src = im.url;
    });
  }, [images]);

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overscroll-contain"
      onClick={onClose}
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div
        className="relative w-[min(92vw,1280px)] h-[88svh] max-h-[88svh] flex items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >

        {/* PILHA DE IMAGENS (fica abaixo no z-index) */}
        <div className="relative z-10 w-[92vw] h-[88vh] max-w-[92vw] max-h-[88vh]">
          {images.map((img, i) => {
            const visible = i === index;
            const near = Math.abs(i - index) <= 1;

            return (
              <div
                key={img.url}
                className={`absolute inset-0 transition-opacity duration-150 ${visible ? "opacity-100" : "opacity-0 pointer-events-none"
                  }`}
              >
                <NextImage
                  src={img.url}
                  alt={`Foto ${img.position}`}
                  fill
                  sizes="92vw"
                  className="object-contain rounded-lg shadow-2xl"
                  priority={near}
                  draggable={false}
                />
              </div>
            );
          })}
        </div>

        {/* BOTÕES (z maior) */}
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute -top-1 right-12 sm:top-2 sm:right-2 z-30 rounded-full bg-black/80 hover:bg-white/20 text-white p-2"
        >
          <X className="h-5 w-5" />
        </button>

        <button
          onClick={onPrev}
          aria-label="Anterior"
          disabled={index <= 0}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 rounded-full bg-white/10 hover:bg-white/20 text-white p-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <button
          onClick={onNext}
          aria-label="Próxima"
          disabled={index >= images.length - 1}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 rounded-full bg-white/10 hover:bg-white/20 text-white p-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        {/* LEGENDA (também acima) */}
        <div
          className="absolute z-30 left-1/2 -translate-x-1/2 text-center text-xs text-white/80"
          style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          Foto {images[index].position} • {index + 1} / {images.length}
        </div>
      </div>
    </div>
  );
}