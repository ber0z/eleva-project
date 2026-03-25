"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";
import {
  ArrowLeft,
  Loader2,
  User,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ClipboardList,
  Settings,
  ChevronRight,
  Dumbbell,
  UtensilsCrossed,
  Lock,
  Clock,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";

type ClientDetail = {
  id: number;
  status: "pending" | "accepted" | "revoked";
  permissions: string[];
  pendingPermissions: string[];
  createdAt: string;
  user: {
    id: number;
    name: string;
    profilePicture: string | null;
    birthDate: string;
    gender: string;
  };
};

const STATUS_COLORS: Record<string, string> = {
  accepted: "bg-emerald-500/10 text-emerald-500",
  pending: "bg-amber-500/10 text-amber-500",
  revoked: "bg-red-500/10 text-red-500",
};

const STATUS_LABELS: Record<string, string> = {
  accepted: "Aceito",
  pending: "Pendente",
  revoked: "Revogado",
};

function calcAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settings panel
  const [showSettings, setShowSettings] = useState(false);

  // Permissions
  const [editDiet, setEditDiet] = useState(false);
  const [editTraining, setEditTraining] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Chat
  const [startingChat, setStartingChat] = useState(false);

  // Revoke
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [revoking, setRevoking] = useState(false);

  function applyClientData(data: ClientDetail) {
    setClient(data);
    // Se tem pendingPermissions, checkboxes refletem o que foi solicitado
    if (data.pendingPermissions?.length > 0) {
      setEditDiet(data.pendingPermissions.includes("edit_diet"));
      setEditTraining(data.pendingPermissions.includes("edit_training"));
    } else {
      setEditDiet(data.permissions.includes("edit_diet"));
      setEditTraining(data.permissions.includes("edit_training"));
    }
  }

  useEffect(() => {
    api
      .get(`/professional/clients/${userId}`)
      .then((res) => applyClientData(res.data))
      .catch((err) => {
        if (isAxiosError(err)) setError(err.response?.data?.error ?? "Erro ao buscar cliente");
        else setError("Erro ao buscar cliente");
      })
      .finally(() => setLoading(false));
  }, [userId]);

  async function handleSavePermissions() {
    setSaving(true);
    setSaveMsg(null);
    const permissions: string[] = [];
    if (editDiet) permissions.push("edit_diet");
    if (editTraining) permissions.push("edit_training");

    try {
      await api.patch(`/professional/clients/${userId}/permissions`, { permissions });
      setSaveMsg("Solicitacao enviada. Aguardando aprovacao do cliente.");
      // Re-fetch para atualizar pendingPermissions
      const { data } = await api.get(`/professional/clients/${userId}`);
      applyClientData(data);
    } catch {
      setSaveMsg("Erro ao salvar permissoes");
    } finally {
      setSaving(false);
    }
  }

  async function handleRevoke() {
    setRevoking(true);
    try {
      await api.delete(`/professional/clients/${userId}`);
      router.push("/pro/clients");
    } catch {
      setError("Erro ao revogar vinculo");
      setRevoking(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div>
        <Link href="/pro/clients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">
          {error ?? "Cliente nao encontrado"}
        </div>
      </div>
    );
  }

  const age = calcAge(client.user.birthDate);

  return (
    <div>
      <Link href="/pro/clients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      {/* Header do cliente */}
      <div className="rounded-2xl border border-border/30 bg-card shadow-sm p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-muted">
            {client.user.profilePicture ? (
              <img src={client.user.profilePicture} alt={client.user.name} className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <User className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold truncate">{client.user.name}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[client.status]}`}>
                {STATUS_LABELS[client.status]}
              </span>
              <span className="text-xs text-muted-foreground">
                Desde {new Date(client.createdAt).toLocaleDateString("pt-BR")}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="rounded-xl bg-muted/50 p-3 text-center">
            <p className="text-lg font-bold">{age}</p>
            <p className="text-xs text-muted-foreground">anos</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-3 text-center">
            <p className="text-lg font-bold capitalize">
              {client.user.gender === "male" ? "Masc" : client.user.gender === "female" ? "Fem" : "Outro"}
            </p>
            <p className="text-xs text-muted-foreground">Genero</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-3 text-center">
            <p className="text-lg font-bold">
              {new Date(client.user.birthDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
            </p>
            <p className="text-xs text-muted-foreground">Nascimento</p>
          </div>
        </div>
      </div>

      {/* Acoes rapidas */}
      {client.status === "accepted" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <button
            type="button"
            onClick={async () => {
              if (startingChat) return;
              setStartingChat(true);
              try {
                const res = await api.post("/chat/start", { partnerId: Number(userId) });
                const convId = res.data?.id;
                if (convId) {
                  window.location.href = `/pro/messages/${convId}`;
                }
              } catch (err) {
                console.error("Erro ao iniciar chat:", err);
              } finally {
                setStartingChat(false);
              }
            }}
            disabled={startingChat}
            className="flex items-center gap-3 rounded-2xl border border-border/30 bg-card shadow-sm p-4 hover:border-primary/30 transition group text-left disabled:opacity-60"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-500">
              {startingChat ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              ) : (
                <MessageCircle className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Mensagem</p>
              <p className="text-xs text-muted-foreground truncate">Conversar com o cliente</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <Link
            href={`/pro/clients/${userId}/records`}
            className="flex items-center gap-3 rounded-2xl border border-border/30 bg-card shadow-sm p-4 hover:border-primary/30 transition group"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Registros</p>
              <p className="text-xs text-muted-foreground truncate">Atividades, sono, evolucao</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          {client.permissions.includes("edit_training") ? (
            <Link
              href={`/pro/clients/${userId}/training`}
              className="flex items-center gap-3 rounded-2xl border border-border/30 bg-card shadow-sm p-4 hover:border-primary/30 transition group"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-purple-500/10 text-purple-500">
                <Dumbbell className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Treinos</p>
                <p className="text-xs text-muted-foreground truncate">Fichas de treino do cliente</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-border/30 bg-card shadow-sm p-4 opacity-50 cursor-not-allowed">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-purple-500/10 text-purple-500">
                <Dumbbell className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Treinos</p>
                <p className="text-xs text-muted-foreground truncate">Sem permissao</p>
              </div>
              <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          )}

          {client.permissions.includes("edit_diet") ? (
            <Link
              href={`/pro/clients/${userId}/diet`}
              className="flex items-center gap-3 rounded-2xl border border-border/30 bg-card shadow-sm p-4 hover:border-primary/30 transition group"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-500/10 text-rose-500">
                <UtensilsCrossed className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Dietas</p>
                <p className="text-xs text-muted-foreground truncate">Planos alimentares do cliente</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-border/30 bg-card shadow-sm p-4 opacity-50 cursor-not-allowed">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-500/10 text-rose-500">
                <UtensilsCrossed className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Dietas</p>
                <p className="text-xs text-muted-foreground truncate">Sem permissao</p>
              </div>
              <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          )}
        </div>
      )}

      {/* Botao gerenciar vinculo */}
      {client.status !== "revoked" && (
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="inline-flex items-center gap-2 rounded-xl border border-border/30 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition mb-4"
        >
          <Settings className="h-4 w-4" />
          {showSettings ? "Fechar configuracoes" : "Gerenciar vinculo"}
        </button>
      )}

      {/* Painel de configuracoes (colapsavel) */}
      {showSettings && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Permissoes */}
          {client.status === "accepted" && (
            <div className="space-y-4">
              {/* Banner de permissoes pendentes */}
              {client.pendingPermissions?.length > 0 && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldAlert className="h-5 w-5 text-amber-500" />
                    <h3 className="text-sm font-semibold text-amber-600">Solicitacao pendente</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Aguardando aprovacao do cliente para as seguintes permissoes:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {client.pendingPermissions.includes("edit_diet") && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 text-amber-600 px-3 py-1.5 text-xs font-medium">
                        <UtensilsCrossed className="h-3.5 w-3.5" />
                        Editar dieta
                      </span>
                    )}
                    {client.pendingPermissions.includes("edit_training") && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 text-amber-600 px-3 py-1.5 text-xs font-medium">
                        <Dumbbell className="h-3.5 w-3.5" />
                        Editar treino
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-3 text-xs text-amber-600">
                    <Clock className="h-3.5 w-3.5" />
                    O cliente precisa aprovar esta solicitacao
                  </div>
                </div>
              )}

              {/* Painel de edicao de permissoes */}
              <div className="rounded-2xl border border-border/30 bg-card shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <h3 className="text-sm font-semibold">Permissoes</h3>
                </div>

                {client.permissions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs text-muted-foreground">Ativas:</span>
                    {client.permissions.includes("edit_diet") && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-500 px-2.5 py-1 text-xs font-medium">
                        <UtensilsCrossed className="h-3 w-3" />
                        Dieta
                      </span>
                    )}
                    {client.permissions.includes("edit_training") && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-500 px-2.5 py-1 text-xs font-medium">
                        <Dumbbell className="h-3 w-3" />
                        Treino
                      </span>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <label className={`flex items-center gap-3 ${client.pendingPermissions?.length > 0 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                    <input
                      type="checkbox"
                      checked={editDiet}
                      onChange={(e) => setEditDiet(e.target.checked)}
                      disabled={client.pendingPermissions?.length > 0}
                      className="h-4 w-4 rounded border-border accent-primary"
                    />
                    <span className="text-sm">Editar dieta</span>
                  </label>
                  <label className={`flex items-center gap-3 ${client.pendingPermissions?.length > 0 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                    <input
                      type="checkbox"
                      checked={editTraining}
                      onChange={(e) => setEditTraining(e.target.checked)}
                      disabled={client.pendingPermissions?.length > 0}
                      className="h-4 w-4 rounded border-border accent-primary"
                    />
                    <span className="text-sm">Editar treino</span>
                  </label>
                </div>

                {saveMsg && (
                  <div className={`mt-3 text-sm ${saveMsg.includes("Erro") ? "text-destructive" : "text-amber-600"}`}>
                    {saveMsg}
                  </div>
                )}

                <button
                  onClick={handleSavePermissions}
                  disabled={saving || client.pendingPermissions?.length > 0}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Solicitar permissoes
                </button>
              </div>
            </div>
          )}

          {/* Revogar */}
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <h3 className="text-sm font-semibold text-destructive">Revogar vinculo</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Ao revogar o vinculo, o cliente nao sera mais listado e perdera acesso as permissoes concedidas.
            </p>

            {!confirmRevoke ? (
              <button
                onClick={() => setConfirmRevoke(true)}
                className="rounded-xl border border-destructive/30 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition"
              >
                Revogar vinculo
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRevoke}
                  disabled={revoking}
                  className="inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-destructive/90 disabled:opacity-50"
                >
                  {revoking && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirmar revogacao
                </button>
                <button
                  onClick={() => setConfirmRevoke(false)}
                  className="rounded-xl px-4 py-2.5 text-sm text-muted-foreground hover:bg-accent transition"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
