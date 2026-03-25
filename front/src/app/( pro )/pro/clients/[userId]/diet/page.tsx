"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";
import { ArrowLeft, Loader2, Plus, UtensilsCrossed } from "lucide-react";

type Diet = {
  id: number;
  title: string;
  notes?: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
  idProfessional?: number | null;
};

type ListResponse = {
  items: Diet[];
  total: number;
  page: number;
  pageSize: number;
  permissions: string[];
};

const PAGE_SIZE = 10;

export default function ClientDietsPage() {
  const params = useParams();
  const userId = params.userId as string;

  const [items, setItems] = useState<Diet[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function formatDate(iso: string) {
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        timeZone: "UTC",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  async function fetchPage(targetPage: number) {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<ListResponse>(
        `/professional/clients/${userId}/diets`,
        { params: { page: targetPage, pageSize: PAGE_SIZE } }
      );
      setItems(data.items);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(Math.max(1, Math.ceil(data.total / data.pageSize)));
      setPermissions(data.permissions);
    } catch (err) {
      if (isAxiosError(err)) setError(err.response?.data?.error ?? "Erro ao carregar dietas");
      else setError("Erro ao carregar dietas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPage(1);
  }, [userId]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/pro/clients/${userId}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <h1 className="text-xl font-semibold">Dietas do cliente</h1>
        </div>

        {permissions.includes("edit_diet") && (
          <Link
            href={`/pro/clients/${userId}/diet/new`}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Nova dieta
          </Link>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && items.length === 0 && (
        <div className="rounded-2xl border border-border/30 bg-card shadow-sm p-8 text-center">
          <UtensilsCrossed className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma dieta criada para este cliente.</p>
          {permissions.includes("edit_diet") && (
            <Link
              href={`/pro/clients/${userId}/diet/new`}
              className="inline-flex items-center gap-2 mt-4 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Criar primeira dieta
            </Link>
          )}
        </div>
      )}

      {/* List */}
      {!loading && !error && items.length > 0 && (
        <>
          <div className="grid gap-3">
            {items.map((d) => {
              const subtitle =
                (d.notes?.trim()) ||
                (d.date ? `Data: ${formatDate(d.date)}` : "");

              return (
                <Link
                  key={d.id}
                  href={`/pro/clients/${userId}/diet/${d.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-border/30 bg-card shadow-sm p-4 hover:bg-accent transition-colors"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-500/10">
                    <UtensilsCrossed className="h-5 w-5 text-rose-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{d.title || `Dieta #${d.id}`}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {subtitle}
                      {subtitle ? " • " : ""}
                      {formatDate(d.createdAt)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => fetchPage(page - 1)}
                disabled={page <= 1}
                className="rounded-xl border border-border/30 px-3 py-2 text-sm hover:bg-accent disabled:opacity-30"
              >
                Anterior
              </button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => fetchPage(page + 1)}
                disabled={page >= totalPages}
                className="rounded-xl border border-border/30 px-3 py-2 text-sm hover:bg-accent disabled:opacity-30"
              >
                Proximo
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
