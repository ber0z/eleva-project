"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import Image from "next/image";
import { isAxiosError } from "axios";
import {
  Calendar,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
  ClipboardList,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import eleva from "../../../../public/imgs/eleva.png";

type Gender = "male" | "female" | "other";
type EmailStatus = "idle" | "checking" | "available" | "taken" | "error";

type GoalPreset =
  | "gain_muscle"
  | "lose_fat"
  | "recomposition"
  | "maintain"
  | "increase_strength"
  | "improve_endurance"
  | "improve_health";

const GOAL_PRESETS: { value: GoalPreset; label: string }[] = [
  { value: "gain_muscle", label: "Ganhar massa muscular" },
  { value: "lose_fat", label: "Perder gordura" },
  { value: "recomposition", label: "Recomposição corporal" },
  { value: "maintain", label: "Manutenção" },
  { value: "increase_strength", label: "Aumentar força" },
  { value: "improve_endurance", label: "Melhorar resistência" },
  { value: "improve_health", label: "Melhorar saúde geral" },
];

export default function RegisterPage() {
  const router = useRouter();

  // form state
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState(""); // YYYY-MM-DD
  const [gender, setGender] = useState<Gender>("male");
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<EmailStatus>("idle");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  // confirmação de senha
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  // ✅ Objetivo (somente presets)
  const [goalPreset, setGoalPreset] = useState<GoalPreset>("gain_muscle");

  const [acceptTerms, setAcceptTerms] = useState(false);
  const [termsText] = useState("Aceito os termos de uso.");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.trim().length > 3;
  const passwordValid = password.length >= 6;
  const birthValid = /^\d{4}-\d{2}-\d{2}$/.test(birthDate);
  const passwordsMatch = password === confirmPassword;

  const disabled = useMemo(
    () =>
      loading ||
      !name.trim() ||
      !birthValid ||
      !emailValid ||
      !passwordValid ||
      !acceptTerms ||
      emailStatus === "taken" ||
      emailStatus === "checking" ||
      !passwordsMatch,
    [loading, name, birthValid, emailValid, passwordValid, acceptTerms, emailStatus, passwordsMatch]
  );

  async function checkEmailAvailability(): Promise<EmailStatus> {
    if (!emailValid) {
      setEmailStatus("idle");
      return "idle";
    }

    try {
      setEmailStatus("checking");
      const { data } = await api.get("/auth/check-email", { params: { email: email.trim() } });
      const taken = data?.exists === true;
      const status: EmailStatus = taken ? "taken" : "available";
      setEmailStatus(status);
      return status;
    } catch {
      setEmailStatus("error");
      return "error";
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!passwordsMatch) {
      setErr("As senhas não coincidem.");
      return;
    }

    // Checagem de e-mail antes de criar (sem race condition)
    let status: EmailStatus = emailStatus;
    if (emailValid) {
      status = await checkEmailAvailability();
    }
    if (status === "taken") {
      setErr("Este e-mail já está em uso.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        birthDate,
        gender,
        email: email.trim(),
        password,
        preset: {
          currentGoal: goalPreset, // <-- envia o ENUM
          terms: termsText,
        },
      };

      await api.post("/user", payload);

      router.replace(`/login?email=${encodeURIComponent(email.trim())}`);
      router.refresh();
    } catch (error) {
      if (isAxiosError(error)) {
        setErr(error.response?.data?.message || error.message || "Falha ao criar conta");
      } else {
        setErr("Falha ao criar conta");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-svh grid grid-cols-1 lg:grid-cols-2 bg-background text-foreground">
      {/* Lado ilustrativo / branding (desktop) */}
      <div className="relative hidden lg:block">
        <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-primary/5 to-transparent" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(0,0,0,0.06),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(0,0,0,0.04),transparent_35%)]" />
        <div className="flex h-full flex-col justify-between p-10">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold" aria-label="Ir para a página inicial">
            <Image src={eleva} alt="Eleva" width={96} height={96} priority className="mb-6 rounded-lg" />
          </Link>

          <div className="max-w-md">
            <h2 className="text-3xl font-semibold leading-tight">Crie sua conta</h2>
            <p className="mt-3 text-muted-foreground">Cadastre-se para acompanhar métricas, registrar treinos e muito mais.</p>
          </div>

          <div className="text-xs text-muted-foreground/80">© {new Date().getFullYear()} Eleva. Todos os direitos reservados.</div>
        </div>
      </div>

      {/* Coluna do formulário */}
      <div className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          {/* Cabeçalho mobile */}
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold">
              <Image src={eleva} alt="Eleva" width={96} height={96} priority className="mb-6 rounded-lg" />
            </Link>

            <Link href="/login" className="text-sm text-primary hover:underline">
              Entrar
            </Link>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <div className="p-6">
              <div className="mb-6">
                <h1 className="text-xl font-semibold">Criar conta</h1>
                <p className="mt-1 text-sm text-muted-foreground">Preencha seus dados para começar</p>
              </div>

              {/* Erro */}
              {err && (
                <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert" aria-live="polite">
                  {err}
                </div>
              )}

              <form onSubmit={onSubmit} className="grid gap-4">
                {/* Nome */}
                <div className="grid gap-2">
                  <label htmlFor="name" className="text-sm font-medium leading-none">
                    Nome completo
                  </label>
                  <div className="relative">
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full rounded-xl border border-input bg-background px-4 py-3 pl-10 text-foreground placeholder-muted-foreground outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Seu nome"
                    />
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-40" />
                  </div>
                </div>

                {/* Data de nascimento */}
                <div className="grid gap-2">
                  <label htmlFor="birthDate" className="text-sm font-medium leading-none">
                    Data de nascimento
                  </label>
                  <div className="relative">
                    <input
                      id="birthDate"
                      name="birthDate"
                      type="date"
                      required
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="block w-full rounded-xl border border-input bg-background px-4 py-3 pl-10 text-foreground placeholder-muted-foreground outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-40" />
                  </div>
                </div>

                {/* Gênero */}
                <div className="grid gap-2">
                  <label htmlFor="gender" className="text-sm font-medium leading-none">
                    Sexo
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="block w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="male">Masculino</option>
                    <option value="female">Feminino</option>
                    <option value="other">Outro</option>
                  </select>
                </div>

                {/* E-mail */}
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
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailStatus("idle");
                      }}
                      onBlur={() => void checkEmailAvailability()}
                      className="block w-full rounded-xl border border-input bg-background px-4 py-3 pl-10 pr-10 text-foreground placeholder-muted-foreground outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="voce@exemplo.com"
                      aria-invalid={emailStatus === "taken" ? true : undefined}
                    />
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-40" />

                    {emailValid && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {emailStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin opacity-60" />}
                        {emailStatus === "available" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                        {emailStatus === "taken" && <XCircle className="h-4 w-4 text-destructive" />}
                      </div>
                    )}
                  </div>
                  {emailStatus === "taken" && <p className="text-xs text-destructive">Este e-mail já está em uso.</p>}
                  {emailStatus === "error" && (
                    <p className="text-xs text-muted-foreground">
                      Não foi possível verificar o e-mail agora. Você ainda pode tentar criar a conta.
                    </p>
                  )}
                </div>

                {/* Senha */}
                <div className="grid gap-2">
                  <label htmlFor="password" className="text-sm font-medium leading-none">
                    Senha
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
                      aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {!passwordValid && password.length > 0 && <p className="text-xs text-muted-foreground">Use ao menos 6 caracteres.</p>}
                </div>

                {/* Confirmar senha */}
                <div className="grid gap-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium leading-none">
                    Confirmar senha
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPwd ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full rounded-xl border border-input bg-background px-4 py-3 pl-10 pr-12 text-foreground placeholder-muted-foreground outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Repita a senha"
                      aria-invalid={confirmPassword.length > 0 && !passwordsMatch ? true : undefined}
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
                  {confirmPassword.length > 0 && !passwordsMatch && <p className="text-xs text-destructive">As senhas não coincidem.</p>}
                </div>

                {/* ✅ Objetivo atual (somente presets) */}
                <div className="grid gap-2">
                  <label htmlFor="goalPreset" className="text-sm font-medium leading-none">
                    Objetivo atual
                  </label>

                  <div className="relative">
                    <select
                      id="goalPreset"
                      name="goalPreset"
                      value={goalPreset}
                      onChange={(e) => setGoalPreset(e.target.value as GoalPreset)}
                      className="block w-full rounded-xl border border-input bg-background px-4 py-3 pl-10 text-foreground outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {GOAL_PRESETS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    <ClipboardList className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-40" />
                  </div>
                </div>

                {/* Termos */}
                <div className="flex items-start gap-3">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-input text-primary focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <label htmlFor="terms" className="text-sm text-muted-foreground">
                    Li e aceito os{" "}
                    <Link href="/terms" target="_blank" className="font-medium text-primary hover:underline">
                      termos de uso e política de privacidade
                    </Link>
                    .
                  </label>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={disabled}
                  className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    <>Criar conta</>
                  )}
                </button>
              </form>
            </div>

            <div className="border-t border-border px-6 py-4 text-center text-sm text-muted-foreground">
              Já tem conta?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Entrar
              </Link>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} Eleva</p>
        </div>
      </div>
    </div>
  );
}
