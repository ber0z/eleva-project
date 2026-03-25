"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";
import { ArrowLeft, Loader2, Mail, Phone, MessageSquare, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function NewInvitePage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [editDiet, setEditDiet] = useState(false);
  const [editTraining, setEditTraining] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hasContact = useMemo(() => email.trim() !== "" || phone.trim() !== "", [email, phone]);
  const disabled = useMemo(() => loading || !hasContact, [loading, hasContact]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (disabled) return;
    setErr(null);
    setSuccess(null);
    setLoading(true);

    const permissions: string[] = [];
    if (editDiet) permissions.push("edit_diet");
    if (editTraining) permissions.push("edit_training");

    const payload: Record<string, unknown> = { permissions };
    if (email.trim()) payload.inviteeEmail = email.trim();
    if (phone.trim()) payload.inviteePhone = phone.trim();
    if (message.trim()) payload.message = message.trim();

    try {
      const res = await api.post("/professional/invites", payload);
      setSuccess(`Convite enviado! Código: ${res.data.code}`);
      setTimeout(() => router.push("/pro/invites"), 2000);
    } catch (error) {
      if (isAxiosError(error)) {
        setErr(error.response?.data?.error ?? error.message ?? "Erro ao enviar convite");
      } else {
        setErr("Erro ao enviar convite");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <Link
        href="/pro/invites"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <h1 className="text-2xl font-semibold mb-6">Novo Convite</h1>

      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {err && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {err}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-5">
        {/* Email */}
        <div className="grid gap-2">
          <label htmlFor="email" className="text-sm font-medium">E-mail do convidado</label>
          <div className="relative">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-xl border border-input bg-background pl-10 pr-4 py-3 text-foreground placeholder-muted-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="aluno@exemplo.com"
            />
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
          </div>
        </div>

        {/* Phone */}
        <div className="grid gap-2">
          <label htmlFor="phone" className="text-sm font-medium">Telefone (opcional)</label>
          <div className="relative">
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="block w-full rounded-xl border border-input bg-background pl-10 pr-4 py-3 text-foreground placeholder-muted-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="+5511999999999"
            />
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
          </div>
        </div>

        {/* Message */}
        <div className="grid gap-2">
          <label htmlFor="message" className="text-sm font-medium">Mensagem personalizada (opcional)</label>
          <div className="relative">
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1024}
              rows={3}
              className="block w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground placeholder-muted-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring resize-none"
              placeholder="Olá! Gostaria de te convidar..."
            />
          </div>
          <span className="text-xs text-muted-foreground text-right">{message.length}/1024</span>
        </div>

        {/* Permissions */}
        <div>
          <span className="text-sm font-medium mb-3 block">Permissões</span>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={editDiet}
                onChange={(e) => setEditDiet(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <span className="text-sm">Editar dieta</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={editTraining}
                onChange={(e) => setEditTraining(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <span className="text-sm">Editar treino</span>
            </label>
          </div>
        </div>

        {!hasContact && (
          <p className="text-xs text-muted-foreground">Informe pelo menos o e-mail ou telefone.</p>
        )}

        <button
          type="submit"
          disabled={disabled}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Mail className="h-4 w-4" />
              Enviar convite
            </>
          )}
        </button>
      </form>
    </div>
  );
}
