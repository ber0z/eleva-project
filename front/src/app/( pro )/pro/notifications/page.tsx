"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  Bell,
  Loader2,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Mail,
  UserX,
  Apple,
  Dumbbell,
  FileText,
  Clock,
  ShieldCheck,
  ShieldX,
} from "lucide-react";

type NotificationType =
  | "invite_created"
  | "invite_accepted"
  | "diet_assigned"
  | "training_assigned"
  | "meal_log_reminder"
  | "meal_log_submitted"
  | "file_attached"
  | "link_revoked"
  | "permissions_updated"
  | "permissions_rejected";

type Notification = {
  id: number;
  type: NotificationType;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
  actorUser?: { id: number; name: string } | null;
};

const TYPE_ICONS: Record<NotificationType, React.ReactNode> = {
  invite_accepted: <UserCheck className="h-4 w-4 text-emerald-500" />,
  invite_created: <Mail className="h-4 w-4 text-blue-500" />,
  link_revoked: <UserX className="h-4 w-4 text-red-500" />,
  diet_assigned: <Apple className="h-4 w-4 text-rose-500" />,
  training_assigned: <Dumbbell className="h-4 w-4 text-purple-500" />,
  meal_log_reminder: <Clock className="h-4 w-4 text-amber-500" />,
  meal_log_submitted: <FileText className="h-4 w-4 text-emerald-500" />,
  file_attached: <FileText className="h-4 w-4 text-blue-500" />,
  permissions_updated: <ShieldCheck className="h-4 w-4 text-emerald-500" />,
  permissions_rejected: <ShieldX className="h-4 w-4 text-red-500" />,
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

const FILTER_LABELS: Record<string, string> = {
  all: "Todas",
  false: "Não lidas",
  true: "Lidas",
};

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [markingAll, setMarkingAll] = useState(false);

  function fetchNotifications() {
    setLoading(true);
    const params: Record<string, string | number> = { page, perPage: PAGE_SIZE };
    if (filter !== "all") params.read = filter;

    api
      .get("/professional/notifications", { params })
      .then((res) => {
        setNotifications(res.data.data);
        setTotalPages(res.data.meta.totalPages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchNotifications(); }, [filter, page]);

  async function markAsRead(id: number) {
    await api.patch(`/professional/notifications/${id}/read`).catch(() => {});
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
    );
  }

  async function markAllAsRead() {
    setMarkingAll(true);
    await api.patch("/professional/notifications/read-all").catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    setMarkingAll(false);
  }

  const filters = ["all", "false", "true"];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Notificações</h1>
        <button
          onClick={markAllAsRead}
          disabled={markingAll}
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-accent transition disabled:opacity-50"
        >
          {markingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
          Marcar todas
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Bell className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">Nenhuma notificação</p>
        </div>
      ) : (
        <>
          <div className="grid gap-2">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.readAt && markAsRead(n.id)}
                className={`w-full text-left rounded-2xl border p-4 transition ${
                  n.readAt
                    ? "border-border/20 bg-card/50 opacity-70"
                    : "border-border/30 bg-card shadow-sm hover:bg-accent/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0 rounded-xl bg-muted p-2">
                    {TYPE_ICONS[n.type] ?? <Bell className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-medium ${n.readAt ? "" : "font-semibold"}`}>
                        {n.title}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    {n.actorUser?.name && (
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        {n.actorUser.name}
                      </p>
                    )}
                    {n.body && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.body}</p>
                    )}
                  </div>
                  {!n.readAt && (
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </div>
              </button>
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
