"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { Mail, Plus, Loader2, ChevronLeft, ChevronRight, XCircle } from "lucide-react";

type InviteStatus = "pending" | "accepted" | "declined" | "expired" | "cancelled";
type Invite = {
  id: number;
  inviteeEmail: string | null;
  inviteePhone: string | null;
  status: InviteStatus;
  code: string;
  permissions: string[];
  message: string | null;
  expiresAt: string | null;
  createdAt: string;
  user: { id: number; name: string; profilePicture: string | null } | null;
};

const STATUS_LABELS: Record<string, string> = {
  all: "Todos",
  pending: "Pendentes",
  accepted: "Aceitos",
  declined: "Recusados",
  expired: "Expirados",
  cancelled: "Cancelados",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-500",
  accepted: "bg-emerald-500/10 text-emerald-500",
  declined: "bg-red-500/10 text-red-500",
  expired: "bg-gray-500/10 text-gray-500",
  cancelled: "bg-gray-500/10 text-gray-500",
};

const PAGE_SIZE = 20;

export default function InvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [cancelling, setCancelling] = useState<number | null>(null);

  function fetchInvites() {
    setLoading(true);
    const params: Record<string, string | number> = { page, perPage: PAGE_SIZE };
    if (filter !== "all") params.status = filter;

    api
      .get("/professional/invites", { params })
      .then((res) => {
        setInvites(res.data.data);
        setTotalPages(res.data.meta.totalPages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchInvites(); }, [filter, page]);

  async function handleCancel(id: number) {
    setCancelling(id);
    try {
      await api.patch(`/professional/invites/${id}/cancel`);
      fetchInvites();
    } catch {
    } finally {
      setCancelling(null);
    }
  }

  const filters = ["all", "pending", "accepted", "declined", "expired", "cancelled"];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Convites</h1>
        <Link
          href="/pro/invites/new"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Novo Convite
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : invites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Mail className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">Nenhum convite encontrado</p>
        </div>
      ) : (
        <>
          <div className="grid gap-3">
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="rounded-2xl border border-border/30 bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {inv.inviteeEmail ?? inv.inviteePhone ?? "—"}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
                        {inv.code}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[inv.status]}`}>
                        {STATUS_LABELS[inv.status]}
                      </span>
                    </div>
                    {inv.message && (
                      <p className="mt-2 text-xs text-muted-foreground italic truncate">"{inv.message}"</p>
                    )}
                    <div className="mt-2 text-xs text-muted-foreground">
                      Enviado em {new Date(inv.createdAt).toLocaleDateString("pt-BR")}
                      {inv.expiresAt && ` · Expira em ${new Date(inv.expiresAt).toLocaleDateString("pt-BR")}`}
                    </div>
                  </div>

                  {inv.status === "pending" && (
                    <button
                      onClick={() => handleCancel(inv.id)}
                      disabled={cancelling === inv.id}
                      className="shrink-0 rounded-xl p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                      title="Cancelar convite"
                    >
                      {cancelling === inv.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-xl p-2 hover:bg-accent disabled:opacity-30"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-xl p-2 hover:bg-accent disabled:opacity-30"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
