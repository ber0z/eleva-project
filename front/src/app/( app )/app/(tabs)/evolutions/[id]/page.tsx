// app/app/evolutions/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";
import Image from "next/image";

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

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

import {
  ArrowLeft,
  Pencil,
  Trash2,
  Calendar,
  Ruler,
  Scale,
  Activity,
  Loader2,
  MoreVertical,
  Share2,
  Copy,
  Link as LinkIcon,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type EvoImage = {
  id: number;
  position: number; // 1=frente, 2=lado, 3=costas
  url: string;
};

type EvolutionDetail = {
  id: number;
  idUser: number;
  date: string; // ISO
  goal: "gain" | "lose" | "maintain" | string | null;
  height: number | null;
  weight: number;
  rightBiceps: number | null;
  leftBiceps: number | null;
  rightThigh: number | null;
  leftThigh: number | null;
  waist: number | null;
  hips: number | null;
  chest: number | null;
  message: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  EvolutionImages: EvoImage[];
};

type ShareEvolutionBody = {
  evolutionId: number;
  ttlMinutes: number;
  images: boolean;
};

type ShareEvolutionResponse = {
  url: string;
  expiresAt?: string;
  tokenHash?: string;
};

const TTL_OPTIONS = [
  { label: "15 min", minutes: 15 },
  { label: "1 hora", minutes: 60 },
  { label: "6 horas", minutes: 360 },
  { label: "1 dia", minutes: 1440 },
  { label: "1 semana", minutes: 10080 },
] as const;

function fmtDateTimeBR(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function posLabel(pos: number) {
  return pos === 1 ? "Frente" : pos === 2 ? "Lado" : pos === 3 ? "Costas" : `Posição ${pos}`;
}

export default function EvolutionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [data, setData] = useState<EvolutionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ===== Share evolution (popup) =====
  const [shareOpen, setShareOpen] = useState(false);
  const [shareTtlMinutes, setShareTtlMinutes] = useState<number>(15);
  const [shareImages, setShareImages] = useState<boolean>(true);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);
  const [sharedExpiresAt, setSharedExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // ===== Lightbox (tela cheia) =====
  const [lbIndex, setLbIndex] = useState<number | null>(null);

  async function copyShareUrl(urlToCopy?: string | null) {
    const text = urlToCopy ?? sharedUrl;
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  async function generateEvolutionShare() {
    if (!data) return;
    setShareError(null);
    setSharing(true);

    try {
      const body: ShareEvolutionBody = {
        evolutionId: data.id,
        ttlMinutes: Number(shareTtlMinutes) || 15,
        images: Boolean(shareImages),
      };

      const res = await api.post<ShareEvolutionResponse>("/share/evolution", body, { withCredentials: true });

      if (!res.data?.url) {
        setShareError("A API não retornou a URL do compartilhamento.");
        return;
      }

      setSharedUrl(res.data.url);
      setSharedExpiresAt(res.data.expiresAt ?? null);
    } catch (error) {
      if (isAxiosError(error)) {
        setShareError(error.response?.data?.message || error.message || "Não foi possível gerar o link.");
      } else {
        setShareError("Não foi possível gerar o link.");
      }
    } finally {
      setSharing(false);
    }
  }

  // Carousel
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const api2 = carouselApi;
    if (!api2) return;
    const onSelect = () => setCurrentSlide(api2.selectedScrollSnap());
    setCurrentSlide(api2.selectedScrollSnap());
    api2.on("select", onSelect);
    return () => {
      api2.off("select", onSelect);
    };
  }, [carouselApi]);

  async function fetchData() {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.get<EvolutionDetail>(`/evolution/${id}`);
      setData(res.data);
    } catch (error) {
      if (isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 403 || status === 404) {
          setErr("Evolução não encontrada");
          setData(null);
        } else {
          setErr(error.response?.data?.message || error.message || "Falha ao carregar evolução");
        }
      } else {
        setErr("Falha ao carregar evolução");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const images = useMemo(
    () => (data?.EvolutionImages ?? []).slice().sort((a, b) => a.position - b.position),
    [data]
  );

  function fmtDate(iso?: string) {
    if (!iso) return "-";
    try {
      const fmt = new Intl.DateTimeFormat("pt-BR", {
        timeZone: "UTC",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      return fmt.format(new Date(iso));
    } catch {
      return iso;
    }
  }

  function fmtNum(n?: number | null, suffix = "") {
    if (n == null) return "-";
    return `${Number(n).toLocaleString("pt-BR")}${suffix ? ` ${suffix}` : ""}`;
  }

  async function handleDelete() {
    if (!data) return;
    setDeleting(true);
    setErr(null);
    try {
      await api.delete(`/evolution/${data.id}`);
      setConfirmOpen(false);
      router.replace("/app/evolutions");
      router.refresh();
    } catch (error) {
      setDeleting(false);
      setConfirmOpen(false);
      if (isAxiosError(error)) {
        setErr(error.response?.data?.message || error.message || "Falha ao excluir evolução");
      } else {
        setErr("Falha ao excluir evolução");
      }
    }
  }

  const canShare = !!data && !loading;

  // ===== Lightbox handlers =====
  function openLightbox(idx: number) {
    setLbIndex(idx);
  }
  function closeLightbox() {
    setLbIndex(null);
  }
  function prevLightbox() {
    setLbIndex((i) => {
      if (i == null) return i;
      return (i - 1 + images.length) % images.length;
    });
  }
  function nextLightbox() {
    setLbIndex((i) => {
      if (i == null) return i;
      return (i + 1) % images.length;
    });
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        {/* Topbar */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Button asChild variant="outline" size="sm" className="bg-card shrink-0">
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
              className="bg-card cursor-pointer"
              disabled={!canShare}
              onClick={() => {
                setShareError(null);
                setSharedUrl(null);
                setSharedExpiresAt(null);
                setCopied(false);
                setShareOpen(true);
              }}
              title="Compartilhar evolução"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Compartilhar
            </Button>

            {data && (
              <Button asChild variant="outline" size="sm" className="bg-card">
                <Link href={`/app/evolutions/${data.id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Link>
              </Button>
            )}

            <Button
              variant="destructive"
              size="sm"
              disabled={!data || deleting}
              className="bg-red-600 text-white hover:bg-red-700 cursor-pointer"
              title="Excluir evolução"
              onClick={() => setConfirmOpen(true)}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </>
              )}
            </Button>
          </div>

          {/* Ações no mobile */}
          <div className="sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Mais ações">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-40">
                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem
                  disabled={!canShare}
                  onClick={() => {
                    setShareError(null);
                    setSharedUrl(null);
                    setSharedExpiresAt(null);
                    setCopied(false);
                    setShareOpen(true);
                  }}
                >
                  <Share2 className="mr-2 h-4 w-4 " />
                  Compartilhar
                </DropdownMenuItem>

                {data && (
                  <DropdownMenuItem asChild>
                    <Link href={`/app/evolutions/${data.id}/edit`} className="flex bg-card items-center">
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </Link>
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem className="text-red-600 focus:text-red-700 cursor-pointer" onClick={() => setConfirmOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Chips */}
        {!loading && data && (
          <div
            className="
              mb-3 overflow-x-auto whitespace-nowrap
              [-ms-overflow-style:'none'] [scrollbar-width:'none']
              [&::-webkit-scrollbar]:hidden
              text-xs text-muted-foreground
            "
          >
            <span className="mr-2 inline-flex items-center gap-1 rounded-lg bg-muted/50 px-2 py-0.5">
              <Calendar className="h-3 w-3" />
              Criado: {fmtDate(data.createdAt)}
            </span>
          </div>
        )}

        {/* Erro */}
        {err && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Erro</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-destructive">{err}</CardContent>
          </Card>
        )}

        {/* Loading */}
        {loading && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Carregando...
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Buscando dados da evolução.</CardContent>
          </Card>
        )}

        {/* Conteúdo */}
        {!loading && data && (
          <>
            {/* Resumo */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-normal text-muted-foreground">
                    <Calendar className="mr-1 inline h-4 w-4" />
                    Data da Evolução - {fmtDate(data.date)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-border p-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Scale className="h-4 w-4" /> Peso
                    </div>
                    <div className="mt-1 text-lg font-semibold">{fmtNum(data.weight, "kg")}</div>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Ruler className="h-4 w-4" /> Altura
                    </div>
                    <div className="mt-1 text-lg font-semibold">{fmtNum(data.height, "cm")}</div>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <div className="text-xs text-muted-foreground">Objetivo</div>
                    <div className="mt-1 text-xs font-semibold capitalize">{data.goal ?? "-"}</div>
                  </div>
                </div>
                {data.message && (
                  <div className="mt-4 rounded-xl border border-border p-3">
                    <div className="text-xs text-muted-foreground">Mensagem</div>
                    <p className="mt-1 text-sm">{data.message}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Medidas */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Medidas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Metric label="Bíceps direito" value={data.rightBiceps} suffix="cm" />
                  <Metric label="Bíceps esquerdo" value={data.leftBiceps} suffix="cm" />
                  <Metric label="Coxa direita" value={data.rightThigh} suffix="cm" />
                  <Metric label="Coxa esquerda" value={data.leftThigh} suffix="cm" />
                  <Metric label="Cintura" value={data.waist} suffix="cm" />
                  <Metric label="Quadril" value={data.hips} suffix="cm" />
                  <Metric label="Peitoral" value={data.chest} suffix="cm" />
                </div>
              </CardContent>
            </Card>

            {/* Fotos */}
            <Card>
              <CardHeader>
                <CardTitle>Fotos</CardTitle>
              </CardHeader>
              <CardContent>
                {images.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma foto enviada para esta evolução.</p>
                ) : (
                  <>
                    <Carousel opts={{ align: "start", loop: true }} setApi={setCarouselApi} className="w-full">
                      <CarouselContent className="-ml-3">
                        {images.map((img, idx) => (
                          <CarouselItem key={img.id} className="pl-3 basis-[88%] sm:basis-[60%] lg:basis-[45%]">
                            <figure className="rounded-xl border overflow-hidden bg-card">
                              <button
                                type="button"
                                onClick={() => openLightbox(idx)}
                                className="block w-full cursor-zoom-in"
                                aria-label={`Abrir foto em tela cheia: ${posLabel(img.position)}`}
                              >
                                <Image
                                  src={img.url}
                                  alt={`Foto: ${posLabel(img.position)}`}
                                  width={300}
                                  height={400}
                                  className="aspect-3/4 w-full object-cover"
                                  onError={(e) => {
                                    const el = e.currentTarget as HTMLImageElement;
                                    el.style.opacity = "0.4";
                                    el.alt = "Não foi possível carregar a imagem (URL expirada). Recarregue a página.";
                                  }}
                                />
                              </button>

                              {/* ✅ Nome abaixo da foto */}
                              <div className="border-t border-border px-3 py-2 text-center">
                                <span className="text-xs font-medium text-muted-foreground">
                                  {posLabel(img.position)}
                                </span>
                              </div>
                            </figure>
                          </CarouselItem>
                        ))}
                      </CarouselContent>

                      <CarouselPrevious aria-label="Imagem anterior" />
                      <CarouselNext aria-label="Próxima imagem" />
                    </Carousel>

                    <div className="mt-2 text-center text-xs text-muted-foreground">
                      {currentSlide + 1} / {images.length}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* ===== Lightbox (Tela cheia) ===== */}
        {lbIndex !== null && images[lbIndex] && (
          <Lightbox
            src={images[lbIndex].url}
            title={posLabel(images[lbIndex].position)}
            index={lbIndex}
            total={images.length}
            onClose={closeLightbox}
            onPrev={prevLightbox}
            onNext={nextLightbox}
          />
        )}

        {/* ===== Dialog: Compartilhar evolução ===== */}
        <AlertDialog open={shareOpen} onOpenChange={(open) => !sharing && setShareOpen(open)}>
          <AlertDialogContent className="w-[calc(100svw-2rem)] max-w-[calc(100svw-1rem)] sm:max-w-[520px] rounded-2xl sm:rounded-xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 cursor-pointer">
                <Share2 className="h-5 w-5" />
                Compartilhar evolução
              </AlertDialogTitle>
              <AlertDialogDescription>
                Escolha o tempo de validade e se deseja incluir imagens. Depois, gere e copie o link.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Tempo de expiração do link</label>
                  <select
                    value={String(shareTtlMinutes)}
                    onChange={(e) => setShareTtlMinutes(Number(e.target.value))}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                    disabled={sharing}
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
                      checked={shareImages}
                      onChange={(e) => setShareImages(e.target.checked)}
                      className="h-4 w-4"
                      disabled={sharing}
                    />
                    Incluir imagens
                  </label>
                </div>
              </div>

              {shareError ? (
                <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-600 dark:text-rose-300">
                  {shareError}
                </div>
              ) : null}

              {sharedUrl ? (
                <div className="rounded-md border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <LinkIcon className="h-3.5 w-3.5" />
                        Link gerado
                      </div>
                      <a
                        href={sharedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium break-all underline underline-offset-2"
                      >
                        {sharedUrl}
                      </a>
                      <div className="text-xs text-muted-foreground mt-1">
                        Expira em: {fmtDateTimeBR(sharedExpiresAt)}
                      </div>
                    </div>

                    <Button variant="outline" onClick={() => copyShareUrl()} disabled={!sharedUrl}>
                      <Copy className="mr-2 h-4 w-4" />
                      {copied ? "Copiado!" : "Copiar"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  Clique em <span className="font-medium">Gerar link</span> para criar o compartilhamento.
                </div>
              )}
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel className="cursor-pointer" disabled={sharing} onClick={() => setShareOpen(false)}>
                Fechar
              </AlertDialogCancel>

              <Button onClick={generateEvolutionShare} className="cursor-pointer" disabled={!data || sharing}>
                {sharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
                Gerar link
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de confirmação: excluir */}
        <AlertDialog open={confirmOpen} onOpenChange={(open) => !deleting && setConfirmOpen(open)}>
          <AlertDialogContent className="w-[calc(100svw-2rem)] max-w-[calc(100svw-1rem)] p-4 sm:p-6 sm:mx-0 sm:w-full sm:max-w-[480px] cursor-pointer rounded-2xl sm:rounded-xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir evolução ?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação é permanente e removerá todos os dados e imagens desta evolução.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
              <Button className="bg-red-600 hover:bg-red-700 cursor-pointer" onClick={handleDelete} disabled={deleting}>
                {deleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  "Excluir"
                )}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

/* ===================== Lightbox component ===================== */

function Lightbox({
  src,
  title,
  index,
  total,
  onClose,
  onPrev,
  onNext,
}: {
  src: string;
  title: string;
  index: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, onPrev, onNext]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] bg-black/90"
      onClick={onClose}
    >
      {/* ✅ topo: só o X (mais baixo) */}
      <div className="absolute inset-x-0 top-6 sm:top-5 z-10 flex justify-end px-3 sm:px-4">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="rounded-full bg-white/10 hover:bg-white/20 text-white p-2"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* navegação */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onPrev();
        }}
        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/10 hover:bg-white/20 text-white p-2"
        aria-label="Anterior"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/10 hover:bg-white/20 text-white p-2"
        aria-label="Próxima"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* ✅ conteúdo: imagem + legenda abaixo */}
      <div
        className="h-full w-full grid place-items-center p-3 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-3">
          <img
            src={src}
            alt={title}
            className="max-h-[82svh] max-w-[96vw] object-contain select-none"
            draggable={false}
          />

          {/* ✅ legenda abaixo da foto */}
          <div className="text-white/80 text-xs sm:text-sm text-center">
            {title} • {index + 1}/{total}
          </div>
        </div>
      </div>
    </div>
  );
}


function Metric({
  label,
  value,
  suffix,
  valueText,
}: {
  label: string;
  value?: number | null;
  suffix?: string;
  valueText?: string;
}) {
  const display =
    valueText ??
    (value == null ? "-" : `${Number(value).toLocaleString("pt-BR")}${suffix ? ` ${suffix}` : ""}`);

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{display}</div>
    </div>
  );
}
