"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Loader2, CheckCircle2,
  HeartPulse, Dumbbell, Utensils, Sparkles,
} from "lucide-react";

type ExperienceLevel = "beginner" | "intermediate" | "advanced";
type WorkoutTime = "morning" | "afternoon" | "evening" | "flexible";
type ActivityLevel = "sedentary" | "lightly_active" | "moderately_active" | "very_active";
type StressLevel = "low" | "moderate" | "high";

type AnamnesisData = {
  healthConditions?: string | null;
  medications?: string | null;
  injuries?: string | null;
  physicalLimitations?: string | null;
  experienceLevel?: ExperienceLevel | null;
  workoutsPerWeek?: number | null;
  preferredWorkoutTime?: WorkoutTime | null;
  availableEquipment?: string | null;
  dietaryRestrictions?: string | null;
  foodAllergies?: string | null;
  likedFoods?: string | null;
  dislikedFoods?: string | null;
  mealFrequency?: number | null;
  waterIntakeMl?: number | null;
  occupation?: string | null;
  dailyActivityLevel?: ActivityLevel | null;
  stressLevel?: StressLevel | null;
  mainGoal?: string | null;
  motivation?: string | null;
  notes?: string | null;
};

/** Grupo de botões para substituir o <select> nativo */
function ButtonGroup({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-2">
      <Label className="text-foreground/90">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(active ? "" : o.value)}
              className={[
                "px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-150",
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background/80 text-foreground/70 border-border/30 hover:border-border/60 hover:text-foreground",
              ].join(" ")}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TextareaField({
  id, label, value, onChange, placeholder, maxLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-foreground/90">{label}</Label>
      <Textarea
        id={id}
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="mt-1 rounded-xl bg-background/90 text-foreground border border-border/30 placeholder:text-foreground/40 focus-visible:ring-2 focus-visible:ring-ring/50"
      />
    </div>
  );
}

function NumberField({
  id, label, value, onChange, min, max, placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-foreground/90">{label}</Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 h-11 rounded-xl bg-background/90 text-foreground border border-border/30 placeholder:text-foreground/40 focus-visible:ring-2 focus-visible:ring-ring/50"
      />
    </div>
  );
}

export default function AnamnesisPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exists, setExists] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [healthConditions, setHealthConditions] = useState("");
  const [medications, setMedications] = useState("");
  const [injuries, setInjuries] = useState("");
  const [physicalLimitations, setPhysicalLimitations] = useState("");

  const [experienceLevel, setExperienceLevel] = useState("");
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState("");
  const [preferredWorkoutTime, setPreferredWorkoutTime] = useState("");
  const [availableEquipment, setAvailableEquipment] = useState("");

  const [dietaryRestrictions, setDietaryRestrictions] = useState("");
  const [foodAllergies, setFoodAllergies] = useState("");
  const [likedFoods, setLikedFoods] = useState("");
  const [dislikedFoods, setDislikedFoods] = useState("");
  const [mealFrequency, setMealFrequency] = useState("");
  const [waterIntakeMl, setWaterIntakeMl] = useState("");

  const [occupation, setOccupation] = useState("");
  const [dailyActivityLevel, setDailyActivityLevel] = useState("");
  const [stressLevel, setStressLevel] = useState("");
  const [mainGoal, setMainGoal] = useState("");
  const [motivation, setMotivation] = useState("");
  const [notes, setNotes] = useState("");

  function fill(data: AnamnesisData) {
    setHealthConditions(data.healthConditions ?? "");
    setMedications(data.medications ?? "");
    setInjuries(data.injuries ?? "");
    setPhysicalLimitations(data.physicalLimitations ?? "");
    setExperienceLevel(data.experienceLevel ?? "");
    setWorkoutsPerWeek(data.workoutsPerWeek != null ? String(data.workoutsPerWeek) : "");
    setPreferredWorkoutTime(data.preferredWorkoutTime ?? "");
    setAvailableEquipment(data.availableEquipment ?? "");
    setDietaryRestrictions(data.dietaryRestrictions ?? "");
    setFoodAllergies(data.foodAllergies ?? "");
    setLikedFoods(data.likedFoods ?? "");
    setDislikedFoods(data.dislikedFoods ?? "");
    setMealFrequency(data.mealFrequency != null ? String(data.mealFrequency) : "");
    setWaterIntakeMl(data.waterIntakeMl != null ? String(data.waterIntakeMl) : "");
    setOccupation(data.occupation ?? "");
    setDailyActivityLevel(data.dailyActivityLevel ?? "");
    setStressLevel(data.stressLevel ?? "");
    setMainGoal(data.mainGoal ?? "");
    setMotivation(data.motivation ?? "");
    setNotes(data.notes ?? "");
  }

  useEffect(() => {
    api
      .get<AnamnesisData>("/anamnesis", { withCredentials: true })
      .then((res) => { setExists(true); fill(res.data); })
      .catch((e) => { if (isAxiosError(e) && e.response?.status === 404) setExists(false); })
      .finally(() => setLoading(false));
  }, []);

  function buildPayload(): AnamnesisData {
    return {
      healthConditions: healthConditions || null,
      medications: medications || null,
      injuries: injuries || null,
      physicalLimitations: physicalLimitations || null,
      experienceLevel: (experienceLevel as ExperienceLevel) || null,
      workoutsPerWeek: workoutsPerWeek !== "" ? parseInt(workoutsPerWeek) : null,
      preferredWorkoutTime: (preferredWorkoutTime as WorkoutTime) || null,
      availableEquipment: availableEquipment || null,
      dietaryRestrictions: dietaryRestrictions || null,
      foodAllergies: foodAllergies || null,
      likedFoods: likedFoods || null,
      dislikedFoods: dislikedFoods || null,
      mealFrequency: mealFrequency !== "" ? parseInt(mealFrequency) : null,
      waterIntakeMl: waterIntakeMl !== "" ? parseInt(waterIntakeMl) : null,
      occupation: occupation || null,
      dailyActivityLevel: (dailyActivityLevel as ActivityLevel) || null,
      stressLevel: (stressLevel as StressLevel) || null,
      mainGoal: mainGoal || null,
      motivation: motivation || null,
      notes: notes || null,
    };
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setErr(null);
    setSuccess(false);
    try {
      const payload = buildPayload();
      if (exists) {
        await api.put("/anamnesis", payload, { withCredentials: true });
      } else {
        await api.post("/anamnesis", payload, { withCredentials: true });
        setExists(true);
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setErr(isAxiosError(error) ? (error.response?.data?.message || error.message || "Falha ao salvar anamnese") : "Falha ao salvar anamnese");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "mt-1 h-11 rounded-xl bg-background/90 text-foreground border border-border/30 placeholder:text-foreground/40 focus-visible:ring-2 focus-visible:ring-ring/50";

  return (
    <div className="min-h-svh bg-background text-foreground [background:radial-gradient(70rem_40rem_at_50%_-10%,--theme(--color-primary/14),transparent_60%)]">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm" className="shrink-0 bg-card/90 hover:bg-accent border-border/30 shadow-sm">
            <Link href="/app/home">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Anamnese</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Suas informações de saúde e preferências pessoais</p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex gap-3 items-start">
          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            Essas informações são usadas pelo <span className="text-foreground font-medium">Assistente IA</span> para sugerir treinos e dietas mais personalizados para você. Quanto mais completo, melhor.
          </p>
        </div>

        {err && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/15 px-3 py-2 text-sm text-destructive">
            {err}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Anamnese salva com sucesso!
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="bg-card/95 shadow-sm">
                <CardHeader><Skeleton className="h-5 w-40 rounded" /></CardHeader>
                <CardContent className="grid gap-4">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <Skeleton key={j} className="h-10 w-full rounded-xl" />
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">

            {/* Histórico de saúde */}
            <Card className="bg-card/95 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <HeartPulse className="h-4 w-4 text-rose-500" />
                  Histórico de saúde
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <TextareaField id="healthConditions" label="Condições de saúde" value={healthConditions} onChange={setHealthConditions} placeholder="Ex.: hipertensão, diabetes..." maxLength={1024} />
                <TextareaField id="medications" label="Medicamentos em uso" value={medications} onChange={setMedications} placeholder="Ex.: metformina, losartana..." maxLength={512} />
                <TextareaField id="injuries" label="Lesões passadas ou atuais" value={injuries} onChange={setInjuries} placeholder="Ex.: lesão no joelho esquerdo..." maxLength={512} />
                <TextareaField id="physicalLimitations" label="Limitações físicas" value={physicalLimitations} onChange={setPhysicalLimitations} placeholder="Ex.: dor lombar crônica..." maxLength={512} />
              </CardContent>
            </Card>

            {/* Experiência fitness */}
            <Card className="bg-card/95 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-orange-500" />
                  Experiência fitness
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <ButtonGroup
                  label="Nível de experiência"
                  value={experienceLevel}
                  onChange={setExperienceLevel}
                  options={[
                    { value: "beginner", label: "Iniciante" },
                    { value: "intermediate", label: "Intermediário" },
                    { value: "advanced", label: "Avançado" },
                  ]}
                />
                <ButtonGroup
                  label="Horário preferido de treino"
                  value={preferredWorkoutTime}
                  onChange={setPreferredWorkoutTime}
                  options={[
                    { value: "morning", label: "Manhã" },
                    { value: "afternoon", label: "Tarde" },
                    { value: "evening", label: "Noite" },
                    { value: "flexible", label: "Flexível" },
                  ]}
                />
                <NumberField id="workoutsPerWeek" label="Treinos por semana" value={workoutsPerWeek} onChange={setWorkoutsPerWeek} min={0} max={14} placeholder="Ex.: 4" />
                <TextareaField id="availableEquipment" label="Equipamentos disponíveis" value={availableEquipment} onChange={setAvailableEquipment} placeholder="Ex.: halteres, barra, esteira..." maxLength={512} />
              </CardContent>
            </Card>

            {/* Preferências alimentares */}
            <Card className="bg-card/95 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Utensils className="h-4 w-4 text-emerald-500" />
                  Preferências alimentares
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <TextareaField id="dietaryRestrictions" label="Restrições alimentares" value={dietaryRestrictions} onChange={setDietaryRestrictions} placeholder="Ex.: vegetariano, sem glúten..." maxLength={512} />
                  <TextareaField id="foodAllergies" label="Alergias alimentares" value={foodAllergies} onChange={setFoodAllergies} placeholder="Ex.: amendoim, lactose..." maxLength={512} />
                  <TextareaField id="likedFoods" label="Alimentos que gosta" value={likedFoods} onChange={setLikedFoods} placeholder="Ex.: frango, arroz, frutas..." maxLength={1024} />
                  <TextareaField id="dislikedFoods" label="Alimentos que não gosta" value={dislikedFoods} onChange={setDislikedFoods} placeholder="Ex.: brócolis, fígado..." maxLength={1024} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <NumberField id="mealFrequency" label="Refeições por dia" value={mealFrequency} onChange={setMealFrequency} min={1} max={10} placeholder="Ex.: 5" />
                  <NumberField id="waterIntakeMl" label="Ingestão de água (ml/dia)" value={waterIntakeMl} onChange={setWaterIntakeMl} min={0} placeholder="Ex.: 2000" />
                </div>
              </CardContent>
            </Card>

            {/* Estilo de vida */}
            <Card className="bg-card/95 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  Estilo de vida
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div>
                  <Label htmlFor="occupation" className="text-foreground/90">Ocupação</Label>
                  <Input
                    id="occupation"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="Ex.: professor, programador..."
                    maxLength={255}
                    className={inputClass}
                  />
                </div>
                <ButtonGroup
                  label="Nível de atividade diária"
                  value={dailyActivityLevel}
                  onChange={setDailyActivityLevel}
                  options={[
                    { value: "sedentary", label: "Sedentário" },
                    { value: "lightly_active", label: "Levemente ativo" },
                    { value: "moderately_active", label: "Moderadamente ativo" },
                    { value: "very_active", label: "Muito ativo" },
                  ]}
                />
                <ButtonGroup
                  label="Nível de estresse"
                  value={stressLevel}
                  onChange={setStressLevel}
                  options={[
                    { value: "low", label: "Baixo" },
                    { value: "moderate", label: "Moderado" },
                    { value: "high", label: "Alto" },
                  ]}
                />
                <TextareaField id="mainGoal" label="Objetivo principal" value={mainGoal} onChange={setMainGoal} placeholder="Descreva seu objetivo de saúde e fitness..." maxLength={512} />
                <TextareaField id="motivation" label="Motivação" value={motivation} onChange={setMotivation} placeholder="O que te motiva a treinar?" maxLength={512} />
                <TextareaField id="notes" label="Observações adicionais" value={notes} onChange={setNotes} placeholder="Qualquer informação extra que queira compartilhar..." maxLength={1024} />
              </CardContent>
            </Card>

            {/* Ações */}
            <div className="flex justify-end gap-2 pb-6">
              <Button asChild variant="outline" className="border-border/30 bg-card/90 hover:bg-accent shadow-sm">
                <Link href="/app/home">Cancelar</Link>
              </Button>
              <Button type="submit" disabled={saving} className="shadow-sm">
                {saving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
                ) : (
                  exists ? "Atualizar anamnese" : "Salvar anamnese"
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
