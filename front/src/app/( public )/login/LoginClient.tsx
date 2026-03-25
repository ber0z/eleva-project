"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import Image from "next/image";
import { isAxiosError } from "axios";
import { Eye, EyeOff, Loader2, Lock, LogIn, Mail } from "lucide-react";
import eleva from "../../../../public/imgs/eleva.png";

type SubjectType = "user" | "professional" | "admin";

const HOME_BY_SUBJECT: Record<SubjectType, string> = {
  user: "/app/home",
  professional: "/pro",
  admin: "/admin",
};

const ALLOWED_PREFIXES: Record<SubjectType, string[]> = {
  user: ["/app"],
  professional: ["/pro"],
  admin: ["/admin"],
};

function isAllowedRedirect(path: string, subject: SubjectType) {
  return ALLOWED_PREFIXES[subject].some((p) => path.startsWith(p));
}

export default function LoginClient() {
  const router = useRouter();
  const search = useSearchParams();
  const redirect = search.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const disabled = useMemo(
    () => loading || email.trim() === "" || password.trim() === "",
    [loading, email, password]
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (disabled) return;
    setErr(null);
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });

      const { subjectType }: { subjectType: SubjectType } = res.data;

      const target = isAllowedRedirect(redirect, subjectType)
        ? redirect
        : HOME_BY_SUBJECT[subjectType];

      router.replace(target);
      router.refresh();
    } catch (error) {
      if (isAxiosError(error)) {
        setErr(
          error.response?.data?.message ||
          error.message ||
          "Falha ao entrar"
        );
      } else {
        setErr("Falha ao entrar");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-svh grid grid-cols-1 lg:grid-cols-2 bg-background text-foreground">
      {/* Lado ilustrativo / branding (desktop) */}
      <div className="relative hidden lg:block">
        <div className="flex h-full flex-col justify-between p-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold"
            aria-label="Ir para a página inicial"
          >

            <Image
              src={eleva}
              alt="Eleva"
              width={96}
              height={96}
              priority 
              className="mb-6 rounded-2xl"
            />
          </Link>

          <div className="max-w-md">
            <h2 className="text-3xl font-semibold leading-tight">
              Bem-vindo de volta
            </h2>
            <p className="mt-3 text-muted-foreground">
              Faça login para acompanhar medidas, registrar seu progresso físico e acessar
              seus dados com segurança.
            </p>
          </div>

          <div className="text-xs text-muted-foreground/80">
            © {new Date().getFullYear()} Eleva. Todos os direitos
            reservados.
          </div>
        </div>
      </div>

      {/* Coluna do formulário */}
      <div className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          {/* Cabeçalho mobile */}
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold"
            >
              
              <span className="opacity-80">Eleva</span>
            </Link>


          </div>

          {/* Card */}
          <div className="rounded-2xl border border-border/30 bg-card shadow-sm">
            <div className="p-6">
              <div className="mb-6">
                <h1 className="text-xl font-semibold cursor-pointer">Entrar</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Acesse sua conta para continuar
                </p>
              </div>

              {/* Erro */}
              {err && (
                <div
                  className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  role="alert"
                  aria-live="polite"
                >
                  {err}
                </div>
              )}

              {/* Form */}
              <form onSubmit={onSubmit} className="grid gap-4">
                <div className="grid gap-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium leading-none"
                  >
                    E-mail
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="
                      block w-full rounded-xl border border-input bg-background
                      pl-10 pr-4 py-3
                      text-foreground placeholder-muted-foreground
                      outline-none ring-offset-background
                      transition focus-visible:ring-2 focus-visible:ring-ring
                    "
                      placeholder="voce@exemplo.com"
                    />
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
                  </div>
                </div>



                <div className="grid gap-2">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium leading-none"
                  >
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPwd ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full rounded-xl border border-input bg-background px-10 py-3 pr-12 text-foreground placeholder-muted-foreground outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPwd ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-40" />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Link
                    href="/recover-password"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Esqueci a senha
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={disabled}
                  className="mt-1 cursor-pointer   inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" />
                      Entrar
                    </>
                  )}
                </button>
              </form>




            </div>

            <div className="border-t border-border/30 px-6 py-4 text-center text-sm text-muted-foreground space-y-1">
              <div>
                Não tem conta?{" "}
                <Link href="/register" className="font-medium text-primary hover:underline">
                  Criar conta
                </Link>
              </div>
              <div>
                É profissional?{" "}
                <Link href="/register/professional" className="font-medium text-primary hover:underline">
                  Registre-se aqui
                </Link>
              </div>
            </div>
          </div>

          {/* Créditos mínimos */}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Eleva
          </p>
        </div>
      </div>
    </div>
  );
}
