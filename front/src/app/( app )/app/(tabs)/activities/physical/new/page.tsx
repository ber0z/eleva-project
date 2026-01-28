"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";
import { ArrowLeft, Dumbbell, Save, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ActivityType =
  | "strength"
  | "cardio"
  | "sports"
  | "mobility"
  | "yoga_pilates"
  | "recovery"
  | "other";

const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: "strength", label: "Musculação" },
  { value: "cardio", label: "Cardio" },
  { value: "sports", label: "Esportes" },
  { value: "mobility", label: "Mobilidade / Alongamento" },
  { value: "yoga_pilates", label: "Yoga / Pilates" },
  { value: "recovery", label: "Recuperação" },
  { value: "other", label: "Outro" },
];

type PhysicalActivity = {
  id: number;
  idUser: number;
  name: string;
  type: ActivityType;
  duration: number; // minutos
  calories: number | null;
  observations?: string | null;
  date: string; // ISO no retorno
  createdAt: string;
  updatedAt: string;
};

function todayYMD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function combineDateTime(dateYmd: string, timeHm?: string) {
  if (!timeHm?.trim()) return dateYmd;
  return `${dateYmd}T${timeHm}:00.000Z`;
}

/** Converte "HH:mm" em minutos */
function parseTimeToMinutes(hhmm: string): number | null {
  const s = (hhmm ?? "").trim();
  if (!s) return null;
  const m = s.match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;

  const hh = Number(m[1]);
  const mm = Number(m[2]);

  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23) return null;
  if (mm < 0 || mm > 59) return null;

  const total = hh * 60 + mm;
  return total > 0 ? total : null;
}

function formatMinutesAsH(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

export default function NewPhysicalActivityPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [type, setType] = useState<ActivityType>("strength");

  // ✅ duração como "HH:mm" (seletor nativo)
  // exemplos: 00:45, 01:30, 02:00
  const [durationTime, setDurationTime] = useState<string>("00:45");

  const [calories, setCalories] = useState<string>("");
  const [observations, setObservations] = useState<string>("");
  const [date, setDate] = useState<string>(todayYMD());
  const [time, setTime] = useState<string>(""); // hora de início opcional

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const durationMinutes = useMemo(() => parseTimeToMinutes(durationTime), [durationTime]);

  const canSave = useMemo(() => {
    if (!name.trim()) return false;
    if (!date) return false;

    if (durationMinutes == null || durationMinutes <= 0) return false;

    // hora de início (se preencher)
    if (time && !/^\d{2}:\d{2}$/.test(time)) return false;

    if (calories.trim()) {
      const c = Number(calories);
      if (!Number.isFinite(c) || c < 0) return false;
    }

    return true;
  }, [name, date, durationMinutes, time, calories]);

  async function onSubmit() {
    if (!canSave || durationMinutes == null) return;

    setSaving(true);
    setErr(null);

    try {
      const body = {
        name: name.trim(),
        type,
        duration: durationMinutes, // ✅ envia em minutos
        calories: calories.trim() ? Number(calories) : null,
        observations: observations.trim() ? observations.trim() : null,
        date: combineDateTime(date, time),
      };

      await api.post<PhysicalActivity>("/physical-activities", body);
      router.push(`/app/activities/physical`);
    } catch (error) {
      if (isAxiosError(error)) {
        setErr(error.response?.data?.message || error.message || "Falha ao registrar atividade");
      } else {
        setErr("Falha ao registrar atividade");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-28">
        <div className="mb-4 flex items-center justify-between gap-2">
          <Button asChild variant="outline" size="sm" className="bg-card shrink-0">
            <Link href="/app/activities/physical" aria-label="Voltar">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5" />
              Registrar atividade
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {err ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {err}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Nome</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  placeholder="Ex.: corrida na esteira"
                  disabled={saving}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Tipo</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as ActivityType)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                    disabled={saving}
                  >
                    {ACTIVITY_TYPES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Duração (HH:mm)</label>
                  <input
                    value={durationTime}
                    onChange={(e) => setDurationTime(e.target.value)}
                    type="time"
                    step={60} // 1 minuto (alguns browsers respeitam)
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                    disabled={saving}
                  />
                  <p className="text-xs text-muted-foreground">
                    {durationMinutes != null ? (
                      <>
                        <b>{formatMinutesAsH(durationMinutes)}</b> ({durationMinutes} min)
                      </>
                    ) : (
                      "Selecione uma duração válida."
                    )}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Calorias (kcal)</label>
                  <input
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    type="number"
                    min={0}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                    placeholder="Opcional"
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Data</label>
                  <input
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    type="date"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                    disabled={saving}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Hora de início (opcional)</label>
                  <input
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    type="time"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                    disabled={saving}
                  />
                </div>

                <div className="space-y-1 sm:col-span-1">
                  <label className="text-xs text-muted-foreground">Observações</label>
                  <textarea
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                    placeholder="Opcional"
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="button" onClick={onSubmit} disabled={!canSave || saving} className="cursor-pointer">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Salvar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
