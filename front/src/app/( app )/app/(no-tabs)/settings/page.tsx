// app/app/(no-tabs)/settings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { api } from "@/lib/api"; // ajuste o caminho se não usar alias


const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
const LOGOUT_URL = "/auth/logout"; // ajuste para sua rota real
const REDIRECT_AFTER_LOGOUT = "/login";

export default function SettingsPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function confirmLogout() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await api.post(LOGOUT_URL, {}, { withCredentials: true });
      router.replace(REDIRECT_AFTER_LOGOUT);
    } catch {
      setError("Não foi possível encerrar a sessão agora. Tente novamente.");
      setPending(false);
    }
  }

  return ( 
    
    <section className="mx-auto max-w-5xl px-2 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-6">
      {/* Título */}
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Preferências da sua conta</p>
      </header>

      {/* Bloco: Conta */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-3 sm:px-4 py-3 border-b border-border">
          <h2 className="text-sm font-medium text-muted-foreground">Conta</h2>
        </div>

        {/* Item: Logout (abre modal) */}
        <div className="p-2">
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="
              w-full text-left
              flex items-center justify-between
              rounded-lg px-3 py-3
              hover:bg-accent
               cursor-pointer
            "
          >
            <div className="flex items-center gap-3">
              <LogOut className="h-5 w-5 text-foreground/80" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">Sair da conta</span>
                <span className="text-xs text-muted-foreground">Você precisará entrar novamente</span>
              </div>
            </div>
          </button>

          {error ? (
            <div className="mt-2 rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-600 dark:text-rose-300">
              {error}
            </div>
          ) : null}
        </div>
      </div>

      {/* Versão do app */}
      <footer className="pt-2">
        <p className="text-[11px] text-muted-foreground text-center">
          Eleva — v. <span className="font-medium">{APP_VERSION}</span>
        </p>
      </footer>

      {/* Modal de confirmação */}
      <ConfirmModal
        open={confirmOpen}
        title="Confirmar saída"
        description="Tem certeza de que deseja sair da sua conta?"
        pending={pending}
        onCancel={() => !pending && setConfirmOpen(false)}
        onConfirm={confirmLogout}
      />
    </section>
  );
}

/* ---------------- Modal simples e acessível ---------------- */

type ConfirmModalProps = {
  open: boolean;
  title: string;
  description?: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

function ConfirmModal({
  open,
  title,
  description,
  pending = false,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  // bloqueia scroll quando aberto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // fecha com ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open && !pending) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => !pending && onCancel()}
      />
      {/* Content */}
      <div className="absolute inset-0 grid place-items-center px-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          aria-describedby="confirm-desc"
          className="w-full max-w-sm rounded-xl border border-border bg-card shadow-lg"
        >
          <div className="p-4 border-b border-border">
            <h3 id="confirm-title" className="text-base font-semibold">
              {title}
            </h3>
          </div>

          <div className="p-4 space-y-2">
            {description ? (
              <p id="confirm-desc" className="text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>

          <div className="p-4 flex justify-end gap-2 border-t border-border">
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-accent disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-md bg-rose-600 text-white px-3 py-2 text-sm hover:bg-rose-700 disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              Sair
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
