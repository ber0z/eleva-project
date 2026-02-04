// app/(app)/app/meals/[id]/edit/page.tsx  (exemplo de caminho)
// (use o seu caminho real)

"use client";

import { useEffect, useMemo, useState, type ReactNode, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";
import { ArrowLeft, Save, Droplets, Utensils, Plus, Trash2, Pencil } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Modal from "@/components/ui/Modal";

/** ===== Types ===== */
type MealLogEntry = {
  id: number;
  idDay: number;
  title: string; // "Café da manhã" etc
  time: string | null;
  description: string;
  notes: string | null;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  dietMealId: number | null;
  createdAt: string;
  updatedAt: string;
};

type MealLogDayDetails = {
  id: number;
  idUser: number;
  date: string; // ISO
  notes: string | null;
  adherence: number | null;
  totalKcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  waterMl: number | null;
  dietId: number | null;
  createdAt: string;
  updatedAt: string;
  entries: MealLogEntry[];
  diet: unknown | null;
};

type DietListItem = { id: number; title: string; date: string };
type DietListResponse = { items: DietListItem[]; total: number; page: number; pageSize: number };

type MealGroupKey = "breakfast" | "lunch" | "snack" | "dinner" | "other";

const MEAL_GROUPS: Array<{ key: MealGroupKey; label: string }> = [
  { key: "breakfast", label: "Café da manhã" },
  { key: "lunch", label: "Almoço" },
  { key: "snack", label: "Lanche" },
  { key: "dinner", label: "Jantar" },
  { key: "other", label: "Outros" },
];

type EntryUi = {
  __key: string;
  id?: number;
  mealGroup: MealGroupKey;
  time: string;
  description: string;
  notes: string;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
};

type MealLogDayEditPayload = {
  date: string; // YYYY-MM-DD
  notes?: string;
  waterMl?: number;
  adherence?: number;

  // regra: OU dietId OU entries
  dietId?: number;
  entries?: Array<{
    id?: number;
    title: string;
    time?: string;
    description: string;
    notes?: string;
    kcal?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  }>;
};

const inputBase =
  "w-full max-w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40";

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

function toIntOrUndef(v: string): number | undefined {
  const s = (v ?? "").trim();
  if (!s) return undefined;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

function toNumOrUndef(v: string): number | undefined {
  const s = (v ?? "").trim();
  if (!s) return undefined;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

function hhmmValid(v: string) {
  if (!v.trim()) return true;
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v.trim());
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function compactLine(parts: Array<string | null | undefined>) {
  return parts.filter((p) => (p ?? "").toString().trim().length > 0).join(" • ");
}

function formatDatePt(isoOrDate: string) {
  try {
    const s = String(isoOrDate || "");
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    const fmt = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "UTC",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    return fmt.format(d);
  } catch {
    return isoOrDate;
  }
}

function mealLabelToKey(label: string): MealGroupKey {
  const normalized = (label || "").toLowerCase();
  if (normalized.includes("café")) return "breakfast";
  if (normalized.includes("alm")) return "lunch";
  if (normalized.includes("lanche")) return "snack";
  if (normalized.includes("jantar")) return "dinner";
  return "other";
}

function keyToMealLabel(key: MealGroupKey): string {
  return MEAL_GROUPS.find((g) => g.key === key)?.label ?? "Outros";
}

export default function DiaryEditMFPPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const dayId = Number(params?.id);

  const [initialLoading, setInitialLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // base do dia
  const [date, setDate] = useState(""); // YYYY-MM-DD
  const [notes, setNotes] = useState("");
  const [waterMl, setWaterMl] = useState("");

  // dieta (opcional) + aderência
  const [dietId, setDietId] = useState<string>(""); // select only
  const [adherence, setAdherence] = useState("80");
  const [dietOptions, setDietOptions] = useState<DietListItem[]>([]);
  const [dietLoading, setDietLoading] = useState(false);

  // entries (somente quando NÃO tem dieta)
  const [entries, setEntries] = useState<EntryUi[]>([]);

  // modal add/edit item
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [draft, setDraft] = useState<EntryUi | null>(null);
  const [draftErr, setDraftErr] = useState<string | null>(null);

  // submit
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const adherenceNum = useMemo(() => {
    const a = toIntOrUndef(adherence);
    return a === undefined ? 80 : clamp(a, 0, 100);
  }, [adherence]);

  const hasDietSelected = useMemo(() => {
    const did = toIntOrUndef(dietId);
    return !!did && did > 0;
  }, [dietId]);

  function addWater(delta: number) {
    const cur = toIntOrUndef(waterMl) ?? 0;
    setWaterMl(String(cur + delta));
  }

  async function fetchDietsForSelect() {
    setDietLoading(true);
    try {
      const { data } = await api.get<DietListResponse>("/diet", {
        params: { page: 1, pageSize: 100 },
      });
      setDietOptions(data.items ?? []);
    } catch {
      setDietOptions([]);
    } finally {
      setDietLoading(false);
    }
  }

  async function fetchDay() {
    setInitialLoading(true);
    setErr(null);

    if (!Number.isFinite(dayId) || dayId <= 0) {
      setErr("Registro inválido.");
      setInitialLoading(false);
      return;
    }

    try {
      const res = await api.get<MealLogDayDetails>(`/meal-log-day/${dayId}`);

      setDate(String(res.data.date).slice(0, 10));
      setNotes(res.data.notes ?? "");
      setWaterMl(res.data.waterMl != null ? String(res.data.waterMl) : "");

      setDietId(res.data.dietId != null ? String(res.data.dietId) : "");
      setAdherence(res.data.adherence != null ? String(res.data.adherence) : "80");

      const mapped: EntryUi[] = (res.data.entries ?? []).map((e) => {
        const groupKey = mealLabelToKey(e.title ?? "");
        return {
          __key: uid("e"),
          id: e.id,
          mealGroup: groupKey,
          time: e.time ?? "",
          description: e.description ?? "",
          notes: e.notes ?? "",
          kcal: e.kcal != null ? String(e.kcal) : "",
          protein: e.protein != null ? String(e.protein) : "",
          carbs: e.carbs != null ? String(e.carbs) : "",
          fat: e.fat != null ? String(e.fat) : "",
        };
      });

      setEntries(mapped);
      void fetchDietsForSelect();
    } catch (e) {
      if (isAxiosError(e)) setErr(e.response?.data?.message || e.message || "Falha ao carregar registro");
      else setErr("Falha ao carregar registro");
    } finally {
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    void fetchDay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayId]);

  const selectedDiet = useMemo(() => {
    const id = toIntOrUndef(dietId);
    if (!id) return null;
    return dietOptions.find((d) => d.id === id) ?? null;
  }, [dietId, dietOptions]);


  // agrupamento por seção (só faz sentido no manual)
  const grouped = useMemo(() => {
    const map: Record<MealGroupKey, EntryUi[]> = {
      breakfast: [],
      lunch: [],
      snack: [],
      dinner: [],
      other: [],
    };

    for (const e of entries) map[e.mealGroup].push(e);

    for (const k of Object.keys(map) as MealGroupKey[]) {
      map[k] = map[k].slice().sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
    }
    return map;
  }, [entries]);

  function openAdd(group: MealGroupKey) {
    setDraftErr(null);
    setDraft({
      __key: uid("draft"),
      mealGroup: group,
      time: "",
      description: "",
      notes: "",
      kcal: "",
      protein: "",
      carbs: "",
      fat: "",
    });
    setEntryModalOpen(true);
  }

  function openEdit(e: EntryUi) {
    setDraftErr(null);
    setDraft({ ...e, __key: e.__key });
    setEntryModalOpen(true);
  }

  function removeEntry(key: string) {
    setEntries((prev) => prev.filter((x) => x.__key !== key));
  }

  function saveDraft() {
    if (!draft) return;

    if (!draft.description.trim()) return setDraftErr("Informe a descrição do que você comeu.");
    if (draft.time.trim() && !hhmmValid(draft.time)) return setDraftErr("Horário inválido. Use HH:mm.");

    for (const [k, label] of [
      ["kcal", "kcal"],
      ["protein", "proteína"],
      ["carbs", "carbo"],
      ["fat", "gordura"],
    ] as const) {
      const n = toNumOrUndef(draft[k]);
      if (n !== undefined && n < 0) return setDraftErr(`${label} não pode ser negativo.`);
    }

    setEntries((prev) => {
      const idx = prev.findIndex((x) => x.__key === draft.__key);
      if (idx >= 0) {
        const next = prev.slice();
        next[idx] = { ...draft };
        return next;
      }
      return [{ ...draft, __key: uid("e") }, ...prev];
    });

    setEntryModalOpen(false);
    setDraft(null);
    setDraftErr(null);
  }

  function validateBeforeSave(): string | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) return "Data inválida.";

    const w = toIntOrUndef(waterMl);
    if (w !== undefined && w < 0) return "Água (ml) inválida.";

    if (hasDietSelected) {
      const did = toIntOrUndef(dietId);
      if (!did || did <= 0) return "Selecione uma dieta.";

      const a = toIntOrUndef(adherence);
      if (a !== undefined && (a < 0 || a > 100)) return "Aderência deve estar entre 0 e 100.";

      return null;
    }

    // manual: precisa pelo menos 1 item
    const valid = entries.filter((e) => e.description.trim().length > 0);
    if (valid.length < 1) return "Selecione uma dieta OU adicione pelo menos uma refeição manual.";

    return null;
  }


  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaveErr(null);

    const msg = validateBeforeSave();
    if (msg) {
      setSaveErr(msg);
      return;
    }

    const payload: MealLogDayEditPayload = {
      date: date.trim(),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    const w = toIntOrUndef(waterMl);
    if (w !== undefined) payload.waterMl = w;

    // ✅ OU dietId (+ adherence) OU entries (sem adherence)
    if (hasDietSelected) {
      payload.dietId = toIntOrUndef(dietId)!;

      const a = toIntOrUndef(adherence);
      if (a !== undefined) payload.adherence = clamp(a, 0, 100);

      // NÃO envia entries
    } else {
      // NÃO envia adherence
      payload.entries = entries
        .filter((x) => x.description.trim())
        .map((x) => ({
          ...(typeof x.id === "number" ? { id: x.id } : {}),
          title: keyToMealLabel(x.mealGroup),
          ...(x.time.trim() ? { time: x.time.trim() } : {}),
          description: x.description.trim(),
          ...(x.notes.trim() ? { notes: x.notes.trim() } : {}),
          ...(toNumOrUndef(x.kcal) !== undefined ? { kcal: toNumOrUndef(x.kcal) } : {}),
          ...(toNumOrUndef(x.protein) !== undefined ? { protein: toNumOrUndef(x.protein) } : {}),
          ...(toNumOrUndef(x.carbs) !== undefined ? { carbs: toNumOrUndef(x.carbs) } : {}),
          ...(toNumOrUndef(x.fat) !== undefined ? { fat: toNumOrUndef(x.fat) } : {}),
        }));
    }


    setSaving(true);
    try {
      await api.put(`/meal-log-day/${dayId}`, payload);
      router.push(`/app/diets/meals/${dayId}`);
    } catch (error) {
      if (isAxiosError(error)) setSaveErr(error.response?.data?.message || error.message || "Falha ao salvar");
      else setSaveErr("Falha ao salvar");
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
            onClick={() => router.push(`/app/diets/meals/${dayId}`)}
            title="Voltar"
            disabled={saving}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          <div className="flex items-center gap-2">
            <Button type="submit" form="diary-edit-form" disabled={saving || initialLoading} className="cursor-pointer">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        {initialLoading ? (
          <div className="grid gap-3">
            <Card>
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-56" />
                <Skeleton className="h-3 w-72" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </CardContent>
            </Card>
          </div>
        ) : err ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {err}
            <div className="mt-2">
              <Button size="sm" variant="outline" onClick={fetchDay}>
                Tentar novamente
              </Button>
            </div>
          </div>
        ) : (
          <form id="diary-edit-form" onSubmit={onSubmit} className="grid gap-3">
            {/* Header do dia */}
            <Card className="overflow-hidden">
              <div className="bg-primary/10 px-4 sm:px-6 py-4 border-b border-border/60">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h1 className="text-sm font-semibold">Diário Alimentar</h1>
                    <p className="text-xs text-muted-foreground">
                      Selecione uma dieta <b>ou</b> registre refeições manualmente.
                    </p>
                  </div>


                </div>
              </div>

              <CardContent className="grid gap-4 pt-5 px-4 sm:px-6">
                {saveErr ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {saveErr}
                  </div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Data">
                    <input type="date" value={date} disabled className={inputBase} />
                  </Field>
                </div>

                <Field label="Observações (opcional)">
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputBase} min-h-20`} />
                </Field>

                {/* Água */}
                <div className="rounded-xl bg-muted/40 p-3 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Droplets className="h-4 w-4 text-primary" />
                        Água (ml)
                      </p>
                      <p className="text-xs text-muted-foreground">Registre rápido.</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" className="bg-card cursor-pointer" onClick={() => addWater(250)}>
                        +250
                      </Button>
                      <Button type="button" variant="outline" className="bg-card cursor-pointer" onClick={() => addWater(500)}>
                        +500
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <input
                      inputMode="numeric"
                      value={waterMl}
                      onChange={(e) => setWaterMl(e.target.value)}
                      className={inputBase}
                      placeholder="2500"
                    />
                  </div>
                </div>

                {/* ✅ Dieta (sempre aparece) + aderência */}
                <div className="rounded-2xl bg-background/70 p-3 sm:p-4 border border-border/60">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">Dieta do dia (opcional)</p>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Field label="Selecionar dieta">
                      <select
                        value={dietId}
                        onChange={(e) => setDietId(e.target.value)}
                        className={inputBase}
                        disabled={dietLoading}
                      >
                        <option value="">Sem dieta (registrar manualmente)</option>
                        {dietOptions.map((d) => (
                          <option key={d.id} value={String(d.id)}>
                            {d.title} • {formatDatePt(d.date)}
                          </option>
                        ))}
                      </select>

                      {hasDietSelected ? (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Selecionada: <b>{selectedDiet?.title ?? `#${dietId}`}</b>. As refeições manuais ficam desativadas.
                        </p>
                      ) : (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Se você não selecionar uma dieta, registre as refeições manualmente abaixo.
                        </p>
                      )}
                    </Field>

                    {hasDietSelected ? (
                      <Field label="O quanto você seguiu essa dieta hoje? (%)">
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={adherenceNum}
                            onChange={(e) => setAdherence(String(e.target.value))}
                            className="w-full"
                          />
                          <input
                            inputMode="numeric"
                            value={String(adherenceNum)}
                            onChange={(e) => setAdherence(e.target.value)}
                            className={`${inputBase} w-20`}
                          />
                        </div>
                      </Field>
                    ) : (
                      <></>
                    )}

                  </div>

                  {hasDietSelected ? (
                    <div className="mt-3 rounded-xl border border-border/60 bg-card p-3 text-sm text-muted-foreground">
                      Vamos salvar apenas a dieta.
                      <br />
                      Para registrar refeições manuais, selecione <b>“Sem dieta”</b>.
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {/* ✅ Refeições manuais (somente se NÃO tiver dieta selecionada) */}
            {hasDietSelected ? (
              <Card>
                <CardContent className="p-4 text-sm text-muted-foreground">
                  Refeições manuais desativadas enquanto uma dieta estiver selecionada.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                <div className="px-1 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Refeições do dia</p>
                    <p className="text-xs text-muted-foreground">Registre suas refeições por seção.</p>
                  </div>
                </div>

                {MEAL_GROUPS.map((g) => {
                  const list = grouped[g.key] ?? [];
                  const kcalSum = list.reduce((acc, x) => acc + (toNumOrUndef(x.kcal) ?? 0), 0);
                  const subtitle = compactLine([`${list.length} refeição(ões)`, kcalSum > 0 ? `${Math.round(kcalSum)} kcal` : null]);

                  return (
                    <Card key={g.key} className="overflow-hidden">
                      <div className="bg-card px-4 sm:px-6 py-4 border-b border-border/60 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold flex items-center gap-2">
                            <Utensils className="h-4 w-4 text-primary" />
                            {g.label}
                          </p>
                          <p className="text-xs text-muted-foreground">{subtitle}</p>
                        </div>

                        <Button type="button" variant="secondary" className="bg-card cursor-pointer" onClick={() => openAdd(g.key)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Adicionar
                        </Button>
                      </div>

                      <CardContent className="p-0">
                        {list.length === 0 ? (
                          <div className="p-4 text-sm text-muted-foreground">Nenhum item ainda.</div>
                        ) : (
                          <ul className="divide-y divide-border">
                            {list.map((it) => {
                              const meta = compactLine([
                                it.time.trim() ? it.time.trim() : null,
                                it.kcal.trim() ? `${it.kcal.trim()} kcal` : null,
                                it.protein.trim() ? `${it.protein.trim()}p` : null,
                                it.carbs.trim() ? `${it.carbs.trim()}c` : null,
                                it.fat.trim() ? `${it.fat.trim()}g` : null,
                              ]);

                              const preview =
                                it.description.trim().length > 120 ? `${it.description.trim().slice(0, 120)}…` : it.description.trim();

                              return (
                                <li key={it.__key} className="p-4">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm font-medium">{preview || "—"}</div>
                                      <div className="mt-1 text-xs text-muted-foreground">{meta || "—"}</div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="bg-card cursor-pointer"
                                        onClick={() => openEdit(it)}
                                      >
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Editar
                                      </Button>

                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="cursor-pointer border-destructive/40 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => removeEntry(it.__key)}
                                        title="Remover"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </form>
        )}

        {/* Modal Add/Edit item (só existe no manual) */}
        <Modal
          open={entryModalOpen}
          onClose={() => {
            setEntryModalOpen(false);
            setDraft(null);
            setDraftErr(null);
          }}
          title={draft?.id ? "Editar item" : "Adicionar refeição"}
          maxWidthClassName="max-w-3xl"
        >
          {!draft ? null : (
            <div className="space-y-3">
              {draftErr ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {draftErr}
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Refeição">
                  <select
                    value={draft.mealGroup}
                    onChange={(e) => setDraft((p) => (p ? { ...p, mealGroup: e.target.value as MealGroupKey } : p))}
                    className={inputBase}
                  >
                    {MEAL_GROUPS.map((g) => (
                      <option key={g.key} value={g.key}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Horário (opcional)">
                  <input
                    value={draft.time}
                    onChange={(e) => setDraft((p) => (p ? { ...p, time: e.target.value } : p))}
                    className={inputBase}
                    placeholder="07:20"
                    type="time"
                  />
                  {!hhmmValid(draft.time) ? <p className="mt-1 text-[11px] text-destructive">Horário inválido (HH:mm).</p> : null}
                </Field>
              </div>

              <Field label="O que você comeu? (descrição)">
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft((p) => (p ? { ...p, description: e.target.value } : p))}
                  className={`${inputBase} min-h-28`}
                  placeholder="Ex.: 3 ovos mexidos + aveia + café sem açúcar"
                />
              </Field>

              <Field label="Notas (opcional)">
                <input
                  value={draft.notes}
                  onChange={(e) => setDraft((p) => (p ? { ...p, notes: e.target.value } : p))}
                  className={inputBase}
                />
              </Field>

              <div className="rounded-xl bg-muted/40 p-3">
                <div className="text-sm font-medium mb-2">Macros/kcal (opcional)</div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Field label="kcal">
                    <input
                      inputMode="decimal"
                      value={draft.kcal}
                      onChange={(e) => setDraft((p) => (p ? { ...p, kcal: e.target.value } : p))}
                      className={inputBase}
                      placeholder="320"
                    />
                  </Field>
                  <Field label="Proteína (g)">
                    <input
                      inputMode="decimal"
                      value={draft.protein}
                      onChange={(e) => setDraft((p) => (p ? { ...p, protein: e.target.value } : p))}
                      className={inputBase}
                    />
                  </Field>
                  <Field label="Carbo (g)">
                    <input
                      inputMode="decimal"
                      value={draft.carbs}
                      onChange={(e) => setDraft((p) => (p ? { ...p, carbs: e.target.value } : p))}
                      className={inputBase}
                    />
                  </Field>
                  <Field label="Gordura (g)">
                    <input
                      inputMode="decimal"
                      value={draft.fat}
                      onChange={(e) => setDraft((p) => (p ? { ...p, fat: e.target.value } : p))}
                      className={inputBase}
                    />
                  </Field>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" className="bg-card cursor-pointer" onClick={() => setEntryModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="button" className="cursor-pointer" onClick={saveDraft}>
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
