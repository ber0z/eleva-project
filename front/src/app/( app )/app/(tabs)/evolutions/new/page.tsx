"use client";

import { FormEvent, useEffect, useMemo, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, ImagePlus, CalendarIcon, X } from "lucide-react";

type GoalPreset =
  | "gain_muscle"
  | "lose_fat"
  | "recomposition"
  | "maintain"
  | "increase_strength"
  | "improve_endurance"
  | "improve_health";

const GOAL_OPTIONS: { value: GoalPreset; label: string }[] = [
  { value: "gain_muscle", label: "Ganhar massa muscular" },
  { value: "lose_fat", label: "Perder gordura" },
  { value: "recomposition", label: "Recomposição corporal" },
  { value: "maintain", label: "Manutenção" },
  { value: "increase_strength", label: "Aumentar força" },
  { value: "improve_endurance", label: "Melhorar resistência" },
  { value: "improve_health", label: "Melhorar saúde geral" },
];

function isGoalPreset(v: string): v is GoalPreset {
  return (GOAL_OPTIONS as Array<{ value: string }>).some((o) => o.value === v);
}

export default function EvolutionNewPage() {
  const router = useRouter();
  const dateInputRef = useRef<HTMLInputElement | null>(null);

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
  const [shoulder, setShoulder] = useState<string>("");
  const [rightCalf, setRightCalf] = useState<string>("");
  const [leftCalf, setLeftCalf] = useState<string>("");
  const [rightForearm, setRightForearm] = useState<string>("");
  const [leftForearm, setLeftForearm] = useState<string>("");

  const [message, setMessage] = useState<string>("");
  const [goal, setGoal] = useState<GoalPreset | "">("");

  // novas imagens
  const [imageFront, setImageFront] = useState<File | null>(null);
  const [imageSide, setImageSide] = useState<File | null>(null);
  const [imageBack, setImageBack] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // previews das novas imagens
  const newFrontPreview = useObjectURL(imageFront);
  const newSidePreview = useObjectURL(imageSide);
  const newBackPreview = useObjectURL(imageBack);

  function appendIf(fd: FormData, key: string, v: string) {
    if (v !== "" && v != null) fd.append(key, v);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;

    if (!date || !weight) {
      setErr("Os campos data e peso são obrigatórios.");
      return;
    }

    setSaving(true);
    setErr(null);
    try {
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
      appendIf(fd, "shoulder", shoulder);
      appendIf(fd, "rightCalf", rightCalf);
      appendIf(fd, "leftCalf", leftCalf);
      appendIf(fd, "rightForearm", rightForearm);
      appendIf(fd, "leftForearm", leftForearm);

      appendIf(fd, "message", message);
      appendIf(fd, "goal", goal);

      if (imageFront) fd.append("imageFront", imageFront);
      if (imageSide) fd.append("imageSide", imageSide);
      if (imageBack) fd.append("imageBack", imageBack);

      await api.post("/evolution", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      router.replace("/app/evolutions");
      router.refresh();
    } catch (error) {
      if (isAxiosError(error)) {
        setErr(error.response?.data?.message || error.message || "Falha ao criar evolução");
      } else {
        setErr("Falha ao criar evolução");
      }
    } finally {
      setSaving(false);
    }
  }

  // carrega altura, meta e seta a data de hoje
  useEffect(() => {
    async function loadGoalAndHeight() {
      try {
        const res = await api.get<{
          height: number | null;
          currentGoal: string | null;
        }>("/user/goal-and-height");

        const { height, currentGoal } = res.data;

        setHeight((prev) => prev || (height != null ? String(height) : ""));
        setGoal((prev) => {
          if (prev) return prev;
          if (currentGoal && isGoalPreset(currentGoal)) return currentGoal;
          return "";
        });

        setDate((prev) => {
          if (prev) return prev;
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, "0");
          const day = String(now.getDate()).padStart(2, "0");
          return `${year}-${month}-${day}`;
        });
      } catch (error) {
        // deixa silencioso, mas você pode mostrar um aviso se quiser
        console.error("Erro ao carregar altura e meta:", error);
      } finally {
        setLoadingInitial(false);
      }
    }

    loadGoalAndHeight();
  }, []);

  return (
    <div
      className="
        min-h-svh bg-background text-foreground
        [background:radial-gradient(70rem_40rem_at_50%_-10%,--theme(--color-primary/14),transparent_60%),radial-gradient(40rem_30rem_at_100%_10%,--theme(--color-ring/10),transparent_55%)]
      "
    >
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        {/* Header */}
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="shrink-0 bg-card/90 hover:bg-accent border-border/30 shadow-sm"
            >
              <Link href="/app/evolutions">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Link>
            </Button>
            <h1 className="truncate text-xl font-semibold">Nova evolução</h1>
          </div>
        </div>

        {/* Erro */}
        {err && (
          <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/15 px-3 py-2 text-sm text-destructive">
            {err}
          </div>
        )}

        {/* Card */}
        <Card className=" bg-card/95 shadow-sm">
          <CardHeader >
            <CardTitle className="text-card-foreground">Dados da evolução</CardTitle>
          </CardHeader>

          <CardContent>
            {loadingInitial ? (
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
                      className="text-foreground/90 after:ml-0.5 after:text-destructive after:content-['*']"
                    >
                      Data
                    </Label>

                    <Input
                      id="date"
                      type="date"
                      required
                      ref={dateInputRef}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="
                        mt-1 h-11 w-full rounded-xl pr-10
                        bg-background/90 text-foreground
                        border border-border/30
                        placeholder:text-foreground/40
                        focus-visible:ring-2 focus-visible:ring-ring/50
                        [&::-webkit-calendar-picker-indicator]:opacity-0
                      "
                    />

                    <button
                      type="button"
                      aria-label="Abrir seletor de data"
                      onClick={() => dateInputRef.current?.showPicker?.()}
                      className="
                        absolute right-2 top-[calc(59%+0.5rem)] -translate-y-1/2 z-10
                        flex h-8 w-8 items-center justify-center rounded-md
                        text-foreground/70 hover:text-foreground
                        hover:bg-accent/60
                      "
                    >
                      <CalendarIcon className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="min-w-0">
                    <Label
                      htmlFor="weight"
                      className="text-foreground/90 after:ml-0.5 after:text-destructive after:content-['*']"
                    >
                      Peso (kg)
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
                      className="
                        mt-1 h-11 w-full rounded-xl
                        bg-background/90 text-foreground
                        border border-border/30
                        placeholder:text-foreground/40
                        focus-visible:ring-2 focus-visible:ring-ring/50
                      "
                    />
                  </div>
                </div>

                {/* Altura / Peitoral */}
                <div className="grid grid-cols-2 gap-4">
                  <NumberField
                    id="height"
                    required
                    label={
                      <>
                        <span>Altura (cm)</span>
                        <span className="ml-0.5 text-destructive">*</span>
                      </>
                    }
                    value={height}
                    setValue={setHeight}
                    placeholder="Ex.: 170"
                  />
                  <NumberField id="chest" label="Peitoral (cm)" value={chest} setValue={setChest} />
                </div>

                {/* Bíceps D/E */}
                <div className="grid grid-cols-2 gap-4">
                  <NumberField
                    id="rightBiceps"
                    label="Bíceps dir. (cm)"
                    value={rightBiceps}
                    setValue={setRightBiceps}
                  />
                  <NumberField
                    id="leftBiceps"
                    label="Bíceps esq. (cm)"
                    value={leftBiceps}
                    setValue={setLeftBiceps}
                  />
                </div>

                {/* Coxa D/E */}
                <div className="grid grid-cols-2 gap-4">
                  <NumberField id="rightThigh" label="Coxa dir. (cm)" value={rightThigh} setValue={setRightThigh} />
                  <NumberField id="leftThigh" label="Coxa esq. (cm)" value={leftThigh} setValue={setLeftThigh} />
                </div>

                {/* Cintura / Quadril */}
                <div className="grid grid-cols-2 gap-4">
                  <NumberField id="waist" label="Cintura (cm)" value={waist} setValue={setWaist} />
                  <NumberField id="hips" label="Quadril (cm)" value={hips} setValue={setHips} />
                </div>

                {/* Panturrilha D/E */}
                <div className="grid grid-cols-2 gap-4">
                  <NumberField
                    id="rightCalf"
                    label="Panturrilha dir. (cm)"
                    value={rightCalf}
                    setValue={setRightCalf}
                  />
                  <NumberField
                    id="leftCalf"
                    label="Panturrilha esq. (cm)"
                    value={leftCalf}
                    setValue={setLeftCalf}
                  />
                </div>

                {/* Antebraço D/E */}
                <div className="grid grid-cols-2 gap-4">
                  <NumberField
                    id="rightForearm"
                    label="Antebraço dir. (cm)"
                    value={rightForearm}
                    setValue={setRightForearm}
                  />
                  <NumberField
                    id="leftForearm"
                    label="Antebraço esq. (cm)"
                    value={leftForearm}
                    setValue={setLeftForearm}
                  />
                </div>

                {/* Ombro */}
                <div className="grid grid-cols-2 gap-4">
                  <NumberField id="shoulder" label="Ombro (cm)" value={shoulder} setValue={setShoulder} />
                </div>

                {/* Mensagem + Meta */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="message" className="text-foreground/90">
                      Mensagem / Observações
                    </Label>
                    <Textarea
                      id="message"
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(String(e.target.value))}
                      placeholder="Anotações opcionais..."
                      className="
                        mt-1 rounded-xl
                        bg-background/90 text-foreground
                        border border-border/30
                        placeholder:text-foreground/40
                        focus-visible:ring-2 focus-visible:ring-ring/50
                      "
                      maxLength={500}
                    />
                  </div>

                  <div>
                    <Label htmlFor="goal" className="text-foreground/90">
                      Meta atual
                    </Label>

                    <select
                      id="goal"
                      value={goal}
                      onChange={(e) => setGoal(e.target.value as GoalPreset | "")}
                      className="
                        mt-1 h-12 w-full rounded-xl
                        border border-border/30
                        bg-background/90 text-foreground
                        px-4 py-3 outline-none
                        focus-visible:ring-2 focus-visible:ring-ring/50
                      "
                    >
                      <option value="">Selecione...</option>
                      {GOAL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Imagens */}
                <div className="grid gap-4">
                  <h3 className="text-sm font-semibold text-foreground/90">Fotos</h3>

                  <ImageRow
                    label="Frente"
                    currentUrl={null}
                    newPreview={newFrontPreview}
                    onFile={(f) => setImageFront(f)}
                  />
                  <ImageRow
                    label="Lado"
                    currentUrl={null}
                    newPreview={newSidePreview}
                    onFile={(f) => setImageSide(f)}
                  />
                  <ImageRow
                    label="Costas"
                    currentUrl={null}
                    newPreview={newBackPreview}
                    onFile={(f) => setImageBack(f)}
                  />
                </div>

                {/* Ações */}
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                  <Button asChild variant="outline" className="w-full sm:w-auto border-border/30 bg-card/90 hover:bg-accent shadow-sm">
                    <Link href="/app/evolutions">Cancelar</Link>
                  </Button>

                  <Button type="submit" disabled={saving} className="w-full sm:w-auto cursor-pointer shadow-sm">
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar evolução"
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

/* ---------- hooks/helpers ---------- */

function useObjectURL(file: File | null) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);
  return url;
}

/* ---------- componentes auxiliares ---------- */

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
      <Label htmlFor={id} className="text-foreground/90">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        step={step}
        min="0"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="
          mt-1 h-11 rounded-xl
          bg-background/90 text-foreground
          border border-border/30
          placeholder:text-foreground/40
          focus-visible:ring-2 focus-visible:ring-ring/50
        "
      />
    </div>
  );
}

