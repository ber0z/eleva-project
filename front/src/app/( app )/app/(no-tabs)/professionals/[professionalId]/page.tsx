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
  Award,
  FileText,
  Phone,
  MessageCircle,
  Instagram,
  Utensils,
  Dumbbell,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";

type ProfessionalDetail = {
  id: number;
  status: "pending" | "accepted" | "revoked";
  permissions: string[];
  pendingPermissions: string[];
  createdAt: string;
  professional: {
    id: number;
    name: string;
    roles: string[];
    profilePicture: string | null;
    bio: string | null;
    crefNumber: string | null;
    crnNumber: string | null;
    contactPhone: string | null;
    whatsapp: string | null;
    instagram: string | null;
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

const ROLE_LABELS: Record<string, string> = {
  trainer: "Personal Trainer",
  nutritionist: "Nutricionista",
};

export default function ProfessionalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const professionalId = params.professionalId as string;

  const [link, setLink] = useState<ProfessionalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pending permissions
  const [respondingPerm, setRespondingPerm] = useState(false);
  const [permMsg, setPermMsg] = useState<string | null>(null);

  // Chat
  const [startingChat, setStartingChat] = useState(false);

  // Revoke
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    api
      .get(`/user/professionals/${professionalId}`)
      .then((res) => {
        const data = res.data;
        setLink(data);
      })
      .catch((err) => {
        if (isAxiosError(err)) setError(err.response?.data?.error ?? "Erro ao buscar profissional");
        else setError("Erro ao buscar profissional");
      })
      .finally(() => setLoading(false));
  }, [professionalId]);

  async function handlePermissionResponse(action: "approve" | "reject") {
    setRespondingPerm(true);
    setPermMsg(null);
    try {
      await api.post(`/user/professionals/${professionalId}/permissions/${action}`);
      // Refresh link data
      const res = await api.get(`/user/professionals/${professionalId}`);
      setLink(res.data);
      setPermMsg(action === "approve" ? "Permissões aprovadas" : "Permissões rejeitadas");
    } catch {
      setPermMsg("Erro ao processar solicitação");
    } finally {
      setRespondingPerm(false);
    }
  }

  async function handleStartChat() {
    setStartingChat(true);
    try {
      const res = await api.post("/chat/start", { partnerId: Number(professionalId) });
      router.push(`/app/messages/${res.data.id}`);
    } catch {
      setError("Erro ao iniciar conversa");
      setStartingChat(false);
    }
  }

  async function handleRevoke() {
    setRevoking(true);
    try {
      await api.delete(`/user/professionals/${professionalId}`);
      router.push("/app/professionals");
    } catch {
      setError("Erro ao revogar vínculo");
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

  if (error || !link) {
    return (
      <div>
        <Link href="/app/professionals" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">
          {error ?? "Profissional não encontrado"}
        </div>
      </div>
    );
  }

  const pro = link.professional;

  return (
    <div>
      <Link href="/app/professionals" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      {/* Info do profissional */}
      <div className="rounded-2xl border border-border/30 bg-card shadow-sm p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-muted">
            {pro.profilePicture ? (
              <img src={pro.profilePicture} alt={pro.name} className="h-14 w-14 rounded-full object-cover" />
            ) : (
              <User className="h-7 w-7 text-muted-foreground" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{pro.name}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {pro.roles.map((r) => (
                <span key={r} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {ROLE_LABELS[r] ?? r}
                </span>
              ))}
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[link.status]}`}>
                {STATUS_LABELS[link.status]}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              Conectado desde {new Date(link.createdAt).toLocaleDateString("pt-BR")}
            </span>
          </div>
        </div>

        {pro.bio && (
          <p className="text-sm text-muted-foreground mb-4">{pro.bio}</p>
        )}

        {/* Dados de contato */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {pro.crefNumber && (
            <InfoRow icon={<Award className="h-4 w-4" />} label="CREF" value={pro.crefNumber} />
          )}
          {pro.crnNumber && (
            <InfoRow icon={<FileText className="h-4 w-4" />} label="CRN" value={pro.crnNumber} />
          )}
          {pro.contactPhone && (
            <InfoRow icon={<Phone className="h-4 w-4" />} label="Telefone" value={pro.contactPhone} />
          )}
          {pro.whatsapp && (
            <InfoRow icon={<MessageCircle className="h-4 w-4" />} label="WhatsApp" value={pro.whatsapp} />
          )}
          {pro.instagram && (
            <InfoRow icon={<Instagram className="h-4 w-4" />} label="Instagram" value={pro.instagram} />
          )}
        </div>
      </div>

      {/* Enviar mensagem */}
      {link.status === "accepted" && (
        <button
          onClick={handleStartChat}
          disabled={startingChat}
          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50 mb-6"
        >
          {startingChat ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
          Enviar mensagem
        </button>
      )}

      {/* Permissoes pendentes de aprovacao */}
      {link.status === "accepted" && link.pendingPermissions.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            <h3 className="text-sm font-semibold">Solicitação de permissões</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            O profissional solicitou as seguintes permissões:
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {link.pendingPermissions.includes("edit_diet") && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-500 px-3 py-1.5 text-xs font-medium">
                <Utensils className="h-3.5 w-3.5" />
                Editar dieta
              </span>
            )}
            {link.pendingPermissions.includes("edit_training") && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 text-blue-500 px-3 py-1.5 text-xs font-medium">
                <Dumbbell className="h-3.5 w-3.5" />
                Editar treino
              </span>
            )}
          </div>

          {permMsg && (
            <div className={`mb-3 text-sm ${permMsg.includes("Erro") ? "text-destructive" : "text-emerald-500"}`}>
              {permMsg}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => handlePermissionResponse("approve")}
              disabled={respondingPerm}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
            >
              {respondingPerm ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Aprovar
            </button>
            <button
              onClick={() => handlePermissionResponse("reject")}
              disabled={respondingPerm}
              className="inline-flex items-center gap-2 rounded-xl border border-border/40 px-4 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-accent disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Rejeitar
            </button>
          </div>
        </div>
      )}

      {/* Permissoes (somente leitura) */}
      {link.status === "accepted" && link.permissions.length > 0 && (
        <div className="rounded-2xl border border-border/30 bg-card shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold">Permissoes concedidas</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {link.permissions.includes("edit_diet") && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-500 px-3 py-1.5 text-xs font-medium">
                <Utensils className="h-3.5 w-3.5" />
                Editar dieta
              </span>
            )}
            {link.permissions.includes("edit_training") && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 text-blue-500 px-3 py-1.5 text-xs font-medium">
                <Dumbbell className="h-3.5 w-3.5" />
                Editar treino
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            As permissoes sao gerenciadas pelo profissional.
          </p>
        </div>
      )}

      {/* Revogar */}
      {link.status !== "revoked" && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h3 className="text-lg font-semibold text-destructive">Revogar vínculo</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Ao revogar, o profissional perderá acesso aos seus dados e não poderá mais editar suas dietas ou treinos.
          </p>

          {!confirmRevoke ? (
            <button
              onClick={() => setConfirmRevoke(true)}
              className="rounded-xl border border-destructive/30 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition"
            >
              Revogar vínculo
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={handleRevoke}
                disabled={revoking}
                className="inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-destructive/90 disabled:opacity-50"
              >
                {revoking && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar revogação
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
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
