"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import Image from "next/image";
import { isAxiosError } from "axios";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
  Phone,
  Award,
  CheckCircle2,
} from "lucide-react";
import eleva from "../../../../../public/imgs/eleva.png";

type Role = "trainer" | "nutritionist";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "trainer", label: "Personal Trainer" },
  { value: "nutritionist", label: "Nutricionista" },
];

export default function RegisterProfessionalPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);

  // Opcionais
  const [crefNumber, setCrefNumber] = useState("");
  const [crnNumber, setCrnNumber] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [bio, setBio] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const passwordValid = password.length >= 6;
  const passwordsMatch = password === confirmPassword;

  const disabled = useMemo(
    () =>
      loading ||
      !name.trim() ||
      !email.trim() ||
      !passwordValid ||
      !passwordsMatch ||
      roles.length === 0,
    [loading, name, email, passwordValid, passwordsMatch, roles]
  );

  function toggleRole(r: Role) {
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (disabled) return;
    setErr(null);
    setLoading(true);

    const payload: Record<string, unknown> = {
      name: name.trim(),
      email: email.trim(),
      password,
      roles,
    };
    if (crefNumber.trim()) payload.crefNumber = crefNumber.trim();
    if (crnNumber.trim()) payload.crnNumber = crnNumber.trim();
    if (contactPhone.trim()) payload.contactPhone = contactPhone.trim();
    if (whatsapp.trim()) payload.whatsapp = whatsapp.trim();
    if (instagram.trim()) payload.instagram = instagram.trim();
    if (bio.trim()) payload.bio = bio.trim();

    try {
      await api.post("/professional", payload);
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (error) {
      if (isAxiosError(error)) {
        setErr(error.response?.data?.error ?? error.message ?? "Erro ao criar conta");
      } else {
        setErr("Erro ao criar conta");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-svh grid grid-cols-1 lg:grid-cols-2 bg-background text-foreground">
      {/* Branding desktop */}
      <div className="relative hidden lg:block">
        <div className="flex h-full flex-col justify-between p-10">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold" aria-label="Ir para a página inicial">
            <Image src={eleva} alt="Eleva" width={96} height={96} priority className="mb-6 rounded-2xl" />
          </Link>
          <div className="max-w-md">
            <h2 className="text-3xl font-semibold leading-tight">Área do Profissional</h2>
            <p className="mt-3 text-muted-foreground">
              Crie sua conta para gerenciar seus alunos, enviar convites, criar dietas e treinos.
            </p>
          </div>
          <div className="text-xs text-muted-foreground/80">© {new Date().getFullYear()} Eleva. Todos os direitos reservados.</div>
        </div>
      </div>

      {/* Formulário */}
      <div className="flex items-start justify-center px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold">
              <span className="opacity-80">Eleva</span>
            </Link>
          </div>

          <div className="rounded-2xl border border-border/30 bg-card shadow-sm">
            <div className="p-6">
              <div className="mb-6">
                <h1 className="text-xl font-semibold">Criar conta profissional</h1>
                <p className="mt-1 text-sm text-muted-foreground">Preencha seus dados para começar</p>
              </div>

              {success && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Conta criada! Redirecionando para login...
                </div>
              )}

              {err && (
                <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                  {err}
                </div>
              )}

              <form onSubmit={onSubmit} className="grid gap-4">
                {/* Nome */}
                <div className="grid gap-2">
                  <label htmlFor="name" className="text-sm font-medium">Nome completo</label>
                  <div className="relative">
                    <input
                      id="name"
                      type="text"
                      required
                      autoFocus
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full rounded-xl border border-input bg-background pl-10 pr-4 py-3 text-foreground placeholder-muted-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Seu nome"
                    />
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
                  </div>
                </div>

                {/* Email */}
                <div className="grid gap-2">
                  <label htmlFor="email" className="text-sm font-medium">E-mail</label>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full rounded-xl border border-input bg-background pl-10 pr-4 py-3 text-foreground placeholder-muted-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="voce@exemplo.com"
                    />
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
                  </div>
                </div>

                {/* Roles */}
                <div>
                  <span className="text-sm font-medium mb-2 block">Função *</span>
                  <div className="flex gap-3">
                    {ROLE_OPTIONS.map((r) => (
                      <label key={r.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={roles.includes(r.value)}
                          onChange={() => toggleRole(r.value)}
                          className="h-4 w-4 rounded border-border accent-primary"
                        />
                        <span className="text-sm">{r.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Password */}
                <div className="grid gap-2">
                  <label htmlFor="password" className="text-sm font-medium">Senha</label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPwd ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full rounded-xl border border-input bg-background px-10 py-3 pr-12 text-foreground placeholder-muted-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Mínimo 6 caracteres"
                    />
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-40" />
                    <button type="button" onClick={() => setShowPwd((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground/80 hover:text-foreground">
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm */}
                <div className="grid gap-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium">Confirmar senha</label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPwd ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full rounded-xl border border-input bg-background px-10 py-3 pr-12 text-foreground placeholder-muted-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Repita a senha"
                    />
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-40" />
                    <button type="button" onClick={() => setShowConfirmPwd((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground/80 hover:text-foreground">
                      {showConfirmPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword && !passwordsMatch && (
                    <p className="text-xs text-destructive">As senhas não coincidem</p>
                  )}
                </div>

                {/* Opcionais */}
                <details className="group">
                  <summary className="cursor-pointer text-sm font-medium text-primary hover:underline list-none">
                    + Dados opcionais (CREF, telefone, etc.)
                  </summary>
                  <div className="mt-3 grid gap-3">
                    <InputField label="CREF" value={crefNumber} onChange={setCrefNumber} placeholder="000000-G/UF" icon={<Award className="h-4 w-4" />} />
                    <InputField label="CRN" value={crnNumber} onChange={setCrnNumber} placeholder="CRN-0 00000" icon={<Award className="h-4 w-4" />} />
                    <InputField label="Telefone" value={contactPhone} onChange={setContactPhone} placeholder="+5511999999999" icon={<Phone className="h-4 w-4" />} />
                    <InputField label="WhatsApp" value={whatsapp} onChange={setWhatsapp} placeholder="+5511999999999" icon={<Phone className="h-4 w-4" />} />
                    <InputField label="Instagram" value={instagram} onChange={setInstagram} placeholder="@usuario" />
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Bio</label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        maxLength={1024}
                        rows={2}
                        className="block w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground placeholder-muted-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring resize-none"
                        placeholder="Sobre você..."
                      />
                    </div>
                  </div>
                </details>

                <button
                  type="submit"
                  disabled={disabled}
                  className="mt-1 cursor-pointer inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Criando conta...</>
                  ) : (
                    "Criar conta profissional"
                  )}
                </button>
              </form>
            </div>

            <div className="border-t border-border/30 px-6 py-4 text-center text-sm text-muted-foreground">
              Já tem conta?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">Entrar</Link>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} Eleva</p>
        </div>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`block w-full rounded-xl border border-input bg-background ${icon ? "pl-10" : "pl-4"} pr-4 py-3 text-foreground placeholder-muted-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring`}
          placeholder={placeholder}
        />
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-50">
            {icon}
          </span>
        )}
      </div>
    </div>
  );
}
