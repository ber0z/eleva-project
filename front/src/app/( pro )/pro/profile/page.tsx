"use client";

import { useEffect, useState, useRef, FormEvent } from "react";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";
import {
  Loader2,
  Pencil,
  X,
  Save,
  User,
  Phone,
  Instagram,
  MessageCircle,
  Award,
  FileText,
  Camera,
} from "lucide-react";

function toE164(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (value.trim().startsWith("+")) return "+" + digits;
  // assume Brazil if no country code (11 digits = already has DDD, 10 = sem 9)
  if (digits.length <= 11) return "+55" + digits;
  return "+" + digits;
}

type Professional = {
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
  isActive: boolean;
  createdAt: string;
};

const ROLE_LABELS: Record<string, string> = {
  trainer: "Personal Trainer",
  nutritionist: "Nutricionista",
};

export default function ProfilePage() {
  const [pro, setPro] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  // Edit state
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [crefNumber, setCrefNumber] = useState("");
  const [crnNumber, setCrnNumber] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  // Photo state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .get("/professional/me")
      .then((res) => {
        const d = res.data;
        setPro(d);
        populateForm(d);
      })
      .catch(() => setError("Erro ao carregar perfil"))
      .finally(() => setLoading(false));

    fetchProfilePicture();
  }, []);

  function fetchProfilePicture() {
    api
      .get("/professional/me/profile-picture")
      .then((res) => setProfilePictureUrl(res.data.url))
      .catch(() => setProfilePictureUrl(null));
  }

  function populateForm(d: Professional) {
    setName(d.name);
    setBio(d.bio ?? "");
    setCrefNumber(d.crefNumber ?? "");
    setCrnNumber(d.crnNumber ?? "");
    setContactPhone(d.contactPhone ?? "");
    setWhatsapp(d.whatsapp ?? "");
    setInstagram(d.instagram ?? "");
    setRoles(d.roles);
  }

  function cancelEdit() {
    if (pro) populateForm(pro);
    setEditing(false);
    setSaveErr(null);
    setPhotoFile(null);
    setPhotoPreview(null);
  }

  function toggleRole(role: string) {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) { setSaveErr("Nome deve ter pelo menos 2 caracteres"); return; }
    if (roles.length === 0) { setSaveErr("Selecione pelo menos uma função"); return; }

    setSaving(true);
    setSaveErr(null);

    try {
      let res;

      if (photoFile) {
        const formData = new FormData();
        formData.append("name", name.trim());
        formData.append("roles", JSON.stringify(roles));
        if (bio.trim()) formData.append("bio", bio.trim());
        if (crefNumber.trim()) formData.append("crefNumber", crefNumber.trim());
        if (crnNumber.trim()) formData.append("crnNumber", crnNumber.trim());
        if (contactPhone.trim()) formData.append("contactPhone", contactPhone.trim());
        const waFormatted = toE164(whatsapp);
        if (waFormatted) formData.append("whatsapp", waFormatted);
        if (instagram.trim()) formData.append("instagram", instagram.trim());
        formData.append("photo", photoFile);

        res = await api.put("/professional/me", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        const payload: Record<string, unknown> = {
          name: name.trim(),
          roles,
          bio: bio.trim() || null,
          crefNumber: crefNumber.trim() || null,
          crnNumber: crnNumber.trim() || null,
          contactPhone: contactPhone.trim() || null,
          whatsapp: toE164(whatsapp) || null,
          instagram: instagram.trim() || null,
        };
        res = await api.put("/professional/me", payload);
      }

      setPro(res.data);
      setEditing(false);
      setPhotoFile(null);
      setPhotoPreview(null);
      fetchProfilePicture();
    } catch (err) {
      if (isAxiosError(err)) setSaveErr(err.response?.data?.error ?? "Erro ao salvar");
      else setSaveErr("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !pro) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">
        {error ?? "Perfil indisponível"}
      </div>
    );
  }

  const avatarSrc = photoPreview ?? profilePictureUrl;

  const hasCredentials = pro.crefNumber || pro.crnNumber;
  const hasContact = pro.contactPhone || pro.whatsapp || pro.instagram;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>
          <p className="text-sm text-muted-foreground">Seus dados profissionais</p>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 rounded-md border border-border/30 bg-card px-3 py-2 text-sm hover:bg-accent transition"
          >
            <Pencil className="h-4 w-4" /> Editar
          </button>
        ) : (
          <button
            onClick={cancelEdit}
            className="inline-flex items-center gap-2 rounded-md border border-border/30 bg-card px-3 py-2 text-sm hover:bg-accent transition"
          >
            <X className="h-4 w-4" /> Cancelar
          </button>
        )}
      </div>

      {!editing ? (
        /* === VIEW MODE === */
        <div className="space-y-4">
          {/* Hero */}
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-full overflow-hidden bg-muted ring-2 ring-border grid place-items-center">
              {avatarSrc ? (
                <img src={avatarSrc} alt={pro.name} className="h-full w-full object-cover" />
              ) : (
                <User className="h-12 w-12 text-muted-foreground" />
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-center">{pro.name}</h2>
            <div className="flex gap-2 flex-wrap justify-center">
              {pro.roles.map((r) => (
                <span key={r} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {ROLE_LABELS[r] ?? r}
                </span>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              Membro desde {new Date(pro.createdAt).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </span>
            {pro.bio && (
              <p className="text-sm text-muted-foreground text-center max-w-md mt-1">{pro.bio}</p>
            )}
          </div>

          {/* Credenciais */}
          <div className="rounded-xl border border-border/30 bg-card">
            <div className="px-3 sm:px-4 py-3 border-b border-border/30">
              <h2 className="text-sm font-medium text-muted-foreground">Credenciais</h2>
            </div>
            <div className="px-3 sm:px-4 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {hasCredentials ? (
                <>
                  {pro.crefNumber && (
                    <InfoRow icon={<Award className="h-5 w-5 text-foreground/80" />} label="CREF" value={pro.crefNumber} />
                  )}
                  {pro.crnNumber && (
                    <InfoRow icon={<FileText className="h-5 w-5 text-foreground/80" />} label="CRN" value={pro.crnNumber} />
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground col-span-full">Nenhuma credencial cadastrada</p>
              )}
            </div>
          </div>

          {/* Contato */}
          <div className="rounded-xl border border-border/30 bg-card">
            <div className="px-3 sm:px-4 py-3 border-b border-border/30">
              <h2 className="text-sm font-medium text-muted-foreground">Contato</h2>
            </div>
            <div className="px-3 sm:px-4 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {hasContact ? (
                <>
                  {pro.contactPhone && (
                    <InfoRow icon={<Phone className="h-5 w-5 text-foreground/80" />} label="Telefone" value={pro.contactPhone} />
                  )}
                  {pro.whatsapp && (
                    <InfoRow icon={<MessageCircle className="h-5 w-5 text-foreground/80" />} label="WhatsApp" value={pro.whatsapp} />
                  )}
                  {pro.instagram && (
                    <InfoRow icon={<Instagram className="h-5 w-5 text-foreground/80" />} label="Instagram" value={pro.instagram} />
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground col-span-full">Nenhum contato cadastrado</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* === EDIT MODE === */
        <form onSubmit={handleSave} className="space-y-4">
          {saveErr && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {saveErr}
            </div>
          )}

          {/* Photo upload — centered hero */}
          <div className="flex flex-col items-center gap-2 py-6">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-full bg-muted overflow-hidden ring-2 ring-border grid place-items-center group cursor-pointer"
            >
              {avatarSrc ? (
                <img src={avatarSrc} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <User className="h-12 w-12 text-muted-foreground" />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition rounded-full">
                <Camera className="h-6 w-6 text-white" />
              </div>
            </button>
            <p className="text-xs text-muted-foreground">Clique para alterar a foto</p>
            {photoFile && <p className="text-xs text-primary">{photoFile.name}</p>}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
          </div>

          {/* Dados */}
          <div className="rounded-xl border border-border/30 bg-card">
            <div className="px-3 sm:px-4 py-3 border-b border-border/30">
              <h2 className="text-sm font-medium text-muted-foreground">Dados</h2>
            </div>
            <div className="px-3 sm:px-4 py-4 space-y-4">
              <InputField label="Nome" value={name} onChange={setName} required />

              <div>
                <span className="text-xs text-muted-foreground mb-2 block">Funções</span>
                <div className="flex gap-3">
                  {(["trainer", "nutritionist"] as const).map((r) => (
                    <label key={r} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={roles.includes(r)}
                        onChange={() => toggleRole(r)}
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                      <span className="text-sm">{ROLE_LABELS[r]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-1">
                <label className="text-xs text-muted-foreground">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={1024}
                  rows={3}
                  className="block w-full rounded-md border border-border/30 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 resize-none"
                  placeholder="Sobre você..."
                />
              </div>
            </div>
          </div>

          {/* Credenciais */}
          <div className="rounded-xl border border-border/30 bg-card">
            <div className="px-3 sm:px-4 py-3 border-b border-border/30">
              <h2 className="text-sm font-medium text-muted-foreground">Credenciais</h2>
            </div>
            <div className="px-3 sm:px-4 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField label="CREF" value={crefNumber} onChange={setCrefNumber} placeholder="000000-G/UF" />
              <InputField label="CRN" value={crnNumber} onChange={setCrnNumber} placeholder="CRN-0 00000" />
            </div>
          </div>

          {/* Contato */}
          <div className="rounded-xl border border-border/30 bg-card">
            <div className="px-3 sm:px-4 py-3 border-b border-border/30">
              <h2 className="text-sm font-medium text-muted-foreground">Contato</h2>
            </div>
            <div className="px-3 sm:px-4 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField label="Telefone" value={contactPhone} onChange={setContactPhone} placeholder="+5511999999999" />
              <InputField label="WhatsApp" value={whatsapp} onChange={setWhatsapp} placeholder="+5511999999999" />
              <InputField label="Instagram" value={instagram} onChange={setInstagram} placeholder="@usuario" />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar alterações
          </button>
        </form>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="rounded-md border border-border/30 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
        placeholder={placeholder}
      />
    </div>
  );
}
