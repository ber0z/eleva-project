"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";
import {
  Mail,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  RotateCw,
  CheckCircle2,
  XCircle,
} from "lucide-react";

type Step = "email" | "code" | "reset";

export default function RecoverPasswordPage() {
  const router = useRouter();
  const search = useSearchParams();
  const prefEmail = search.get("email") ?? "";

  // steps
  const [step, setStep] = useState<Step>("email");

  // email
  const [email, setEmail] = useState(prefEmail);
  const emailValid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.trim().length > 3;

  // code
  const [code, setCode] = useState("");
  const codeValid = /^\d{6}$/.test(code);

  // new password
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const passwordValid = password.length >= 6;
  const passwordsMatch = password === confirm;

  // ux
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // resend cooldown
  const COOLDOWN = 60; // segundos
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return;
    const i = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(i);
  }, [cooldown]);

  // handlers
  async function handleSendRecovery(e?: FormEvent) {
    e?.preventDefault();
    if (!emailValid) return;
    setErr(null);
    setOk(null);
    setLoading(true);
    try {
      await api.post("/auth/recovery", { email: email.trim() });
      setOk("Enviamos um código de 6 dígitos para seu e-mail.");
      setStep("code");
      setCooldown(COOLDOWN);
    } catch (error) {
      if (isAxiosError(error)) {
        setErr(
          error.response?.data?.message || error.message || "Falha ao enviar código"
        );
      } else setErr("Falha ao enviar código");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e?: FormEvent) {
    e?.preventDefault();
    if (!emailValid || !codeValid) return;
    setErr(null);
    setOk(null);
    setLoading(true);
    try {
      await api.post("/auth/verify-token", {
        email: email.trim(),
        recoveryCode: code,
      });
      setOk("Código verificado com sucesso.");
      setStep("reset");
    } catch (error) {
      if (isAxiosError(error)) {
        setErr(
          error.response?.data?.message ||
            error.message ||
            "Código inválido ou expirado"
        );
      } else setErr("Código inválido ou expirado");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e?: FormEvent) {
    e?.preventDefault();
    if (!emailValid || !codeValid || !passwordValid || !passwordsMatch) return;
    setErr(null);
    setOk(null);
    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        email: email.trim(),
        recoveryCode: code,
        newPassword: password,
      });
      // sucesso => enviar para login com email preenchido
      router.replace(`/login?email=${encodeURIComponent(email.trim())}`);
      router.refresh();
    } catch (error) {
      if (isAxiosError(error)) {
        setErr(
          error.response?.data?.message ||
            error.message ||
            "Não foi possível redefinir a senha"
        );
      } else setErr("Não foi possível redefinir a senha");
    } finally {
      setLoading(false);
    }
  }

  function maskedDigits(v: string) {
    return v.replace(/\D/g, "").slice(0, 6);
  }

  const disableEmailSubmit = useMemo(
    () => loading || !emailValid,
    [loading, emailValid]
  );
  const disableCodeSubmit = useMemo(
    () => loading || !emailValid || !codeValid,
    [loading, emailValid, codeValid]
  );
  const disableResetSubmit = useMemo(
    () =>
      loading ||
      !emailValid ||
      !codeValid ||
      !passwordValid ||
      !passwordsMatch,
    [loading, emailValid, codeValid, passwordValid, passwordsMatch]
  );

  return (
    <div className="min-h-svh grid grid-cols-1 lg:grid-cols-2 bg-background text-foreground">
      {/* Lado ilustrativo */}
      <div className="relative hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(0,0,0,0.06),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(0,0,0,0.04),transparent_35%)]" />
        <div className="flex h-full flex-col justify-between p-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold"
          >
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15">
              <span className="text-primary text-lg font-bold">∞</span>
            </div>
            <span className="opacity-80">Eleva</span>
          </Link>

          <div className="max-w-md">
            <h2 className="text-3xl font-semibold leading-tight">
              Recuperar senha
            </h2>
            <p className="mt-3 text-muted-foreground">
              Enviaremos um código de verificação para seu e-mail cadastrado.
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
        <div className="w-full max-w-md">
          {/* Cabeçalho mobile */}
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold"
            >
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15">
                <span className="text-primary text-lg font-bold">∞</span>
              </div>
              <span className="opacity-80">Eleva</span>
            </Link>
            <Link href="/login" className="text-sm text-primary hover:underline">
              Voltar ao login
            </Link>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <div className="p-6">
              <div className="mb-6">
                <h1 className="text-xl font-semibold">Recuperar senha</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {step === "email" && "Informe seu e-mail para receber o código."}
                  {step === "code" && "Digite o código de 6 dígitos enviado ao seu e-mail."}
                  {step === "reset" && "Defina a nova senha para sua conta."}
                </p>
              </div>

              {/* Alertas */}
              {err && (
                <div
                  className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  role="alert"
                  aria-live="polite"
                >
                  {err}
                </div>
              )}
              {ok && (
                <div
                  className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
                  role="status"
                  aria-live="polite"
                >
                  {ok}
                </div>
              )}

              {/* STEP 1: email */}
              {step === "email" && (
                <form onSubmit={handleSendRecovery} className="grid gap-4">
                  <div className="grid gap-2">
                    <label htmlFor="email" className="text-sm font-medium leading-none">
                      E-mail
                    </label>
                    <div className="relative">
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full rounded-xl border border-input bg-background px-4 py-3 pl-10 text-foreground placeholder-muted-foreground outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="voce@exemplo.com"
                      />
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-40" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={disableEmailSubmit}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Enviando código...
                      </>
                    ) : (
                      "Enviar código"
                    )}
                  </button>
                </form>
              )}

              {/* STEP 2: code */}
              {step === "code" && (
                <form onSubmit={handleVerifyCode} className="grid gap-4">
                  <div className="grid gap-2">
                    <label htmlFor="code" className="text-sm font-medium leading-none">
                      Código de verificação
                    </label>
                    <div className="relative">
                      <input
                        id="code"
                        name="code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="\d{6}"
                        maxLength={6}
                        required
                        value={code}
                        onChange={(e) => setCode(maskedDigits(e.target.value))}
                        className="tracking-widest text-center font-mono text-lg block w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground placeholder-muted-foreground outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="●●●●●●"
                        aria-invalid={code.length > 0 && !codeValid ? true : undefined}
                      />
                      <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-40" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enviado para <span className="font-medium">{email}</span>{" "}
                      <button
                        type="button"
                        onClick={() => setStep("email")}
                        className="ml-2 underline hover:no-underline"
                      >
                        alterar e-mail
                      </button>
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      className="text-sm inline-flex items-center gap-2 text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={cooldown > 0 || loading}
                      onClick={handleSendRecovery}
                    >
                      <RotateCw className="h-4 w-4" />
                      {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar código"}
                    </button>

                    <button
                      type="submit"
                      disabled={disableCodeSubmit}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Verificando...
                        </>
                      ) : (
                        "Verificar código"
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: reset */}
              {step === "reset" && (
                <form onSubmit={handleResetPassword} className="grid gap-4">
                  <div className="grid gap-2">
                    <label htmlFor="password" className="text-sm font-medium leading-none">
                      Nova senha
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPwd ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full rounded-xl border border-input bg-background px-4 py-3 pl-10 pr-12 text-foreground placeholder-muted-foreground outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="Mínimo 6 caracteres"
                        aria-invalid={!passwordValid && password.length > 0 ? true : undefined}
                      />
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-40" />
                      <button
                        type="button"
                        onClick={() => setShowPwd((s) => !s)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={showPwd ? "Ocultar nova senha" : "Mostrar nova senha"}
                      >
                        {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {!passwordValid && password.length > 0 && (
                      <p className="text-xs text-muted-foreground">Use ao menos 6 caracteres.</p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <label htmlFor="confirm" className="text-sm font-medium leading-none">
                      Confirmar nova senha
                    </label>
                    <div className="relative">
                      <input
                        id="confirm"
                        name="confirm"
                        type={showConfirmPwd ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        className="block w-full rounded-xl border border-input bg-background px-4 py-3 pl-10 pr-12 text-foreground placeholder-muted-foreground outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="Repita a nova senha"
                        aria-invalid={confirm.length > 0 && !passwordsMatch ? true : undefined}
                      />
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-40" />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPwd((s) => !s)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={showConfirmPwd ? "Ocultar confirmação" : "Mostrar confirmação"}
                      >
                        {showConfirmPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {confirm.length > 0 && !passwordsMatch && (
                      <p className="text-xs text-destructive">As senhas não coincidem.</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setStep("code")}
                      className="text-sm text-muted-foreground hover:underline"
                    >
                      Voltar
                    </button>

                    <button
                      type="submit"
                      disabled={disableResetSubmit}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Trocando senha...
                        </>
                      ) : (
                        "Redefinir senha"
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="border-t border-border px-6 py-4 text-center text-sm text-muted-foreground">
              Lembrou a senha?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Fazer login
              </Link>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Eleva
          </p>
        </div>
      </div>
    </div>
  );
}
