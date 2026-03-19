"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, memo } from "react";
import { api } from "@/lib/api";
import { User } from "lucide-react";

/* ===== Tipos ===== */
type ProfilePicResponse = {
  url: string;
  expiresAt: string; // ISO
};

type Props = {
  /** Usa a URL externa diretamente (se passada, ignora o fetch interno) */
  src?: string | null;
  alt?: string;
  name?: string;
  size?: number;           // px
  ring?: boolean;
  className?: string;
  priority?: boolean;      // carregamento prioritário
  unoptimized?: boolean;   // deixe true p/ URLs assinadas do R2, a menos que configure remotePatterns
};

/* ===== Util opcional (mantido caso queira usar no futuro) ===== */
function initialsFromName(name?: string) {
  if (!name) return "•";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  const inits = (first + last).toUpperCase().slice(0, 2);
  return inits || "•";
}

/* =========================================================
   Gerenciador global do avatar (deduplica fetch/timer)
   ========================================================= */
const AVATAR_CACHE_KEY = "eleva_avatar_cache";

class AvatarPhotoManager {
  private url: string | null = null;
  private expiresAt = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private subs = new Set<(url: string | null) => void>();
  private inflight: Promise<void> | null = null;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(AVATAR_CACHE_KEY);
      if (!raw) return;
      const { url, expiresAt } = JSON.parse(raw) as { url: string; expiresAt: number };
      if (Date.now() < expiresAt - 30_000) {
        this.url = url;
        this.expiresAt = expiresAt;
      }
    } catch { /* ignore */ }
  }

  private saveToStorage() {
    if (typeof window === "undefined" || !this.url) return;
    try {
      localStorage.setItem(AVATAR_CACHE_KEY, JSON.stringify({ url: this.url, expiresAt: this.expiresAt }));
    } catch { /* ignore */ }
  }

  private clearStorage() {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(AVATAR_CACHE_KEY);
    } catch { /* ignore */ }
  }

  subscribe(cb: (url: string | null) => void) {
    this.subs.add(cb);
    cb(this.url); // entrega valor atual imediatamente
    // Se já temos URL mas está perto de expirar, agenda refresh
    if (this.url && Date.now() > this.expiresAt - 120_000) {
      this.scheduleRefresh(0);
    }
    // Se não temos URL ainda, dispara fetch (deduplicado)
    if (!this.url) void this.fetchNow();
    return () => {
      this.subs.delete(cb);
      // Sem assinantes => pausa o timer
      if (this.subs.size === 0 && this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
    };
  }

  getUrl() {
    return this.url;
  }

  private notify() {
    for (const cb of this.subs) cb(this.url);
  }

  private scheduleRefresh(delay?: number) {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const ms =
      delay ?? Math.max(this.expiresAt - Date.now() - 60_000, 30_000); // 1 min antes, mínimo 30s
    this.timer = setTimeout(() => this.fetchNow(), ms);
  }

  private scheduleOnError() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.timer = setTimeout(() => this.fetchNow(), 60_000); // retry em 60s
  }

  async fetchNow() {
    if (this.inflight) return this.inflight; // dedupe
    this.inflight = api
      .get<ProfilePicResponse>("/user/profile-picture", { withCredentials: true })
      .then(({ data }) => {
        this.url = data.url;
        this.expiresAt = new Date(data.expiresAt).getTime();
        this.saveToStorage();
        this.notify();
        this.scheduleRefresh();
      })
      .catch(() => {
        this.scheduleOnError();
      })
      .finally(() => {
        this.inflight = null;
      });
    return this.inflight;
  }

  invalidate() {
    this.url = null;
    this.expiresAt = 0;
    this.clearStorage();
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.inflight = null;
    this.notify();
    void this.fetchNow();
  }
}

const avatarManager = new AvatarPhotoManager();
export function invalidateAvatar() { avatarManager.invalidate(); }

/* =========================================================
   Componente
   ========================================================= */
function AvatarCircleBase({
  src: externalSrc,
  alt = "Avatar",
  name,
  size = 40,
  ring = true,
  className = "",
  priority = false,
  unoptimized = true,
}: Props) {
  // Se veio src externo via prop, não usamos o manager
  const useGlobal = !externalSrc;

  const [url, setUrl] = useState<string | null>(useGlobal ? avatarManager.getUrl() : externalSrc ?? null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Atualiza quando a prop src mudar
  useEffect(() => {
    if (!useGlobal) {
      setUrl(externalSrc ?? null);
      setError(false);
      setLoaded(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalSrc]);

  // Assina o gerenciador global (deduplicado) apenas quando usamos o fetch interno
  useEffect(() => {
    if (!useGlobal) return;
    const unsub = avatarManager.subscribe(setUrl);
    return unsub;
  }, [useGlobal]);

  // Evita setState duplicado no StrictMode
  const loadGuard = useRef(false);
  useEffect(() => {
    loadGuard.current = false;
  }, [url]);

  // Sempre que a URL muda, reseta flags
  useEffect(() => {
    setLoaded(false);
    setError(false);
  }, [url]);

  const showImage = !!url && !error;
  const sizes = `${size}px`; // fixa para evitar múltiplos downloads de variantes

  // opcional (não usado agora, mas mantido)
  useMemo(() => initialsFromName(name), [name]);

  const iconSize = Math.round(size * 0.55);

  return (
    <div
      className={`
        relative overflow-hidden rounded-full bg-muted
        ${ring ? "ring-1 ring-border" : ""}
        ${className}
      `}
      style={{ width: size, height: size }}
      aria-label={alt}
      aria-busy={showImage && !loaded}
    >
      {/* Placeholder com ícone — visível enquanto carrega, sem foto ou erro */}
      <div
        className={`absolute inset-0 grid place-items-center transition-opacity duration-200
          ${showImage && loaded ? "opacity-0" : "opacity-100"}`}
      >
        <User
          size={iconSize}
          className="text-muted-foreground/70"
          aria-hidden="true"
        />
      </div>

      {/* Imagem real (só renderiza quando temos URL e não houve erro) */}
      {showImage && (
        <Image
          src={url as string}
          alt={alt}
          width={size}
          height={size}
          sizes={sizes}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          priority={priority}
          unoptimized={unoptimized}
          onLoad={() => {
            if (!loadGuard.current) {
              loadGuard.current = true;
              setLoaded(true);
            }
          }}
          onError={() => setError(true)}
          className={`object-cover transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
}

const AvatarCircle = memo(AvatarCircleBase);
export default AvatarCircle;
