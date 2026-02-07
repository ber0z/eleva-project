// app/app/profile/page.tsx
"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { api } from "../../../../../lib/api";
import AvatarCircle from "../../_components/avatarCircle";
import {
  Camera,
  Save,
  X,
  Pencil,
  Loader2,
  Calendar,
  User,
  AtSign,
  Share2,
  Copy,
  Link as LinkIcon,
  Trash2,
  RefreshCw,
} from "lucide-react";

/* ===== Tipos ===== */
type Gender = "male" | "female" | "other";

type UserDTO = {
  id: number;
  name: string;
  birthDate: string; // ISO
  gender: Gender | string;
  profilePicture: string | null;
  createdAt: string;
  updatedAt: string;
  lastAccess?: string | null;
  isActive?: boolean;

  username?: string | null;
  isProfilePublic?: boolean;
  isProfileImagesPublic?: boolean;
};

type PresetDTO = {
  id: number;
  currentGoal?: string | null;
  idUser: number;
  terms?: string | null;
  dateSigningTerm?: string | null;
  createdAt: string;
  updatedAt: string;
};

type GetUserResponse = {
  user: UserDTO;
  preset?: PresetDTO | null;
};

type UpdateUserPayload = Partial<{
  name: string;
  birthDate: string; // ISO
  gender: Gender;

  username: string;
  isProfilePublic: boolean;
  isProfileImagesPublic: boolean;
}>;

type ShareProfileBody = {
  ttlMinutes: number;
  images: boolean;
};

type ShareProfileResponse = {
  url?: string;
  tokenHash?: string; // NOVO
  expiresAt?: string;
};

type ShareItem = {
  id: number;
  type: string; // "PROFILE" | "EVOLUTION" | "EVOLUTION_COMPARE" | ...
  includeImages: boolean;
  status: string; // "active" | "expired" | "revoked" | ...
  expiresAt: string | null;
  revokedAt: string | null;
  viewsCount: number;
  createdAt: string;
  updatedAt: string;

  tokenHash?: string | null; // NOVO (para montar o link na lista)

  target?: {
    evolutionId: number | null;
    evolutionAId: number | null;
    evolutionBId: number | null;
  };
};

/* ===== Helpers ===== */
const GENDER_LABEL: Record<string, string> = {
  male: "Masculino",
  female: "Feminino",
  other: "Outro",
};

// Aceita vários formatos (snake_case, kebab-case, etc.)
const GOAL_LABEL: Record<string, string> = {
  gain_muscle: "Ganhar massa muscular",
  lose_fat: "Perder gordura",
  recomposition: "Recomposição corporal",
  maintain: "Manutenção",
  increase_strength: "Aumentar força",
  improve_endurance: "Melhorar resistência",
  improve_health: "Melhorar saúde geral",
};

function normalizeGoalKey(v?: string | null) {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

function translateGoal(goal?: string | null) {
  const key = normalizeGoalKey(goal);
  if (!key) return null;
  return GOAL_LABEL[key] ?? goal; // fallback: mostra como veio do backend
}


const USERNAME_REGEX = /^[a-z0-9_]{3,32}$/i;

const TTL_OPTIONS = [
  { label: "15 min", minutes: 15 },
  { label: "1 hora", minutes: 60 },
  { label: "6 horas", minutes: 360 },
  { label: "1 dia", minutes: 1440 },
  { label: "1 semana", minutes: 10080 },
] as const;

function coerceGender(g: unknown): Gender {
  return g === "male" || g === "female" || g === "other" ? g : "other";
}

function isoToInputDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function inputDateToIso(input: string) {
  if (!input) return null;
  const [y, m, d] = input.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0);
  return dt.toISOString();
}

function normalizeUsername(v: string) {
  return v.trim().toLowerCase();
}

function parseAvailability(data: unknown): boolean | null {
  if (typeof data === "boolean") return data;
  if (!data || typeof data !== "object") return null;

  const obj = data as Record<string, unknown>;

  const available = obj["available"];
  if (typeof available === "boolean") return available;

  const isAvailable = obj["isAvailable"];
  if (typeof isAvailable === "boolean") return isAvailable;

  const exists = obj["exists"];
  if (typeof exists === "boolean") return !exists;

  const taken = obj["taken"];
  if (typeof taken === "boolean") return !taken;

  return null;
}

