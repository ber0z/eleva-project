"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";
import { ArrowLeft, Dumbbell, Save, Link as LinkIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";


const inputBase =
  "w-full max-w-full rounded-md border border-border/30 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1 min-w-0">
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function toNullable(v: string) {
  const s = (v ?? "").trim();
  return s.length ? s : null;
}

function isValidUrlOrEmpty(v: string) {
  const s = (v ?? "").trim();
  if (!s) return true;
  try {
    // validação simples; seu backend valida com zod também
    new URL(s);
    return true;
  } catch {
    return false;
  }
}

export default function ExerciseCreatePage() {
  const router = useRouter();

  // form fields
  const [name, setName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("");
  const [equipment, setEquipment] = useState("");
  const [difficultyLevel, setDifficultyLevel] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const canSave = useMemo(() => name.trim().length > 0 && name.trim().length <= 255, [name]);

  const videoUrlOk = useMemo(() => isValidUrlOrEmpty(videoUrl), [videoUrl]);

  const nameError = useMemo(() => {
    const s = name.trim();
    if (!touched) return null;
    if (!s) return "Nome é obrigatório.";
    if (s.length > 255) return "Nome muito longo (máx. 255).";
    return null;
  }, [name, touched]);

  const videoError = useMemo(() => {
    if (!touched) return null;
    if (!videoUrlOk) return "URL inválida.";
    if (videoUrl.trim().length > 1024) return "URL muito longa (máx. 1024).";
    return null;
  }, [videoUrlOk, videoUrl, touched]);

  function buildPayload() {
    // segue seu schema: opcionais podem ser null/undefined
    // aqui vamos mandar null quando vazio (mais previsível no back)
    return {
      name: name.trim(),
      muscleGroup: toNullable(muscleGroup),
      equipment: toNullable(equipment),
      difficultyLevel: toNullable(difficultyLevel),
      type: toNullable(type),
      description: toNullable(description),
      videoUrl: toNullable(videoUrl),
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);

    if (!canSave || !videoUrlOk) return;

    setSaving(true);
    setSaveErr(null);

    try {
      const payload = buildPayload();

      await api.post("/exercise", payload);

      router.push(`/admin/exercises`);
    } catch (error) {
      if (isAxiosError(error)) setSaveErr(error.response?.data?.message || error.message || "Falha ao criar exercício");
      else setSaveErr("Falha ao criar exercício");
    } finally {
      setSaving(false);
    }
  }


  return (
    <div className="min-h-svh bg-background text-foreground overflow-x-hidden">
      <div className="mx-auto w-full max-w-3xl px-3 sm:px-4 py-5 sm:py-6 pb-28">
        {/* Top bar */}
        <div className="mb-3 sm:mb-4 flex flex-wrap items-center justify-between gap-2">
          <Button variant="outline" className="bg-card cursor-pointer" onClick={() => router.push("/admin/exercises")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          <Button type="submit" className="cursor-pointer" form="exercise-create-form" disabled={saving || !canSave || !videoUrlOk}>
            <Save className="mr-2 h-4 w-4 " />
            {saving ? "Salvando..." : "Criar"}
          </Button>
        </div>

        {/* Layout diferente: cabeçalho + cartão com seção principal e seção opcional */}
        <div className="mb-4">
          <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            Novo exercício
          </h1>
          <p className="text-sm text-muted-foreground">
            Preencha o nome e, se quiser, complemente com informações do catálogo.
          </p>
        </div>

        {/* Form */}
        <form id="exercise-create-form" onSubmit={onSubmit} className="grid gap-3">
          {/* Card principal */}
          <Card className="overflow-hidden">
            <div className="bg-primary/10 px-4 sm:px-6 py-4 border-b border-border/30">
              <h2 className="text-sm font-semibold">Dados principais</h2>
              <p className="text-xs text-muted-foreground">O nome é obrigatório.</p>
            </div>

            <CardContent className="grid gap-4 pt-5 px-4 sm:px-6">
              {saveErr ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {saveErr}
                </div>
              ) : null}

              <div className="grid gap-3">
                <Field label="Nome *">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => setTouched(true)}
                    className={inputBase}
                    placeholder="Ex.: Agachamento Livre"
                    maxLength={255}
                  />
                  {nameError ? (
                    <p className="mt-1 text-xs text-destructive">{nameError}</p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">{name.trim().length}/255</p>
                  )}
                </Field>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Grupo muscular (opcional)">
                    <input
                      value={muscleGroup}
                      onChange={(e) => setMuscleGroup(e.target.value)}
                      className={inputBase}
                      placeholder="Ex.: Quadríceps"
                      maxLength={64}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">{muscleGroup.trim().length}/64</p>
                  </Field>

                  <Field label="Equipamento (opcional)">
                    <input
                      value={equipment}
                      onChange={(e) => setEquipment(e.target.value)}
                      className={inputBase}
                      placeholder="Ex.: Barra"
                      maxLength={64}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">{equipment.trim().length}/64</p>
                  </Field>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card “detalhes” com visual diferente */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-primary" />
                  Detalhes e mídia
                </span>


              </CardTitle>

            </CardHeader>

            <CardContent className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Dificuldade (opcional)">
                  <input
                    value={difficultyLevel}
                    onChange={(e) => setDifficultyLevel(e.target.value)}
                    className={inputBase}
                    placeholder="Ex.: Intermediário"
                    maxLength={64}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">{difficultyLevel.trim().length}/64</p>
                </Field>

                <Field label="Tipo (opcional)">
                  <input
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className={inputBase}
                    placeholder="Ex.: Força"
                    maxLength={64}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">{type.trim().length}/64</p>
                </Field>

                <Field label="Vídeo URL (opcional)">
                  <input
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    onBlur={() => setTouched(true)}
                    className={inputBase}
                    placeholder="https://..."
                    maxLength={1024}
                    inputMode="url"
                  />
                  {videoError ? (
                    <p className="mt-1 text-xs text-destructive">{videoError}</p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">{videoUrl.trim().length}/1024</p>
                  )}
                </Field>
              </div>

              <Field label="Descrição (opcional)">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`${inputBase} min-h-28`}
                  placeholder="Exercício composto focado em quadríceps e glúteos..."
                  maxLength={1024}
                />
                <p className="mt-1 text-xs text-muted-foreground">{description.trim().length}/1024</p>
              </Field>

            </CardContent>
          </Card>
        </form>

        {saving ? (
          <div className="mt-3">
            <Card>
              <CardContent className="py-4">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="mt-2 h-3 w-64" />
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}
