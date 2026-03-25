"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2, Sun, Moon } from "lucide-react";
import { api } from "@/lib/api";

const THEME_KEY = "theme";
type ThemeMode = "light" | "dark";

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  root.setAttribute("data-theme", mode);
  if (mode === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  root.style.colorScheme = mode;
}

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  return "dark";
}

export default function SettingsPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());

  useEffect(() => {
    applyTheme(theme);
    try { window.localStorage.setItem(THEME_KEY, theme); } catch {}
  }, [theme]);

  async function handleLogout() {
    if (pending) return;
    setPending(true);
    try {
      await api.post("/auth/logout", {}, { withCredentials: true });
    } catch {}
    finally {
      setPending(false);
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold mb-6">Configurações</h1>

      <div className="space-y-4">
        {/* Tema */}
        <div className="rounded-2xl border border-border/30 bg-card shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-3">Tema</h3>
          <div className="flex gap-3">
            <button
              onClick={() => setTheme("light")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                theme === "light" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              <Sun className="h-4 w-4" /> Claro
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                theme === "dark" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              <Moon className="h-4 w-4" /> Escuro
            </button>
          </div>
        </div>

        {/* Logout */}
        <div className="rounded-2xl border border-border/30 bg-card shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-3">Conta</h3>
          {!confirmOpen ? (
            <button
              onClick={() => setConfirmOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-destructive/30 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition"
            >
              <LogOut className="h-4 w-4" />
              Sair da conta
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Tem certeza que deseja sair?</p>
              <div className="flex gap-3">
                <button
                  onClick={handleLogout}
                  disabled={pending}
                  className="inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-destructive/90 disabled:opacity-50"
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  Confirmar
                </button>
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-sm text-muted-foreground hover:bg-accent transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Versão */}
        <div className="text-center text-xs text-muted-foreground pt-4">
          Eleva Pro · v1.0.0
        </div>
      </div>
    </div>
  );
}
