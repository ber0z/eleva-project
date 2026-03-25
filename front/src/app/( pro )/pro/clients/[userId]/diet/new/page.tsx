// app/(pro)/pro/clients/[userId]/diet/new/page.tsx
"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";
import { ArrowLeft, Plus, Trash2, Save, FileText, X } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type UiMeal = {
  __key: string;
  title: string;
  time: string; // HH:mm
  meal: string;
  notes: string;
  protein: string;
  carbs: string;
  fat: string;
};

const inputBase =
  "w-full max-w-full rounded-md border border-border/30 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1 min-w-0">
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function uid(prefix = "k") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "\u2014";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function yyyyMmDdToIsoUtc(yyyyMmDd: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd)) return null;
  return `${yyyyMmDd}T00:00:00.000Z`;
}

function toNumOrUndef(v: string): number | undefined {
  const s = (v ?? "").trim();
  if (!s) return undefined;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

export default function DietCreatePage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  // diet fields
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(""); // yyyy-mm-dd

  // file
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  // meals
  const [meals, setMeals] = useState<UiMeal[]>([
    {
      __key: uid("m"),
      title: "",
      time: "",
      meal: "",
      notes: "",
      protein: "",
      carbs: "",
      fat: "",
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  function addMeal() {
    setMeals((prev) => [
      {
        __key: uid("m"),
        title: "",
        time: "",
        meal: "",
        notes: "",
        protein: "",
        carbs: "",
        fat: "",
      },
      ...prev,
    ]);
  }

  function removeMeal(key: string) {
    setMeals((prev) => prev.filter((m) => m.__key !== key));
  }

  function updateMeal(key: string, patch: Partial<UiMeal>) {
    setMeals((prev) => prev.map((m) => (m.__key === key ? { ...m, ...patch } : m)));
  }

  const canSave = useMemo(() => {
    if (!title.trim()) return false;
    if (!date.trim()) return false;
    const hasValidMeal = meals.some((m) => m.title.trim() && m.meal.trim());
    return hasValidMeal;
  }, [title, date, meals]);

  function validate(): string | null {
    if (!title.trim()) return "Informe o título da dieta.";
    if (!date.trim()) return "Informe a data da dieta.";

    const iso = yyyyMmDdToIsoUtc(date);
    if (!iso) return "Data inválida.";

    const validMeals = meals.filter((m) => m.title.trim() && m.meal.trim());
    if (validMeals.length < 1) return "Adicione pelo menos 1 refeição (título e refeição).";

    // valida HH:mm simples (só se preenchido)
    const hhmm = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

    for (let i = 0; i < validMeals.length; i++) {
      const m = validMeals[i];

      if (m.time.trim() && !hhmm.test(m.time.trim())) {
        return `Refeição ${i + 1}: horário inválido (use HH:mm).`;
      }

      for (const [k, label] of [
        ["protein", "proteína"],
        ["carbs", "carbo"],
        ["fat", "gordura"],
      ] as const) {
        const n = toNumOrUndef(m[k]);
        if (n !== undefined && n < 0) return `Refeição ${i + 1}: ${label} não pode ser negativo.`;
      }
    }

    return null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaveErr(null);

    const msg = validate();
    if (msg) {
      setSaveErr(msg);
      return;
    }

    const isoDate = yyyyMmDdToIsoUtc(date)!;

    const mealsPayload = meals
      .filter((m) => m.title.trim() && m.meal.trim())
      .map((m) => ({
        title: m.title.trim(),
        ...(m.time.trim() ? { time: m.time.trim() } : {}),
        meal: m.meal.trim(),
        ...(m.notes.trim() ? { notes: m.notes.trim() } : {}),
        protein: toNumOrUndef(m.protein) ?? 0,
        carbs: toNumOrUndef(m.carbs) ?? 0,
        fat: toNumOrUndef(m.fat) ?? 0,
      }));

    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("title", title.trim());
      if (notes.trim()) fd.set("notes", notes.trim());
      fd.set("date", isoDate);

      fd.set("meals", JSON.stringify(mealsPayload));

      if (documentFile) fd.set("document", documentFile);

      await api.post(`/professional/clients/${userId}/diet`, fd);

      router.push(`/pro/clients/${userId}/diet`);
    } catch (error) {
      if (isAxiosError(error)) setSaveErr(error.response?.data?.message || error.message || "Falha ao salvar dieta");
      else setSaveErr("Falha ao salvar dieta");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-svh bg-background text-foreground overflow-x-hidden">
      <div className="mx-auto w-full max-w-3xl px-3 sm:px-4 py-5 sm:py-6 pb-28">
        {/* Top bar */}
        <div className="mb-3 sm:mb-4 flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            className="bg-card cursor-pointer"
            onClick={() => router.push(`/pro/clients/${userId}`)}
            title="Voltar"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          <Button type="submit" form="diet-create-form" disabled={saving || !canSave} className="cursor-pointer">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>

        <form id="diet-create-form" onSubmit={onSubmit} className="grid gap-3">
          {/* Dados principais */}
          <Card className="overflow-hidden">
            <div className="bg-primary/10 px-4 sm:px-6 py-4 border-b border-border/30">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Nova dieta para cliente
              </h2>
              <p className="text-xs text-muted-foreground">
                Preencha a dieta e adicione refeições. Você pode anexar um documento.
              </p>
            </div>

            <CardContent className="grid gap-4 pt-5 px-4 sm:px-6">
              {saveErr ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {saveErr}
                </div>
              ) : null}

              <div className="grid gap-3">
                <Field label="Título (obrigatório)">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={inputBase}
                    placeholder="Ex.: Bulking Clean"
                  />
                </Field>

                <Field label="Data (obrigatória)">
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputBase} />
                </Field>

                <Field label="Notas (opcional)">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={`${inputBase} min-h-24`}
                    placeholder="Ex.: evitar açúcar à noite"
                  />
                </Field>
              </div>

              {/* Documento (opcional) */}
              <div className="rounded-xl bg-muted/40 p-3 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Documento (opcional)
                    </p>
                    <p className="text-xs text-muted-foreground">Anexe um PDF ou imagem.</p>
                  </div>

                  <label
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border/30 bg-background px-3 py-2 text-sm hover:bg-muted transition"
                    title={documentFile ? "Trocar arquivo" : "Selecionar arquivo"}
                  >
                    <Plus className="h-4 w-4" />
                    <span>{documentFile ? "Trocar arquivo" : "Selecionar arquivo"}</span>
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      className="sr-only"
                      onChange={(e) => setDocumentFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {documentFile ? (
                      <>
                        Selecionado: <span className="font-medium">{documentFile.name}</span>{" "}
                        <span className="text-muted-foreground/70">{"\u2022"} {formatBytes(documentFile.size)}</span>
                      </>
                    ) : (
                      "Nenhum arquivo selecionado."
                    )}
                  </p>

                  {documentFile ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 px-3 bg-card cursor-pointer"
                      onClick={() => setDocumentFile(null)}
                      title="Remover arquivo selecionado"
                    >
                      <X className="h-4 w-4" />
                      <span className="ml-2 hidden sm:inline">Remover seleção</span>
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Refeições */}
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div>
                <h2 className="text-sm font-semibold">Refeições</h2>
              </div>

              <Button type="button" variant="outline" className="bg-card cursor-pointer" onClick={addMeal}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar
              </Button>
            </div>

            {meals.length === 0 ? (
              <Card>
                <CardContent className="py-6 text-sm text-muted-foreground">Adicione pelo menos uma refeição.</CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {meals.map((m, idx) => {
                  const headerTitle = m.title?.trim() ? m.title : `Refeição ${idx + 1}`;
                  const meta = [m.time?.trim() ? m.time.trim() : null, m.meal?.trim() ? "com descrição" : "sem descrição"]
                    .filter(Boolean)
                    .join(" \u2022 ");

                  return (
                    <Card key={m.__key} className="overflow-hidden">
                      <div className="relative px-4 sm:px-6 py-4 flex flex-wrap items-start justify-between gap-2 bg-card">
                        <div className="absolute left-0 top-0 h-full w-1 bg-primary/35" />

                        <div className="min-w-0 flex-1 pl-2">
                          <p className="text-sm font-semibold truncate">{headerTitle}</p>
                          <p className="text-xs text-muted-foreground truncate">{meta || "\u2014"}</p>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          className="cursor-pointer border-destructive/40 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeMeal(m.__key)}
                          title="Remover refeição"
                          disabled={meals.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="ml-2 hidden sm:inline">Remover</span>
                        </Button>
                      </div>

                      <CardContent className="px-3 sm:px-4 py-4 bg-muted/20">
                        <div className="rounded-xl bg-muted/40 p-3 sm:p-4">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Título (obrigatório)">
                              <input
                                value={m.title}
                                onChange={(e) => updateMeal(m.__key, { title: e.target.value })}
                                className={inputBase}
                                placeholder="Ex.: Café da manhã"
                              />
                            </Field>

                            <Field label="Horário (opcional)">
                              <input
                                type="time"
                                value={m.time}
                                onChange={(e) => updateMeal(m.__key, { time: e.target.value })}
                                className={inputBase}
                                step={60}
                              />
                            </Field>
                          </div>

                          <div className="mt-3">
                            <Field label="Refeição (obrigatório)">
                              <textarea
                                value={m.meal}
                                onChange={(e) => updateMeal(m.__key, { meal: e.target.value })}
                                className={`${inputBase} min-h-24`}
                                placeholder="Ex.: 3 ovos mexidos + 1 fatia pão integral + 1 banana"
                              />
                            </Field>
                          </div>

                          <div className="mt-3">
                            <Field label="Notas (opcional)">
                              <input
                                value={m.notes}
                                onChange={(e) => updateMeal(m.__key, { notes: e.target.value })}
                                className={inputBase}
                                placeholder="Ex.: comer devagar"
                              />
                            </Field>
                          </div>

                          <p className="text-md text-muted-foreground pt-4">Macros (opcional)</p>

                          <div className="mt-3 grid grid-cols-3 gap-3">
                            <Field label="Proteína (g)">
                              <input
                                inputMode="decimal"
                                value={m.protein}
                                onChange={(e) => updateMeal(m.__key, { protein: e.target.value })}
                                className={inputBase}
                                placeholder="0"
                              />
                            </Field>

                            <Field label="Carbo (g)">
                              <input
                                inputMode="decimal"
                                value={m.carbs}
                                onChange={(e) => updateMeal(m.__key, { carbs: e.target.value })}
                                className={inputBase}
                                placeholder="0"
                              />
                            </Field>

                            <Field label="Gordura (g)">
                              <input
                                inputMode="decimal"
                                value={m.fat}
                                onChange={(e) => updateMeal(m.__key, { fat: e.target.value })}
                                className={inputBase}
                                placeholder="0"
                              />
                            </Field>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
