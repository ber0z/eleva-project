"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Meal = {
  id: number;
  idDiet: number;
  title: string;
  time: string | null;
  meal: string;
  notes: string | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  createdAt: string;
  updatedAt: string;
};

type DietDetails = {
  id: number;
  idUser: number;
  title: string;
  notes: string | null;
  date: string;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  createdAt: string;
  updatedAt: string;
  idProfessional: number | null;
  meals: Meal[];
  documentUrl?: string | null;
  documentUrlExpiresAt?: string | null;
};

type UiMeal = {
  __key: string;
  id?: number;
  title: string;
  time: string;
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

function isoToYyyyMmDd(iso: string) {
  if (!iso) return "";
  return String(iso).slice(0, 10);
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

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function compactLine(parts: Array<string | null | undefined>) {
  return parts.filter((p) => (p ?? "").toString().trim().length > 0).join(" • ");
}

function sortMealsByTime(meals: UiMeal[]) {
  return [...meals].sort((a, b) => {
    const ta = a.time?.trim() ? a.time.trim() : "99:99";
    const tb = b.time?.trim() ? b.time.trim() : "99:99";
    return ta.localeCompare(tb);
  });
}

export default function ProClientDietEditPage() {
  const router = useRouter();
  const params = useParams<{ userId: string; id: string }>();
  const userId = params?.userId as string;
  const dietId = Number(params?.id);

  const [initialLoading, setInitialLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<DietDetails | null>(null);

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState("");

  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [deleteDocument, setDeleteDocument] = useState(false);

  const [meals, setMeals] = useState<UiMeal[]>([]);

  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  async function fetchDiet() {
    setInitialLoading(true);
    setErr(null);

    if (!Number.isFinite(dietId) || dietId <= 0) {
      setErr("Dieta inválida.");
      setInitialLoading(false);
      return;
    }

    try {
      const res = await api.get<{ diet: DietDetails; permissions: string[] }>(
        `/professional/clients/${userId}/diet/${dietId}`
      );
      const d = res.data.diet;
      setData(d);
      setTitle(d.title ?? "");
      setNotes(d.notes ?? "");
      setDate(isoToYyyyMmDd(d.date ?? ""));
      setDocumentFile(null);
      setDeleteDocument(false);

      const mapped: UiMeal[] = (d.meals ?? []).map((m) => ({
        __key: uid("m"),
        id: m.id,
        title: m.title ?? "",
        time: m.time ?? "",
        meal: m.meal ?? "",
        notes: m.notes ?? "",
        protein: m.protein != null ? String(m.protein) : "",
        carbs: m.carbs != null ? String(m.carbs) : "",
        fat: m.fat != null ? String(m.fat) : "",
      }));
      setMeals(sortMealsByTime(mapped));
    } catch (e) {
      if (isAxiosError(e)) setErr(e.response?.data?.error || e.message || "Falha ao carregar dieta");
      else setErr("Falha ao carregar dieta");
    } finally {
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    void fetchDiet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, dietId]);

  function addMeal() {
    setMeals((prev) => [
      { __key: uid("m"), title: "", time: "", meal: "", notes: "", protein: "", carbs: "", fat: "" },
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
    return meals.some((m) => {
      const hasId = typeof m.id === "number";
      const hasTitle = m.title.trim().length > 0;
      const hasMeal = m.meal.trim().length > 0;
      return hasId || hasTitle || hasMeal;
    });
  }, [title, date, meals]);

  function validate(): string | null {
    if (!title.trim()) return "Informe o título da dieta.";
    if (!date.trim()) return "Informe a data da dieta.";
    const iso = yyyyMmDdToIsoUtc(date);
    if (!iso) return "Data inválida.";

    const hhmm = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
    for (let i = 0; i < meals.length; i++) {
      const m = meals[i];
      const hasId = typeof m.id === "number";
      const hasTitle = m.title.trim().length > 0;
      const hasMeal = m.meal.trim().length > 0;
      if (!hasId && !hasTitle && !hasMeal) return `Refeição ${i + 1}: informe título ou refeição.`;
      if (m.time.trim() && !hhmm.test(m.time.trim())) return `Refeição ${i + 1}: horário inválido (use HH:mm).`;
      for (const [k, label] of [["protein", "proteína"], ["carbs", "carbo"], ["fat", "gordura"]] as const) {
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
    if (msg) { setSaveErr(msg); return; }

    const isoDate = yyyyMmDdToIsoUtc(date)!;

    const mealsPayload = meals.map((m) => ({
      ...(typeof m.id === "number" ? { id: m.id } : {}),
      ...(m.title.trim() ? { title: m.title.trim() } : {}),
      ...(m.time.trim() ? { time: m.time.trim() } : {}),
      ...(m.meal.trim() ? { meal: m.meal.trim() } : {}),
      ...(m.notes.trim() ? { notes: m.notes.trim() } : {}),
      ...(toNumOrUndef(m.protein) !== undefined ? { protein: toNumOrUndef(m.protein) } : {}),
      ...(toNumOrUndef(m.carbs) !== undefined ? { carbs: toNumOrUndef(m.carbs) } : {}),
      ...(toNumOrUndef(m.fat) !== undefined ? { fat: toNumOrUndef(m.fat) } : {}),
    }));

    setSaving(true);

    try {
      const fd = new FormData();
      fd.set("title", title.trim());
      fd.set("date", isoDate);
      if (notes.trim()) fd.set("notes", notes.trim());
      fd.set("meals", JSON.stringify(mealsPayload));
      fd.set("deleteDocument", String(deleteDocument));
      if (!deleteDocument && documentFile) fd.set("document", documentFile);

      await api.put(`/professional/clients/${userId}/diet/${dietId}`, fd);
      router.push(`/pro/clients/${userId}/diet/${dietId}`);
    } catch (error) {
      if (isAxiosError(error)) setSaveErr(error.response?.data?.error || error.message || "Falha ao salvar dieta");
      else setSaveErr("Falha ao salvar dieta");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-svh bg-background text-foreground overflow-x-hidden">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-28">
        {/* Top bar */}
        <div className="mb-4 flex items-center justify-between gap-2">
          <Button
            variant="outline"
            className="bg-card cursor-pointer"
            onClick={() => router.push(`/pro/clients/${userId}/diet/${dietId}`)}
            title="Voltar"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          <Button
            type="submit"
            form="diet-edit-form"
            disabled={saving || initialLoading || !canSave}
            className="cursor-pointer"
            title={!canSave ? "Preencha título, data e pelo menos uma refeição válida" : "Salvar"}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>

        {/* Loading */}
        {initialLoading ? (
          <div className="grid gap-3">
            <Card>
              <CardHeader className="space-y-2">
                <Skeleton className="h-5 w-56" />
                <Skeleton className="h-3 w-72" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
              </CardContent>
            </Card>
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full rounded-xl" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : err ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {err}
            <div className="mt-2">
              <Button size="sm" variant="outline" onClick={fetchDiet}>Tentar novamente</Button>
            </div>
          </div>
        ) : !data ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Dieta não encontrada
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Não foi possível carregar os dados.</CardContent>
          </Card>
        ) : (
          <form id="diet-edit-form" onSubmit={onSubmit} className="grid gap-3">
            {/* Dados principais */}
            <Card className="overflow-hidden">
              <div className="bg-primary/10 px-4 sm:px-6 py-4 border-b border-border/30">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Editar dieta
                </h2>
                <p className="text-xs text-muted-foreground">
                  Atualize os dados e as refeições. Envie um novo documento se quiser.
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
                    <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputBase} />
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

                {/* Documento */}
                <div className="rounded-xl bg-muted/40 p-3 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Documento
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {data.documentUrl ? "Existe um documento anexado." : "Nenhum documento anexado."}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {data.documentUrl ? (
                        <Button asChild variant="outline" className="bg-background cursor-pointer">
                          <a href={data.documentUrl} target="_blank" rel="noreferrer">
                            Abrir <ExternalLink className="ml-2 h-4 w-4" />
                          </a>
                        </Button>
                      ) : null}

                      <label
                        className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border/30 bg-background px-3 py-2 text-sm hover:bg-muted transition"
                        title={deleteDocument ? "Desmarque para enviar um novo documento" : documentFile ? "Trocar arquivo" : "Selecionar arquivo"}
                      >
                        <Plus className="h-4 w-4" />
                        <span>{documentFile ? "Trocar arquivo" : "Selecionar arquivo"}</span>
                        <input
                          type="file"
                          accept="application/pdf,image/*"
                          className="sr-only"
                          disabled={deleteDocument}
                          onChange={(e) => {
                            const f = e.target.files?.[0] ?? null;
                            setDocumentFile(f);
                            if (f) setDeleteDocument(false);
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {documentFile ? (
                        <>
                          Selecionado: <span className="font-medium">{documentFile.name}</span>{" "}
                          <span className="text-muted-foreground/70">• {formatBytes(documentFile.size)}</span>
                        </>
                      ) : (
                        "Nenhum novo arquivo selecionado."
                      )}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
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

                      {data.documentUrl ? (
                        <Button
                          type="button"
                          variant={deleteDocument ? "secondary" : "outline"}
                          className={`h-9 px-3 cursor-pointer ${deleteDocument ? "bg-destructive text-destructive-foreground hover:opacity-90" : "bg-card"}`}
                          onClick={() => {
                            setDeleteDocument((v) => {
                              const next = !v;
                              if (next) setDocumentFile(null);
                              return next;
                            });
                          }}
                          title={deleteDocument ? "Cancelar remoção do documento" : "Remover documento atual"}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="ml-2 hidden sm:inline">
                            {deleteDocument ? "Remoção marcada" : "Remover documento"}
                          </span>
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {deleteDocument ? (
                    <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                      O documento atual será removido quando você salvar.
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {/* Refeições */}
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <h2 className="text-sm font-semibold">Refeições</h2>
                <Button type="button" variant="outline" className="bg-card cursor-pointer" onClick={addMeal}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar
                </Button>
              </div>

              {meals.length === 0 ? (
                <Card>
                  <CardContent className="py-6 text-sm text-muted-foreground">
                    Nenhuma refeição. Clique em <b>Adicionar</b>.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {meals.map((m, idx) => {
                    const headerTitle = m.title?.trim() ? m.title : `Refeição ${idx + 1}`;
                    const meta = compactLine([m.time?.trim() ? m.time.trim() : null, typeof m.id !== "number" ? "nova" : null]);

                    return (
                      <Card key={m.__key} className="overflow-hidden">
                        <div className="relative px-4 sm:px-6 py-4 flex flex-wrap items-start justify-between gap-2 bg-card">
                          <div className="absolute left-0 top-0 h-full w-1 bg-primary/35" />
                          <div className="min-w-0 flex-1 pl-2">
                            <p className="text-sm font-semibold truncate">{headerTitle}</p>
                            <p className="text-xs text-muted-foreground truncate">{meta || "—"}</p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            className="cursor-pointer border-destructive/40 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeMeal(m.__key)}
                            title="Remover refeição"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <CardContent className="px-4 sm:px-6 py-4 bg-muted/20">
                          <div className="rounded-2xl bg-background/70 p-3 sm:p-4 grid gap-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <Field label="Título">
                                <input
                                  value={m.title}
                                  onChange={(e) => updateMeal(m.__key, { title: e.target.value })}
                                  className={inputBase}
                                  placeholder="Ex.: Café da manhã"
                                />
                              </Field>
                              <Field label="Horário (HH:mm)">
                                <input
                                  type="time"
                                  value={m.time}
                                  onChange={(e) => updateMeal(m.__key, { time: e.target.value })}
                                  className={inputBase}
                                />
                              </Field>
                            </div>

                            <Field label="Refeição (obrigatório)">
                              <textarea
                                value={m.meal}
                                onChange={(e) => updateMeal(m.__key, { meal: e.target.value })}
                                className={`${inputBase} min-h-20`}
                                placeholder="Descreva os alimentos..."
                              />
                            </Field>

                            <Field label="Notas (opcional)">
                              <textarea
                                value={m.notes}
                                onChange={(e) => updateMeal(m.__key, { notes: e.target.value })}
                                className={`${inputBase} min-h-16`}
                                placeholder="Observações extras..."
                              />
                            </Field>

                            <div className="grid grid-cols-3 gap-2">
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
        )}
      </div>
    </div>
  );
}