function boolLabel(v: boolean | undefined | null) {
  return v ? "Sim" : "Não";
}

function fmtDateTimeBR(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function getStatusBadge(status?: string) {
  const s = (status ?? "").toLowerCase();
  if (s === "active") return { label: "Ativo", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
  if (s === "expired") return { label: "Expirado", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
  if (s === "revoked") return { label: "Revogado", cls: "bg-rose-500/10 text-rose-600 border-rose-500/20" };
  return { label: status ?? "—", cls: "bg-muted text-foreground/80 border-border" };
}

function extractSharesArray(data: unknown): ShareItem[] {
  if (Array.isArray(data)) return data as ShareItem[];

  if (!data || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;

  const items = obj["items"];
  if (Array.isArray(items)) return items as ShareItem[];

  const shares = obj["shares"];
  if (Array.isArray(shares)) return shares as ShareItem[];

  const innerData = obj["data"];
  if (Array.isArray(innerData)) return innerData as ShareItem[];

  return [];
}

function buildPublicProfileUrl(publicOrigin: string, username?: string | null) {
  const u = normalizeUsername(username ?? "");
  if (!u) return null;
  return `${publicOrigin}/u/${encodeURIComponent(u)}`;
}

function buildTokenProfileUrl(tokenOrigin: string, tokenHash?: string | null) {
  if (!tokenHash) return null;
  return `${tokenOrigin}/u/${encodeURIComponent(tokenHash)}`;
}

// function shareTypeLabel(type?: string) {
//   const t = (type ?? "").toUpperCase();
//   if (t === "PROFILE") return "Perfil";
//   if (t === "EVOLUTION") return "Evolução";
//   if (t === "EVOLUTION_COMPARE" || t === "COMPARE") return "Comparação";
//   return type ?? "—";
// }

function shareTargetLabel(s: ShareItem) {
  const t = s.target;
  const type = (s.type ?? "").toUpperCase();

  if (type === "PROFILE") return "Perfil";
  if (!t) return "—";

  if (t.evolutionId) return `Evolução`;
  if (t.evolutionAId || t.evolutionBId) return `Comparação`;

  return "—";
}

// Ajuste os paths públicos se necessário:
// - EVOLUTION: /s/e/:token
// - COMPARAÇÃO: /s/c/:token
function buildShareUrlForItem(opts: {
  share: ShareItem;
  isPublicProfileNow: boolean;
  publicProfileUrl: string | null;
  origin: string;
}) {
  const { share, isPublicProfileNow, publicProfileUrl, origin } = opts;
  const type = (share.type ?? "").toUpperCase();

  // PROFILE:
  if (type === "PROFILE") {
    if (isPublicProfileNow) return publicProfileUrl;
    return buildTokenProfileUrl(origin, share.tokenHash ?? null);
  }

  const token = share.tokenHash ?? null;
  if (!token) return null;

  // EVOLUTION:
  if (type === "EVOLUTION") return `${origin}/s/e/${encodeURIComponent(token)}`;

  // COMPARAÇÃO:
  if (type === "COMPARISON") return `${origin}/s/c/${encodeURIComponent(token)}`;

  // fallback:
  return `${origin}/s/${encodeURIComponent(token)}`;
}

/* ===== Página ===== */
export default function ProfilePage() {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [preset, setPreset] = useState<PresetDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // edição
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<Gender>("other");

  // perfil público
  const [username, setUsername] = useState("");
  const [isProfilePublic, setIsProfilePublic] = useState(false);
  const [isProfileImagesPublic, setIsProfileImagesPublic] = useState(false);

  // username availability
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "invalid" | "checking" | "available" | "taken" | "unknown"
  >("idle");
  const usernameReqRef = useRef(0);

  // foto
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  // ===== Share profile (gerar link) =====
  const [shareTtlMinutes, setShareTtlMinutes] = useState<number>(15);
  const [shareImages, setShareImages] = useState<boolean>(true);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);
  const [sharedExpiresAt, setSharedExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const FRONT_ORIGIN = process.env.NEXT_PUBLIC_FRONT_URL ?? "http://localhost:1988";
  const PUBLIC_PROFILE_ORIGIN = process.env.NEXT_PUBLIC_PUBLIC_PROFILE_ORIGIN ?? FRONT_ORIGIN;
  const SHARE_ORIGIN = process.env.NEXT_PUBLIC_SHARE_ORIGIN ?? FRONT_ORIGIN; // usado para /u/:token e /s/*

  // ===== Shares list =====
  const [profileShares, setProfileShares] = useState<ShareItem[]>([]);
  const [sharesLoading, setSharesLoading] = useState(false);
  const [sharesError, setSharesError] = useState<string | null>(null);
  const [deletingShareId, setDeletingShareId] = useState<number | null>(null);

  async function loadProfileShares() {
    setSharesError(null);
    setSharesLoading(true);
    try {
      const res = await api.get("/share", { withCredentials: true });
      const all = extractSharesArray(res.data);

      // ✅ sem filtro: lista tudo
      const sorted = all.sort((a, b) => {
        const da = new Date(a.createdAt).getTime();
        const db = new Date(b.createdAt).getTime();
        return db - da;
      });

      setProfileShares(sorted);
    } catch {
      setSharesError("Não foi possível carregar seus compartilhamentos.");
    } finally {
      setSharesLoading(false);
    }
  }

  async function deleteShare(id: number) {
    setSharesError(null);
    setDeletingShareId(id);
    try {
      await api.delete(`/share/${id}`, { withCredentials: true });
      setProfileShares((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setSharesError("Não foi possível remover esse compartilhamento.");
    } finally {
      setDeletingShareId(null);
    }
  }

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    api
      .get<GetUserResponse>("/user", { withCredentials: true })
      .then((res) => {
        if (!mounted) return;
        const u = res.data.user;
        setUser(u);
        setPreset(res.data.preset ?? null);
        setName(u.name ?? "");
        setBirthDate(isoToInputDate(u.birthDate));
        setGender(coerceGender(u.gender));

        setUsername(u.username ?? "");
        setIsProfilePublic(Boolean(u.isProfilePublic));
        setIsProfileImagesPublic(Boolean(u.isProfileImagesPublic));
      })
      .catch(() => setError("Não foi possível carregar seu perfil agora."))
      .finally(() => mounted && setLoading(false));

    loadProfileShares();

    return () => {
      mounted = false;
    };
  }, []);

  // checar disponibilidade do username enquanto edita (debounce)
  useEffect(() => {
    if (!editing) return;

    const current = normalizeUsername(username);
    const original = normalizeUsername(user?.username ?? "");

    if (!current) {
      setUsernameStatus("idle");
      return;
    }
    if (!USERNAME_REGEX.test(current)) {
      setUsernameStatus("invalid");
      return;
    }
    if (current === original) {
      setUsernameStatus("available");
      return;
    }

    setUsernameStatus("checking");
    const reqId = ++usernameReqRef.current;

    const t = setTimeout(async () => {
      try {
        const res = await api.get(`/user/username-availability/${encodeURIComponent(current)}`, {
          withCredentials: true,
        });
        if (reqId !== usernameReqRef.current) return;

        const available = parseAvailability(res.data);
        if (available === null) setUsernameStatus("unknown");
        else setUsernameStatus(available ? "available" : "taken");
      } catch {
        if (reqId !== usernameReqRef.current) return;
        setUsernameStatus("unknown");
      }
    }, 450);

    return () => clearTimeout(t);
  }, [username, editing, user?.username]);

  const birthDateBR =
    user?.birthDate
      ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(user.birthDate))
      : "—";

  const goal = translateGoal(preset?.currentGoal ?? null);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    const url = URL.createObjectURL(f);
    previewRef.current = url;
    setPhotoPreview(url);
  }

  const usernameNormalized = normalizeUsername(username);
  const originalUsername = normalizeUsername(user?.username ?? "");
  const usernameChanged = editing && usernameNormalized !== originalUsername;

  const usernameOk =
    !usernameNormalized ||
    usernameNormalized === originalUsername ||
    (usernameStatus === "available" && USERNAME_REGEX.test(usernameNormalized));

  const dirty =
    editing &&
    (photoFile ||
      name !== (user?.name ?? "") ||
      birthDate !== isoToInputDate(user?.birthDate) ||
      gender !== coerceGender(user?.gender) ||
      usernameNormalized !== normalizeUsername(user?.username ?? "") ||
      isProfilePublic !== Boolean(user?.isProfilePublic) ||
      isProfileImagesPublic !== Boolean(user?.isProfileImagesPublic));

  async function onSave() {
    if (!user) return;

    if (usernameNormalized) {
      if (!USERNAME_REGEX.test(usernameNormalized)) {
        setError("Username inválido (use 3-32 caracteres: letras, números e _).");
        return;
      }
      if (usernameChanged && usernameStatus !== "available") {
        setError("Esse username já está em uso (ou não foi possível verificar).");
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      if (photoFile) {
        const fd = new FormData();
        fd.append("name", name);

        const iso = inputDateToIso(birthDate);
        if (iso) fd.append("birthDate", iso);

        fd.append("gender", coerceGender(gender));

        if (usernameNormalized) fd.append("username", usernameNormalized);
        if (usernameNormalized) {
          fd.append("isProfilePublic", String(isProfilePublic));
          fd.append("isProfileImagesPublic", String(isProfileImagesPublic));
        }

        fd.append("photo", photoFile);

        await api.put("/user", fd, {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        const iso = inputDateToIso(birthDate);
        const body: UpdateUserPayload = {
          name,
          gender: coerceGender(gender),
          ...(iso ? { birthDate: iso } : {}),
          ...(usernameNormalized ? { username: usernameNormalized } : {}),
          ...(usernameNormalized
            ? {
              isProfilePublic,
              isProfileImagesPublic,
            }
            : {}),
        };

        await api.put("/user", body, { withCredentials: true });
      }

      const res = await api.get<GetUserResponse>("/user", { withCredentials: true });
      setUser(res.data.user);
      setPreset(res.data.preset ?? null);

      setPhotoFile(null);
      setPhotoPreview(null);
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
        previewRef.current = null;
      }

      setUsername(res.data.user.username ?? "");
      setIsProfilePublic(Boolean(res.data.user.isProfilePublic));
      setIsProfileImagesPublic(Boolean(res.data.user.isProfileImagesPublic));

      setSharedUrl(null);
      setSharedExpiresAt(null);
      setShareError(null);

      setEditing(false);
    } catch {
      setError("Não foi possível salvar suas alterações.");
    } finally {
      setSaving(false);
    }
  }

  function onCancel() {
    if (!user) return;
    setEditing(false);
    setName(user.name ?? "");
    setBirthDate(isoToInputDate(user.birthDate));
    setGender(coerceGender(user.gender));

    setUsername(user.username ?? "");
    setIsProfilePublic(Boolean(user.isProfilePublic));
    setIsProfileImagesPublic(Boolean(user.isProfileImagesPublic));
    setUsernameStatus("idle");

    setPhotoFile(null);
    setPhotoPreview(null);
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
  }

  const isPublicProfileNow =
    !editing && Boolean(user?.isProfilePublic) && Boolean(normalizeUsername(user?.username ?? ""));

  const publicProfileUrl = buildPublicProfileUrl(PUBLIC_PROFILE_ORIGIN, user?.username ?? null);

  async function onShareProfile() {
    if (!user) return;

    // ✅ se for público, não gera nada (não precisa)
    if (isPublicProfileNow) return;

    setShareError(null);
    setSharing(true);

    try {
      const body: ShareProfileBody = {
        ttlMinutes: Number(shareTtlMinutes) || 15,
        images: Boolean(shareImages),
      };

      const res = await api.post<ShareProfileResponse>("/share/profile", body, { withCredentials: true });

      const tokenUrl =
        res.data?.url ??
        buildTokenProfileUrl(SHARE_ORIGIN, res.data?.tokenHash ?? null) ??
        null;

      setSharedUrl(tokenUrl);
      setSharedExpiresAt(res.data.expiresAt ?? null);

      loadProfileShares();
    } catch {
      setShareError("Não foi possível gerar o link de compartilhamento.");
    } finally {
      setSharing(false);
    }
  }

  async function copyShareUrl(urlToCopy?: string | null) {
    const text = urlToCopy ?? sharedUrl;
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  const canShareProfile = !editing && !!user;

  return (
    <section className="mx-auto max-w-5xl px-2 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>
        <p className="text-sm text-muted-foreground">Seus dados pessoais</p>
      </header>

      {/* ======= HERO ======= */}
      <div className="relative">
        <div className="absolute right-0 top-0 flex items-center gap-2">
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-accent cursor-pointer"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </button>
          ) : null}
        </div>

        <div className="flex flex-col items-center gap-3 pt-6">
          <div className="relative h-28 w-28 sm:h-32 sm:w-32">
            <div className="h-full w-full rounded-full overflow-hidden bg-muted ring-2 ring-border">
              {editing && photoPreview ? (
                <Image
                  src={photoPreview}
                  alt="Prévia da foto"
                  fill
                  unoptimized
                  className="object-cover object-center rounded-full"
                  sizes="(max-width: 640px) 112px, 128px"
                />
              ) : (
                <>
                  <div className="block sm:hidden">
                    <AvatarCircle size={112} />
                  </div>
                  <div className="hidden sm:block">
                    <AvatarCircle size={128} />
                  </div>
                </>
              )}
            </div>

            {editing && (
              <>
                <label
                  htmlFor="photo"
                  className="absolute -bottom-1 -right-1 inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground shadow ring-2 ring-background cursor-pointer"
                  title="Trocar foto"
                >
                  <Camera className="h-4 w-4" />
                </label>
                <input id="photo" type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </>
            )}
          </div>

          {!editing && (
            <>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-center">
                {user?.name ?? "Seu nome"}
              </h1>
              {goal ? (
                <p className="text-sm text-muted-foreground -mt-1 text-center">
                  Objetivo: <span className="font-medium">{goal}</span>
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>

      {/* ======= DADOS PESSOAIS ======= */}
      <div className="rounded-xl border border-border bg-card">
        <div className="px-3 sm:px-4 py-3 border-b border-border">
          <h2 className="text-sm font-medium text-muted-foreground">Dados pessoais</h2>
        </div>

        {!editing ? (
          <div className="px-3 sm:px-4 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-foreground/80" />
              <div>
                <div className="text-xs text-muted-foreground">Nome</div>
                <div className="text-sm font-medium">{user?.name ?? "—"}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-foreground/80" />
              <div>
                <div className="text-xs text-muted-foreground">Nascimento</div>
                <div className="text-sm font-medium">{birthDateBR}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-foreground/80" />
              <div>
                <div className="text-xs text-muted-foreground">Gênero</div>
                <div className="text-sm font-medium">{GENDER_LABEL[user?.gender ?? ""] ?? "Outro"}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <AtSign className="h-5 w-5 text-foreground/80" />
              <div>
                <div className="text-xs text-muted-foreground">Username</div>
                <div className="text-sm font-medium">{user?.username ?? "—"}</div>
              </div>
            </div>

            {(user?.username ?? "").trim() ? (
              <>
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-foreground/80" />
                  <div>
                    <div className="text-xs text-muted-foreground">Perfil público</div>
                    <div className="text-sm font-medium">{boolLabel(user?.isProfilePublic)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-foreground/80" />
                  <div>
                    <div className="text-xs text-muted-foreground">Imagens públicas</div>
                    <div className="text-sm font-medium">{boolLabel(user?.isProfileImagesPublic)}</div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        ) : (
          <form
            className="px-3 sm:px-4 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              onSave();
            }}
          >
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Nome</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                placeholder="Seu nome"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Nascimento</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Gênero</label>
              <select
                value={gender}
                onChange={(e) => setGender(coerceGender(e.target.value))}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              >
                <option value="male">Masculino</option>
                <option value="female">Feminino</option>
                <option value="other">Outro</option>
              </select>
            </div>

            {/* ===== username ===== */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={() => setUsername(normalizeUsername(username))}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                placeholder="seu_username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />

              {usernameNormalized ? (
                <div className="text-xs">
                  {usernameStatus === "invalid" ? (
                    <span className="text-rose-600 dark:text-rose-300">
                      Username inválido (use 3-32 caracteres: letras, números e _).
                    </span>
                  ) : usernameStatus === "checking" ? (
                    <span className="text-muted-foreground inline-flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Verificando disponibilidade…
                    </span>
                  ) : usernameStatus === "taken" ? (
                    <span className="text-rose-600 dark:text-rose-300">Esse username já está em uso.</span>
                  ) : usernameStatus === "available" ? (
                    <span className="text-emerald-600 dark:text-emerald-300">Username disponível ✅</span>
                  ) : usernameStatus === "unknown" ? (
                    <span className="text-muted-foreground">Não foi possível verificar agora.</span>
                  ) : null}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">Defina um username para habilitar opções de perfil público.</div>
              )}
            </div>

            {/* Foto */}
            <div className="flex flex-col gap-2">
              <label className="text-xs text-muted-foreground">Foto</label>
              <div className="flex items-center gap-3">
                <label
                  htmlFor="photo2"
                  className="inline-flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm cursor-pointer hover:bg-accent"
                >
                  <Camera className="h-4 w-4" />
                  {photoFile ? "Trocar arquivo…" : "Selecionar arquivo…"}
                </label>
                <input id="photo2" type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                {photoFile ? <span className="text-xs text-muted-foreground truncate max-w-40">{photoFile.name}</span> : null}
              </div>
            </div>

            {/* ===== booleans (somente se username definido) ===== */}
            {usernameNormalized ? (
              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isProfilePublic}
                    onChange={(e) => setIsProfilePublic(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Perfil público
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isProfileImagesPublic}
                    onChange={(e) => setIsProfileImagesPublic(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Imagens públicas
                </label>
              </div>
            ) : null}

            <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-accent cursor-pointer"
              >
                <X className="h-4 w-4" />
                Cancelar
              </button>

              <button
                type="submit"
                disabled={!dirty || saving || !usernameOk}
                className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm disabled:opacity-60 cursor-pointer"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ======= COMPARTILHAR PERFIL ======= */}
      <div className="rounded-xl border border-border bg-card">
        <div className="px-3 sm:px-4 py-3 border-b border-border flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium text-muted-foreground">Compartilhar perfil</h2>
            <p className="text-xs text-muted-foreground">
              {isPublicProfileNow ? "Seu perfil é público: use o link permanente" : "Seu perfil é privado: gere um link temporário com token"}
            </p>
          </div>

          {/* ✅ Botão só aparece quando for PRIVADO */}
          {!isPublicProfileNow ? (
            <button
              type="button"
              onClick={onShareProfile}
              disabled={!canShareProfile || sharing}
              className="
              inline-flex items-center justify-center gap-2
              rounded-md bg-primary text-primary-foreground
              px-2 py-2 text-sm
              whitespace-nowrap
              w-full sm:w-auto
              disabled:opacity-60 cursor-pointer
            "
              title={editing ? "Salve/cancele a edição para compartilhar" : "Gerar link"}
            >
              {sharing ? (
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              ) : (
                <Share2 className="h-4 w-4 shrink-0" />
              )}
              <span className="whitespace-nowrap">Gerar link</span>
            </button>

          ) : null}
        </div>

        <div className="px-3 sm:px-4 py-4 space-y-3">
          {/* ✅ MODO PÚBLICO: só mostra link permanente */}
          {isPublicProfileNow ? (
            publicProfileUrl ? (
              <div className="rounded-md border border-border bg-background p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <LinkIcon className="h-3.5 w-3.5" />
                      Link público
                    </div>
                    <a
                      href={publicProfileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium break-all underline underline-offset-2"
                    >
                      {publicProfileUrl}
                    </a>
                    <div className="text-xs text-muted-foreground mt-1">Expira em: Nunca</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => copyShareUrl(publicProfileUrl)}
                    className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-accent"
                    title="Copiar link"
                  >
                    <Copy className="h-4 w-4" />
                    {copied ? "Copiado!" : "Copiar"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Defina um <span className="font-medium">username</span> para ter um link público.
              </div>
            )
          ) : (
            <>
              {/* ✅ MODO PRIVADO: TTL + imagens + link gerado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Tempo de expiração do link</label>
                  <select
                    value={String(shareTtlMinutes)}
                    onChange={(e) => setShareTtlMinutes(Number(e.target.value))}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                    disabled={!canShareProfile || sharing}
                  >
                    {TTL_OPTIONS.map((opt) => (
                      <option key={opt.minutes} value={String(opt.minutes)}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={shareImages}
                      onChange={(e) => setShareImages(e.target.checked)}
                      className="h-4 w-4"
                      disabled={!canShareProfile || sharing}
                    />
                    Incluir imagens
                  </label>
                </div>
              </div>

              {shareError ? (
                <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-600 dark:text-rose-300">
                  {shareError}
                </div>
              ) : null}

              {sharedUrl ? (
                <div className="rounded-md border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <LinkIcon className="h-3.5 w-3.5" />
                        Link gerado
                      </div>
                      <a
                        href={sharedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium break-all underline underline-offset-2"
                      >
                        {sharedUrl}
                      </a>
                      <div className="text-xs text-muted-foreground mt-1">Expira em: {fmtDateTimeBR(sharedExpiresAt)}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => copyShareUrl()}
                      className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-accent"
                      title="Copiar link"
                    >
                      <Copy className="h-4 w-4" />
                      {copied ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  Clique em <span className="font-medium">Gerar link</span> para criar o compartilhamento.
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ======= COMPARTILHAMENTOS (TODOS) ======= */}
      <div className="rounded-xl border border-border bg-card">
        <div className="px-3 sm:px-4 py-3 border-b border-border flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium text-muted-foreground">Compartilhamentos</h2>
            <p className="text-xs text-muted-foreground">Todos os links gerados (perfil, evolução, comparação...).</p>
          </div>

          <button
            type="button"
            onClick={loadProfileShares}
            disabled={sharesLoading}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-accent disabled:opacity-60 cursor-pointer"
            title="Atualizar"
          >
            {sharesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Atualizar
          </button>
        </div>

        <div className="px-3 sm:px-4 py-4 space-y-3">
          {sharesError ? (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-600 dark:text-rose-300">
              {sharesError}
            </div>
          ) : null}

          {sharesLoading && profileShares.length === 0 ? (
            <div className="text-sm text-muted-foreground inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando…
            </div>
          ) : null}

          {!sharesLoading && profileShares.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhum compartilhamento encontrado.</div>
          ) : null}

          {profileShares.length > 0 ? (
            <div className="space-y-2">
              {profileShares.map((s) => {
                const badge = getStatusBadge(s.status);

                const rowUrl = buildShareUrlForItem({
                  share: s,
                  isPublicProfileNow,
                  publicProfileUrl,
                  origin: SHARE_ORIGIN,
                });

                return (
                  <div
                    key={s.id}
                    className="rounded-md border border-border bg-background p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${badge.cls}`}>{badge.label}</span>



                        <span className="text-xs text-muted-foreground">
                          Visualizações: <span className="font-medium text-foreground/90">{s.viewsCount ?? 0}</span>
                        </span>

                        <span className="text-xs text-muted-foreground">
                          Imagens: <span className="font-medium text-foreground/90">{s.includeImages ? "Sim" : "Não"}</span>
                        </span>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Tipo: <span className="text-foreground/90">{shareTargetLabel(s)}</span>
                      </div>

                      {/* Link para o usuário */}
                      <div className="text-xs text-muted-foreground">
                        Link:{" "}
                        {rowUrl ? (
                          <a
                            href={rowUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-foreground/90 underline underline-offset-2 break-all"
                          >
                            {rowUrl}
                          </a>
                        ) : (
                          <span className="text-foreground/60">—</span>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Criado em: <span className="text-foreground/90">{fmtDateTimeBR(s.createdAt)}</span>
                        {" • "}
                        Expira em:{" "}
                        <span className="text-foreground/90">
                          {s.expiresAt ? fmtDateTimeBR(s.expiresAt) : s.type?.toUpperCase() === "PROFILE" && isPublicProfileNow ? "Permanente" : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      {rowUrl ? (
                        <button
                          type="button"
                          onClick={() => copyShareUrl(rowUrl)}
                          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-accent cursor-pointer"
                          title="Copiar link"
                        >
                          <Copy className="h-4 w-4" />
                          Copiar
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => deleteShare(s.id)}
                        disabled={deletingShareId === s.id}
                        className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-accent disabled:opacity-60 cursor-pointer"
                        title="Remover"
                      >
                        {deletingShareId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        Remover
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      {!loading && error && (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-600 dark:text-rose-300">
          {error}
        </div>
      )}
    </section>
  );
}
