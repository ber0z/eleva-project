"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Settings } from "lucide-react";

export default function TopBarProfileSettings() {
  const pathname = usePathname();
  const isProfile = pathname.startsWith("/app/profile");
  const isSettings = pathname.startsWith("/app/settings");
  const isMeasures = pathname.startsWith("/app/measures");
  const isNotifications = pathname.startsWith("/app/notifications");
  const isProfessionals = pathname.startsWith("/app/professionals");

  // Só renderiza nas páginas alvo
  if (!isProfile && !isSettings && !isMeasures && !isNotifications && !isProfessionals) return null;

  return (
    <header
      className="
        sticky top-0 z-40
        bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60
        border-b border-border/30
      "
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto max-w-screen-lg h-14 px-4 flex items-center justify-between">
        {/* Lado esquerdo */}
        <div className="flex items-center gap-2">
          {(isMeasures || isNotifications || isProfessionals) && (
            <Link
              href="/app/home"
              aria-label="Voltar para início"
              className="
                inline-flex items-center gap-2 h-9 px-2 rounded-md
                text-sm text-muted-foreground
                hover:text-foreground hover:bg-muted
                border border-transparent hover:border-border/30
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40
              "
            >
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">Início</span>
            </Link>
          )}

          {isProfile && (
            <Link
              href="/app/home"
              aria-label="Voltar para início"
              className="
                inline-flex items-center gap-2 h-9 px-2 rounded-md
                text-sm text-muted-foreground
                hover:text-foreground hover:bg-muted
                border border-transparent hover:border-border/30
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40
              "
            >
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">Início</span>
            </Link>
          )}

          {isSettings && (
            <Link
              href="/app/profile"
              aria-label="Voltar para perfil"
              className="
                inline-flex items-center gap-2 h-9 px-2 rounded-md
                text-sm text-muted-foreground
                hover:text-foreground hover:bg-muted
                border border-transparent hover:border-border/30
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40
              "
            >
              <ArrowLeft className="size-4" />
              <span className=" sm:inline">Perfil</span>
            </Link>
          )}
        </div>

        {/* Lado direito */}
        <div className="flex items-center gap-3">
          {isProfile && (
            <Link
              href="/app/settings"
              aria-label="Ir para configurações"
              className="
                inline-flex items-center justify-center h-9 w-9 rounded-md
                text-foreground hover:bg-muted
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40
              "
            >
              <Settings className="size-5" />
            </Link>
          )}

          {/* {isSettings && (
            <span className="font-semibold tracking-tight text-foreground">
              Configurações
            </span>
          )} */}
        </div>
      </div>
    </header>
  );
}
