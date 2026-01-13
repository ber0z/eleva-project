// app/app/evolutions/[id]/edit/page.tsx
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, ImagePlus, CalendarIcon, X } from "lucide-react";

type EvoImage = { id: number; position: number; url: string };

type EvolutionDetail = {
  id: number;
  idUser: number;
  date: string; // ISO
  goal?: "gain" | "lose" | "maintain" | string | null;
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

export default function EvolutionEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // form state
  const [date, setDate] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [rightBiceps, setRightBiceps] = useState<string>("");
  const [leftBiceps, setLeftBiceps] = useState<string>("");
  const [rightThigh, setRightThigh] = useState<string>("");
  const [leftThigh, setLeftThigh] = useState<string>("");
  const [waist, setWaist] = useState<string>("");
  const [hips, setHips] = useState<string>("");
  const [chest, setChest] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [goal, setGoal] = useState<string>("");

  // imagens atuais
  const [imgFrontUrl, setImgFrontUrl] = useState<string | null>(null);
  const [imgSideUrl, setImgSideUrl] = useState<string | null>(null);
  const [imgBackUrl, setImgBackUrl] = useState<string | null>(null);

  // novas imagens (upload)
  const [imageFront, setImageFront] = useState<File | null>(null);
  const [imageSide, setImageSide] = useState<File | null>(null);
  const [imageBack, setImageBack] = useState<File | null>(null);

  // flags de remoção (enviadas pro back)
  const [removeFront, setRemoveFront] = useState(false);
  const [removeSide, setRemoveSide] = useState(false);
  const [removeBack, setRemoveBack] = useState(false);

  // ux
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  // carrega dados
  useEffect(() => {
    async function load() {
      setErr(null);
      setOkMsg(null);
      setLoading(true);
      try {
        const res = await api.get<EvolutionDetail>(`/evolution/${id}`);
        const evo = res.data;

        setDate(toDateInput(evo.date));
        setHeight(optNum(evo.height));
        setWeight(optNum(evo.weight));
        setRightBiceps(optNum(evo.rightBiceps));
        setLeftBiceps(optNum(evo.leftBiceps));
        setRightThigh(optNum(evo.rightThigh));
        setLeftThigh(optNum(evo.leftThigh));
        setWaist(optNum(evo.waist));
        setHips(optNum(evo.hips));
        setChest(optNum(evo.chest));
        setMessage(evo.message ?? "");
        setGoal(evo.goal ? String(evo.goal) : "");

        const imgs = (evo.EvolutionImages ?? []).reduce<Record<number, string>>(
          (acc, it) => {
            acc[it.position] = it.url;
            return acc;
          },
          {}
        );
        setImgFrontUrl(imgs[1] ?? null);
        setImgSideUrl(imgs[2] ?? null);
        setImgBackUrl(imgs[3] ?? null);

        // zera uploads e flags de remoção
        setImageFront(null);
        setImageSide(null);
        setImageBack(null);
        setRemoveFront(false);
        setRemoveSide(false);
        setRemoveBack(false);
      } catch (error) {
        if (isAxiosError(error)) {
          setErr(
            error.response?.data?.message ||
              error.message ||
              "Falha ao carregar evolução"
          );
        } else {
          setErr("Falha ao carregar evolução");
        }
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  function toDateInput(iso: string) {
    try {
      return new Date(iso).toISOString().slice(0, 10);
    } catch {
      return iso.slice(0, 10);
    }
  }
  function optNum(n: number | null): string {
    return n == null ? "" : String(n);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setOkMsg(null);

    if (!date || !weight) {
      setErr("Os campos data e peso são obrigatórios.");
      return;
    }

    try {
      setSaving(true);
      const fd = new FormData();
      fd.append("date", date);
      fd.append("weight", weight);
      appendIf(fd, "height", height);
      appendIf(fd, "rightBiceps", rightBiceps);
      appendIf(fd, "leftBiceps", leftBiceps);
      appendIf(fd, "rightThigh", rightThigh);
      appendIf(fd, "leftThigh", leftThigh);
      appendIf(fd, "waist", waist);
      appendIf(fd, "hips", hips);
      appendIf(fd, "chest", chest);
      appendIf(fd, "message", message);
      appendIf(fd, "goal", goal.trim());

      // uploads novos
      if (imageFront) fd.append("imageFront", imageFront);
      if (imageSide) fd.append("imageSide", imageSide);
      if (imageBack) fd.append("imageBack", imageBack);

      // flags de remoção (o back espera removeImageFront/Side/Back: true)
      if (removeFront) fd.append("removeImageFront", "true");
      if (removeSide) fd.append("removeImageSide", "true");
      if (removeBack) fd.append("removeImageBack", "true");

      await api.put(`/evolution/${id}`, fd);
      setOkMsg("Evolução atualizada com sucesso.");
      router.replace(`/app/evolutions/${id}`);
      router.refresh();
    } catch (error) {
      if (isAxiosError(error)) {
        setErr(
          error.response?.data?.message ||
            error.message ||
            "Falha ao salvar evolução"
        );
      } else {
        setErr("Falha ao salvar evolução");
      }
    } finally {
      setSaving(false);
    }
  }

  // previews das novas imagens (sem setState no effect)
  const newFrontPreview = useObjectURL(imageFront);
  const newSidePreview = useObjectURL(imageSide);
  const newBackPreview = useObjectURL(imageBack);

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        {/* Header */}
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="bg-card shrink-0"
            >
              <Link href={`/app/evolutions/${id}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Link>
            </Button>
            <h1 className="truncate text-xl font-semibold">Editar evolução</h1>
          </div>
        </div>

        {/* Erro / Sucesso */}
        {err && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {err}
          </div>
        )}
        {okMsg && (
          <div className="mb-4 rounded-lg border border-emerald-300/50 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
            {okMsg}
          </div>
        )}

        {/* Form */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-card-foreground">
              Dados da evolução
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid gap-4">
                {Array.from({ length: 11 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <form onSubmit={onSubmit} className="grid gap-4">
                {/* Data / Peso */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <Label
                      htmlFor="date"
                      className="after:ml-0.5 after:text-destructive after:content-['*']"
                    >
                      Data{" "}
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="mt-1 h-11 w-full rounded-xl pr-10
               [&::-webkit-calendar-picker-indicator]:opacity-0"
                    />

                    <CalendarIcon
                      className="pointer-events-none absolute right-3 top-[calc(59%+0.5rem)]
               -translate-y-1/2 h-4 w-4 text-muted-foreground z-10"
                    />
                  </div>

                  <div className="min-w-0">
                    <Label
                      htmlFor="weight"
                      className="after:ml-0.5 after:text-destructive after:content-['*']"
                    >
                      Peso (kg){" "}
                    </Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      min="0"
                      required
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="Ex.: 72,4"
                      className="mt-1 h-11 w-full rounded-xl"
                    />
                  </div>
                </div>

                {/* Altura / Peitoral */}
                <div className="grid grid-cols-2 gap-4">
                  <NumberField
                    id="height"
                    required={true}
                    label={
                      <>
                        <span>Altura (cm)</span>
                        <span className="ml-0.5 text-destructive">*</span>
                      </>
                    }
                    value={height}
                    placeholder="Ex.: 170"
                    setValue={setHeight}
                  />
                  <NumberField
                    id="chest"
                    label="Peitoral (cm)"
                    value={chest}
                    setValue={setChest}
                  />
                </div>

                {/* Bíceps D/E (mesma linha) */}
                <div className="grid grid-cols-2 gap-4">
                  <NumberField
                    id="rightBiceps"
                    label="Bíceps direito (cm)"
                    value={rightBiceps}
                    setValue={setRightBiceps}
                  />
                  <NumberField
                    id="leftBiceps"
                    label="Bíceps esquerdo (cm)"
                    value={leftBiceps}
                    setValue={setLeftBiceps}
                  />
                </div>

                {/* Coxa D/E (mesma linha) */}
                <div className="grid grid-cols-2 gap-4">
                  <NumberField
                    id="rightThigh"
                    label="Coxa direita (cm)"
                    value={rightThigh}
                    setValue={setRightThigh}
                  />
                  <NumberField
                    id="leftThigh"
                    label="Coxa esquerda (cm)"
                    value={leftThigh}
                    setValue={setLeftThigh}
                  />
                </div>

                {/* Cintura / Quadril (mesma linha) */}
                <div className="grid grid-cols-2 gap-4">
                  <NumberField
                    id="waist"
                    label="Cintura (cm)"
                    value={waist}
                    setValue={setWaist}
                  />
                  <NumberField
                    id="hips"
                    label="Quadril (cm)"
                    value={hips}
                    setValue={setHips}
                  />
                </div>
                {/* Mensagem + Meta atual (lado a lado) */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {/* Mensagem ocupa 2 colunas no sm */}
                  <div className="sm:col-span-2">
                    <Label htmlFor="message">Mensagem / Observações</Label>
                    <Textarea
                      id="message"
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Anotações opcionais..."
                      className="mt-1 rounded-xl"
                      maxLength={500}
                    />
                  </div>

                  {/* Meta atual (texto) */}
                  <div>
                    <Label htmlFor="goal">Meta atual</Label>
                    <Input
                      id="goal"
                      type="text"
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      placeholder="Ex.: cutting, hipertrofia, manutenção"
                      autoComplete="off"
                      className="mt-1 h-11 w-full rounded-xl"
                      maxLength={250}
                    />
                  </div>
                </div>

                {/* Imagens */}
                <div className="grid gap-4">
                  <h3 className="text-sm font-semibold">Fotos </h3>

                  <ImageRow
                    label="Frente"
                    currentUrl={imgFrontUrl}
                    newPreview={newFrontPreview}
                    removeFlag={removeFront}
                    onFile={(f) => {
                      setImageFront(f);
                      if (f) setRemoveFront(false); // nova imagem cancela remoção
                    }}
                    onToggleRemove={(on) => {
                      setRemoveFront(on);
                      if (on) setImageFront(null); // se marcou pra remover, tira upload novo
                    }}
                  />

                  <ImageRow
                    label="Lado"
                    currentUrl={imgSideUrl}
                    newPreview={newSidePreview}
                    removeFlag={removeSide}
                    onFile={(f) => {
                      setImageSide(f);
                      if (f) setRemoveSide(false);
                    }}
                    onToggleRemove={(on) => {
                      setRemoveSide(on);
                      if (on) setImageSide(null);
                    }}
                  />

                  <ImageRow
                    label="Costas"
                    currentUrl={imgBackUrl}
                    newPreview={newBackPreview}
                    removeFlag={removeBack}
                    onFile={(f) => {
                      setImageBack(f);
                      if (f) setRemoveBack(false);
                    }}
                    onToggleRemove={(on) => {
                      setRemoveBack(on);
                      if (on) setImageBack(null);
                    }}
                  />
                </div>

                {/* Ações */}
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    <Link href={`/app/evolutions/${id}`}>Cancelar</Link>
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="w-full sm:w-auto cursor-pointer"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar alterações"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function appendIf(fd: FormData, key: string, v: string) {
  if (v !== "" && v != null) fd.append(key, v);
}

// versão sem setState no effect (evita warning)
function useObjectURL(file: File | null) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);
  return url;
}

function NumberField({
  id,
  label,
  value,
  setValue,
  step = "0.1",
  required = false,
  placeholder = "",
}: {
  id: string;
  label: React.ReactNode;
  value: string;
  setValue: (v: string) => void;
  step?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        step={step}
        min="0"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="mt-1 h-11 rounded-xl"
        required={required}
        placeholder={placeholder}
      />
    </div>
  );
}

/* ---------- ImageRow com remover ---------- */

type ImageRowProps = {
  label: string;
  currentUrl: string | null;
  newPreview: string | null;
  removeFlag: boolean;
  onFile: (f: File | null) => void;
  onToggleRemove: (remove: boolean) => void;
};

export function ImageRow({
  label,
  currentUrl,
  newPreview,
  removeFlag,
  onFile,
  onToggleRemove,
}: ImageRowProps) {
  const src = newPreview ?? currentUrl ?? "";
  const isPreview = src.startsWith("blob:") || src.startsWith("data:");
  const hasServerImage = !!currentUrl;
  const hasNewImage = !!newPreview;
  const hasAnyImage = hasServerImage || hasNewImage;
  const buttonText = hasAnyImage && !removeFlag ? "Trocar" : "Adicionar";

  return (
    <div className="w-full max-w-full overflow-hidden rounded-xl border bg-card/40 p-3">
      <div className="flex flex-wrap items-center gap-4">
        {/* THUMB */}
        <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg border bg-muted/30">
          {src && !removeFlag ? (
            <Image
              src={src}
              alt={`Foto ${label}`}
              fill
              sizes="80px"
              className="object-cover"
              unoptimized={isPreview}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.opacity = "0.4";
              }}
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
              {removeFlag ? "Remover" : "Sem foto"}
            </div>
          )}
          <span className="pointer-events-none absolute left-1 top-1 rounded-md bg-background/70 px-1.5 py-0.5 text-[10px] font-medium">
            {label}
          </span>
          <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-border/60" />
        </div>

        {/* INFO (escondido no mobile) */}
        <div className="hidden min-w-0 flex-1 sm:block">
          <div className="truncate text-sm font-medium">
            {removeFlag
              ? "A foto vai ser excluída"
              : newPreview
              ? "nova imagem selecionada"
              : currentUrl
              ? "Imagem atual"
              : "Sem imagem"}
          </div>
          {!removeFlag && (
            <div className="mt-0.5 text-xs text-muted-foreground">
              {newPreview ? "" : "Formatos: JPG / PNG / WEBP"}
            </div>
          )}
        </div>

        {/* AÇÕES */}
        <div className="ml-auto flex shrink-0 items-center gap-2 self-center">
          {/* Adicionar / Trocar */}
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl border border-input bg-background px-3 text-sm hover:bg-accent">
            <ImagePlus className="h-4 w-4" />
            <span>{buttonText}</span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                onFile(f);
                if (f) onToggleRemove(false); // nova imagem → cancela remoção
              }}
            />
          </label>

          {/* Remover / Cancelar remoção */}
          {removeFlag ? (
            <Button
              type="button"
              variant="ghost"
              className="h-10 px-2"
              onClick={() => onToggleRemove(false)}
              title="Cancelar remoção"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cancelar remoção</span>
            </Button>
          ) : hasAnyImage ? (
            <Button
              type="button"
              variant="outline"
              className="h-10 cursor-pointer"
              onClick={() => onToggleRemove(true)}
              title="Remover imagem atual do servidor"
            >
              Remover
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