type ImageRowProps = {
  label: string;
  currentUrl: string | null;
  newPreview: string | null;
  onFile: (f: File | null) => void;
};

export function ImageRow({ label, currentUrl, newPreview, onFile }: ImageRowProps) {
  const src = newPreview ?? currentUrl ?? "";
  const isPreview = src.startsWith("blob:") || src.startsWith("data:");
  const hasImage = !!(newPreview || currentUrl);
  const buttonText = hasImage ? "Trocar" : "Adicionar";

  return (
    <div className="w-full max-w-full overflow-hidden rounded-xl border border-border/60 bg-card p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        {/* THUMB */}
        <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted/50">
          {src ? (
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
            <div className="grid h-full w-full place-items-center text-xs text-foreground/60">
              Sem foto
            </div>
          )}

          <span className="pointer-events-none absolute left-1 top-1 rounded-md bg-background px-1.5 py-0.5 text-[10px] font-semibold text-foreground border border-border/50">
            {label}
          </span>

          <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-border/80" />
        </div>

        {/* INFO (escondido no mobile) */}
        <div className="hidden min-w-0 flex-1 sm:block">
          <div className="truncate text-sm font-medium text-foreground">
            {newPreview ? "Nova imagem selecionada" : currentUrl ? "Imagem atual" : "Sem imagem"}
          </div>
          {!newPreview && (
            <div className="mt-0.5 text-xs text-muted-foreground">Formatos: JPG / PNG / WEBP</div>
          )}
        </div>

        {/* AÇÕES */}
        <div className="ml-auto flex shrink-0 items-center gap-2 self-center">
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl border border-border/60 bg-card px-3 text-sm text-foreground hover:bg-accent shadow-sm">
            <ImagePlus className="h-4 w-4" />
            <span>{buttonText}</span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </label>

          {newPreview && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => onFile(null)}
              className="h-10 px-2 hover:bg-accent/60"
              title="Remover pré-visualização"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Remover nova</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
