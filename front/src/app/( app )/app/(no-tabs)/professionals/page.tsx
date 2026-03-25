"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { Stethoscope, Loader2, ChevronLeft, ChevronRight, User } from "lucide-react";

type LinkStatus = "pending" | "accepted" | "revoked";
type ProfessionalLink = {
  id: number;
  status: LinkStatus;
  permissions: string[];
  createdAt: string;
  professional: {
    id: number;
    name: string;
    roles: string[];
    profilePicture: string | null;
  };
};

const STATUS_LABELS: Record<string, string> = {
  all: "Todos",
  accepted: "Aceitos",
  revoked: "Revogados",
};

const STATUS_COLORS: Record<string, string> = {
  accepted: "bg-emerald-500/10 text-emerald-500",
  pending: "bg-amber-500/10 text-amber-500",
  revoked: "bg-red-500/10 text-red-500",
};

const ROLE_LABELS: Record<string, string> = {
  trainer: "Personal Trainer",
  nutritionist: "Nutricionista",
};

const PAGE_SIZE = 20;

export default function ProfessionalsPage() {
  const [links, setLinks] = useState<ProfessionalLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page, perPage: PAGE_SIZE };
    if (filter !== "all") params.status = filter;

    api
      .get("/user/professionals", { params })
      .then((res) => {
        setLinks(res.data.data);
        setTotalPages(res.data.meta.totalPages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter, page]);

  const filters = ["all", "accepted", "revoked"];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Meus Profissionais</h1>
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
      ) : links.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Stethoscope className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">Nenhum profissional conectado</p>
        </div>
      ) : (
        <>
          <div className="grid gap-3">
            {links.map((l) => (
              <Link
                key={l.id}
                href={`/app/professionals/${l.professional.id}`}
                className="flex items-center gap-4 rounded-2xl border border-border/30 bg-card p-4 shadow-sm transition hover:bg-accent/50"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-muted">
                  {l.professional.profilePicture ? (
                    <img
                      src={l.professional.profilePicture}
                      alt={l.professional.name}
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{l.professional.name}</div>
                  <div className="flex gap-1.5 mt-0.5">
                    {l.professional.roles.map((r) => (
                      <span
                        key={r}
                        className="text-[10px] font-medium text-muted-foreground"
                      >
                        {ROLE_LABELS[r] ?? r}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Desde {new Date(l.createdAt).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[l.status]}`}>
                  {STATUS_LABELS[l.status]}
                </span>
              </Link>
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
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
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
