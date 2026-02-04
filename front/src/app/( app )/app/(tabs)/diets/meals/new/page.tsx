// app/(app)/app/meals/new/page.tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";
import { ArrowLeft, CalendarDays, RefreshCw } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type MealLogDayListItem = { id: number; date: string };
type MealLogDayListResponse = {
  items: MealLogDayListItem[];
  total: number;
  page: number;
  pageSize: number;
};

function toLocalYMD(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function MealsNewPage() {
  const router = useRouter();

  const [date, setDate] = useState(toLocalYMD());
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function findExistingDayIdByDate(yyyyMmDd: string): Promise<number | null> {
    // Sem endpoint de filtro por data: varre páginas do /meal-log-day.
    // pageSize grande para reduzir chamadas.
    const pageSize = 100;
    const maxPages = 20;

    try {
      const first = await api.get<MealLogDayListResponse>("/meal-log-day", {
        params: { page: 1, pageSize },
      });

      const matchIn = (items: MealLogDayListItem[]) =>
        items.find((it) => String(it.date).slice(0, 10) === yyyyMmDd)?.id ?? null;

      const id1 = matchIn(first.data.items ?? []);
      if (id1) return id1;

      const total = first.data.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const pagesToScan = Math.min(totalPages, maxPages);

      for (let p = 2; p <= pagesToScan; p++) {
        const res = await api.get<MealLogDayListResponse>("/meal-log-day", {
          params: { page: p, pageSize },
        });
        const id = matchIn(res.data.items ?? []);
        if (id) return id;
      }

      return null;
    } catch {
      return null;
    }
  }

  async function openDiaryForDate(targetDate: string) {
    setErr(null);
    setLoading(true);

    try {
      const existingId = await findExistingDayIdByDate(targetDate);
      if (existingId) {
        router.push(`/app/diets/meals/${existingId}/edit`);
        return;
      }

      // cria o dia mínimo e manda pro edit (diário)
      const res = await api.post<{ id: number }>("/meal-log-day", { date: targetDate });
      if (res.data?.id) {
        router.push(`/app/diets/meals/${res.data.id}/edit`);
        return;
      }

      router.push("/app/diets/meals");
    } catch (e) {
      if (isAxiosError(e)) {
        // se deu erro (ex.: duplicado), tenta achar e mandar pro edit
        const existingId = await findExistingDayIdByDate(targetDate);
        if (existingId) {
          router.push(`/app/diets/meals/${existingId}/edit`);
          return;
        }
        setErr(e.response?.data?.message || e.message || "Falha ao abrir diário");
      } else {
        setErr("Falha ao abrir diário");
      }
    } finally {
      setLoading(false);
    }
  }

  

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      setErr("Data inválida.");
      return;
    }
    await openDiaryForDate(date.trim());
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-28">
        <div className="mb-4 flex items-center justify-between gap-2">
          <Button
            variant="outline"
            className="bg-card cursor-pointer"
            onClick={() => router.push("/app/diets/meals")}
            title="Voltar"
            disabled={loading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          <Button
            variant="outline"
            className="bg-card cursor-pointer"
            onClick={() => openDiaryForDate(date)}
            disabled={loading}
            title="Abrir diário de hoje"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Abrir diário de hoje
          </Button>
        </div>

        <form onSubmit={onSubmit} className="grid gap-3">
          <Card className="overflow-hidden">
            <div className="bg-primary/10 px-4 sm:px-6 py-4 border-b border-border/60">
              <h1 className="text-sm font-semibold flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                Abrir ou criar diário Alimentar por data
              </h1>
              <p className="text-xs text-muted-foreground">
                Se já existir registro na data, você será enviado para a edição.
              </p>
            </div>

            <CardContent className="grid gap-4 pt-5 px-4 sm:px-6">
              {err ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {err}
                </div>
              ) : null}

              <div className="grid gap-3">
                <label className="text-xs text-muted-foreground">Data</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>

              <Button type="submit" className="cursor-pointer" disabled={loading}>
                {loading ? "Abrindo..." : "Abrir"}
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
