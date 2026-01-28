"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";
import { ArrowLeft, Moon, Save, Loader2, Info } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type SleepQuality = "excellent" | "good" | "average" | "poor" | "very_poor";

type Sleep = {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  sleepQuality: SleepQuality;
  notes?: string | null;
};

type SleepCreateBody = Omit<Sleep, "id">;

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function timeToMinutes(t: string) {
  const [hh, mm] = t.split(":").map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return 0;
  return hh * 60 + mm;
}

// ✅ minutos totais (considera virar o dia)
function calcSleepMinutes(startTime: string, endTime: string) {
  const s = timeToMinutes(startTime);
  let e = timeToMinutes(endTime);
  if (e < s) e += 24 * 60;
  return Math.max(0, e - s);
}

function calcSleepDuration(startTime: string, endTime: string) {
  const minutes = calcSleepMinutes(startTime, endTime);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export default function NewSleepPage() {
  const router = useRouter();

  const [date, setDate] = useState<string>(todayISO());
  const [startTime, setStartTime] = useState<string>("23:00");
  const [endTime, setEndTime] = useState<string>("07:00");
  const [sleepQuality, setSleepQuality] = useState<SleepQuality>("good");
  const [notes, setNotes] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const sleepMinutes = useMemo(() => calcSleepMinutes(startTime, endTime), [startTime, endTime]);

  const durationLabel = useMemo(() => calcSleepDuration(startTime, endTime), [startTime, endTime]);

  const showSleepTip = useMemo(() => {
    // mostra só quando tiver uma duração válida e for menor que 8h
    return sleepMinutes > 0 && sleepMinutes < 8 * 60;
  }, [sleepMinutes]);

  const canSave = useMemo(() => {
    if (!date) return false;
    if (!startTime || !endTime) return false;
    return true;
  }, [date, startTime, endTime]);

  async function onSubmit() {
    if (!canSave) return;

    setSaving(true);
    setErr(null);

    const body: SleepCreateBody = {
      date,
      startTime,
      endTime,
      sleepQuality,
      notes: notes.trim() ? notes.trim() : null,
    };

    try {
      await api.post<Sleep>("/sleep", body);
      router.push(`/app/sleep`);
    } catch (error) {
      if (isAxiosError(error)) {
        setErr(error.response?.data?.message || error.message || "Falha ao salvar registro de sono");
      } else {
        setErr("Falha ao salvar registro de sono");
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
            <Link href="/app/sleep" aria-label="Voltar">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5" />
              Registrar sono
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {err ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {err}
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Data</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  disabled={saving}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Como você qualifica sua qualidade de sono?</label>
                <select
                  value={sleepQuality}
                  onChange={(e) => setSleepQuality(e.target.value as SleepQuality)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  disabled={saving}
                >
                  <option value="excellent">Excelente</option>
                  <option value="good">Boa</option>
                  <option value="average">Média</option>
                  <option value="poor">Ruim</option>
                  <option value="very_poor">Muito ruim</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Início</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  disabled={saving}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Fim</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
              Duração estimada: <span className="font-medium text-foreground">{durationLabel}</span>
              
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Notas</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                maxLength={1020}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                placeholder="Ex.: Acordei 1x à noite"
                disabled={saving}
              />
            </div>

            {/* ✅ Informativo no final caso < 8h */}
            {showSleepTip ? (
              <div className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-3">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">
                    <Info className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Dica sobre sono</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Em geral, adultos se beneficiam de <b>pelo menos 7–9 horas</b> de sono por noite.
                      Hoje você registrou <b>{durationLabel}</b>.
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Se isso for frequente, tente ajustar rotina/horário de dormir. (Isso é informativo e não substitui orientação médica.)
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                onClick={onSubmit}
                disabled={!canSave || saving}
                className="cursor-pointer"
                title={!canSave ? "Preencha data e horários" : "Salvar"}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
