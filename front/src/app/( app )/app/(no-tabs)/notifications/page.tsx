"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  Bell,
  Loader2,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  UserCheck,
  Mail,
  UserX,
  Apple,
  Dumbbell,
  FileText,
  Clock,
  UserPlus,
  X,
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
  data: any;
  readAt: string | null;
  createdAt: string;
  actorPro?: { id: number; name: string } | null;
};

type Invite = {
  id: number;
  token: string;
  code: string;
  message: string | null;
  expiresAt: string;
  createdAt: string;
  professional: {
    id: number;
    name: string;
    roles: string[];
    profilePicture: string | null;
  };
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
  permissions_updated: <ShieldCheck className="h-4 w-4 text-amber-500" />,
  permissions_rejected: <ShieldX className="h-4 w-4 text-red-500" />,
};

const ROLE_LABELS: Record<string, string> = {
  trainer: "Personal Trainer",
  nutritionist: "Nutricionista",
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

export default function UserNotificationsPage() {
  const router = useRouter();

  // Notificações
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [markingAll, setMarkingAll] = useState(false);

  // Convites
  const [invites, setInvites] = useState<Invite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const invitesRef = useRef<HTMLDivElement>(null);
  const [highlightInvites, setHighlightInvites] = useState(false);

  function fetchNotifications() {
    setLoading(true);
    const params: Record<string, string | number> = { page, perPage: PAGE_SIZE };
    if (filter !== "all") params.read = filter;

    api
      .get("/user/notifications", { params })
      .then((res) => {
        setNotifications(res.data.data);
        setTotalPages(res.data.meta.totalPages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  function fetchInvites() {
    setInvitesLoading(true);
    api
      .get("/user/invites", { params: { page: 1, perPage: 50 } })
      .then((res) => setInvites(res.data.data))
      .catch(() => {})
      .finally(() => setInvitesLoading(false));
  }

  useEffect(() => {
    fetchNotifications();
  }, [filter, page]);

  useEffect(() => {
    fetchInvites();
  }, []);

  function scrollToInvites() {
    invitesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setHighlightInvites(true);
    setTimeout(() => setHighlightInvites(false), 2000);
  }

  async function handleNotificationClick(n: Notification) {
    if (!n.readAt) {
      await api.patch(`/user/notifications/${n.id}/read`).catch(() => {});
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x))
      );
    }
    // Se for convite, rolar até a seção de convites
    if (n.type === "invite_created" && invites.length > 0) {
      scrollToInvites();
    }
    // Se for permissão, navegar para pagina do profissional
    if (n.type === "permissions_updated" && n.data?.professionalId) {
      router.push(`/app/professionals/${n.data.professionalId}`);
    }
  }

  async function markAllAsRead() {
    setMarkingAll(true);
    await api.patch("/user/notifications/read-all").catch(() => {});
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))
    );
    setMarkingAll(false);
  }

  async function handleInviteResponse(token: string, inviteId: number, action: "accept" | "decline") {
    setRespondingId(inviteId);
    try {
      await api.post(`/user/invites/${action}`, { token });
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch {}
    setRespondingId(null);
  }

  const filters = ["all", "false", "true"];

  return (
    <div>
      {/* Convites Pendentes */}
      {!invitesLoading && invites.length > 0 && (
        <div
          ref={invitesRef}
          className={`mb-8 rounded-2xl transition-all duration-500 ${highlightInvites ? "ring-2 ring-primary/50 bg-primary/5 p-4" : "p-0"}`}
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Convites Pendentes
          </h2>
          <div className="grid gap-3">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10">
                    <UserPlus className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{invite.professional.name}</p>
                    <div className="flex gap-1.5 mt-0.5">
                      {invite.professional.roles.map((r) => (
                        <span
                          key={r}
                          className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                        >
                          {ROLE_LABELS[r] ?? r}
                        </span>
                      ))}
                    </div>
                    {invite.message && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        &quot;{invite.message}&quot;
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Código: {invite.code} · {timeAgo(invite.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-3 ml-13">
                  <button
                    onClick={() => handleInviteResponse(invite.token, invite.id, "accept")}
                    disabled={respondingId === invite.id}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                  >
                    {respondingId === invite.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserCheck className="h-3.5 w-3.5" />
                    )}
                    Aceitar
                  </button>
                  <button
                    onClick={() => handleInviteResponse(invite.token, invite.id, "decline")}
                    disabled={respondingId === invite.id}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border/40 px-4 py-2 text-xs font-medium text-muted-foreground transition hover:bg-accent disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    Recusar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notificações */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Notificações</h1>
        <button
          onClick={markAllAsRead}
          disabled={markingAll}
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-accent transition disabled:opacity-50"
        >
          {markingAll ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCheck className="h-4 w-4" />
          )}
          Marcar todas
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setPage(1);
            }}
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
                onClick={() => handleNotificationClick(n)}
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
                    {n.actorPro?.name && (
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        {n.actorPro.name}
                      </p>
                    )}
                    {n.body && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.body}</p>
                    )}
                    {n.type === "permissions_updated" && n.data?.professionalId && (
                      <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-primary">
                        <ChevronRight className="h-3 w-3" />
                        Ver e aprovar permissões
                      </span>
                    )}
                    {n.type === "invite_created" && invites.length > 0 && (
                      <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-primary">
                        <ChevronUp className="h-3 w-3" />
                        Ver convite pendente
                      </span>
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
