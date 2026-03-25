"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Mail,
  Bell,
  UserCircle,
  Settings,
  MessageCircle,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";

const SIDEBAR_WIDTH = 260;

export default function ProLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/professional/dashboard")
      .then((res) => setUnreadCount(res.data.unreadNotifications ?? 0))
      .catch(() => {});
    api
      .get("/chat/unread-count")
      .then((res) => setUnreadMessages(res.data.count ?? 0))
      .catch(() => {});
    api
      .get("/professional/me/profile-picture")
      .then((res) => setProfilePicture(res.data.url ?? null))
      .catch(() => {});
  }, [pathname]);

  const nav = useMemo(
    () => [
      {
        href: "/pro/dashboard",
        label: "Dashboard",
        icon: <LayoutDashboard className="h-4 w-4" />,
        active: pathname === "/pro" || pathname?.startsWith("/pro/dashboard"),
        badge: 0,
      },
      {
        href: "/pro/clients",
        label: "Clientes",
        icon: <Users className="h-4 w-4" />,
        active: pathname?.startsWith("/pro/clients"),
        badge: 0,
      },
      {
        href: "/pro/invites",
        label: "Convites",
        icon: <Mail className="h-4 w-4" />,
        active: pathname?.startsWith("/pro/invites"),
        badge: 0,
      },
      {
        href: "/pro/messages",
        label: "Mensagens",
        icon: <MessageCircle className="h-4 w-4" />,
        active: pathname?.startsWith("/pro/messages"),
        badge: unreadMessages,
      },
      {
        href: "/pro/notifications",
        label: "Notificações",
        icon: <Bell className="h-4 w-4" />,
        active: pathname?.startsWith("/pro/notifications"),
        badge: unreadCount,
      },
      {
        href: "/pro/profile",
        label: "Perfil",
        icon: <UserCircle className="h-4 w-4" />,
        active: pathname?.startsWith("/pro/profile"),
        badge: 0,
      },
      {
        href: "/pro/settings",
        label: "Configurações",
        icon: <Settings className="h-4 w-4" />,
        active: pathname?.startsWith("/pro/settings"),
        badge: 0,
      },
    ],
    [pathname, unreadCount, unreadMessages]
  );

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await api.post("/auth/logout", {}, { withCredentials: true });
    } catch (error) {
      if (isAxiosError(error)) {
        console.error("Erro ao deslogar:", error.response?.data || error.message);
      } else {
        console.error("Erro ao deslogar:", error);
      }
    } finally {
      setLoggingOut(false);
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <div className="min-h-svh bg-background text-foreground overflow-x-hidden">
      {/* Topbar mobile */}
      <header className="flex items-center justify-between gap-2 border-b border-border/30 px-4 py-3 md:hidden">
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Abrir menu">
          <Menu className="h-5 w-5" />
        </Button>
        <Link href="/pro/dashboard" className="inline-flex items-center gap-2">
          <span className="text-sm font-semibold">Eleva - Pro</span>
        </Link>
        <div className="w-9" />
      </header>

      <div className="relative flex h-[calc(100dvh-0px)] md:h-dvh overflow-hidden">
        {/* Sidebar desktop */}
        <aside
          className="hidden h-full shrink-0 border-r border-border/30 md:block"
          style={{ width: SIDEBAR_WIDTH }}
        >
          <SidebarContent nav={nav} onLogout={handleLogout} loggingOut={loggingOut} profilePicture={profilePicture} />
        </aside>

        {/* Drawer mobile */}
        {open && (
          <>
            <button
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
              onClick={() => setOpen(false)}
              aria-label="Fechar menu"
            />
            <div
              className="fixed inset-y-0 left-0 z-50 w-[82%] max-w-[320px] border-r border-border/30 bg-background shadow-xl md:hidden flex flex-col"
              role="dialog"
              aria-modal="true"
              style={{
                paddingTop: "env(safe-area-inset-top)",
                paddingBottom: "env(safe-area-inset-bottom)",
              }}
            >
              <div className="flex items-center justify-between gap-2 border-b border-border/30 px-4 py-3 shrink-0">
                <Link
                  href="/pro/dashboard"
                  className="inline-flex items-center gap-2"
                  onClick={() => setOpen(false)}
                >
                  <div className="h-8 w-8 shrink-0 rounded-lg overflow-hidden bg-primary/10 grid place-items-center">
                    {profilePicture ? (
                      <img src={profilePicture} alt="Perfil" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-primary text-sm font-bold">E</span>
                    )}
                  </div>
                  <span className="text-sm font-semibold">Profissional</span>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Fechar menu">
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                <div className="space-y-1">
                  {nav.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(baseLinkCls, item.active ? activeLinkCls : inactiveLinkCls)}
                      aria-current={item.active ? "page" : undefined}
                    >
                      {item.icon}
                      <span className="flex-1">{item.label}</span>
                      {item.badge > 0 && <Badge count={item.badge} />}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="shrink-0 border-t border-border/30 p-2 space-y-2">
                <button
                  type="button"
                  onClick={async () => {
                    setOpen(false);
                    await handleLogout();
                  }}
                  className={cn(baseLinkCls, "w-full text-left text-destructive hover:bg-destructive/10")}
                  disabled={loggingOut}
                >
                  <LogOut className="h-4 w-4" />
                  <span>{loggingOut ? "Saindo..." : "Sair"}</span>
                </button>
                <div className="px-2 text-[11px] text-muted-foreground">© {new Date().getFullYear()} Eleva</div>
              </div>
            </div>
          </>
        )}

        {/* Main */}
        <div className="flex-1 overflow-y-auto md:ml-0" style={{ minWidth: 0 }}>
          <div className="mx-auto w-full max-w-7xl px-4 py-6 md:pl-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

function SidebarContent({
  nav,
  onLogout,
  loggingOut,
  profilePicture,
}: {
  nav: { href: string; label: string; icon: React.ReactNode; active: boolean; badge: number }[];
  onLogout: () => void;
  loggingOut: boolean;
  profilePicture: string | null;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="h-10 w-10 shrink-0 rounded-xl overflow-hidden bg-primary/10 grid place-items-center">
          {profilePicture ? (
            <img src={profilePicture} alt="Perfil" className="h-full w-full object-cover" />
          ) : (
            <span className="text-primary text-base font-bold">E</span>
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">Profissional</div>
          <div className="truncate text-[11px] text-muted-foreground">Painel de controle</div>
        </div>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-2">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(baseLinkCls, item.active ? activeLinkCls : inactiveLinkCls)}
            aria-current={item.active ? "page" : undefined}
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
            {item.badge > 0 && <Badge count={item.badge} />}
          </Link>
        ))}
      </nav>

      <div className="mt-auto space-y-3 px-2 pb-4">
        <button
          type="button"
          onClick={onLogout}
          className={cn(baseLinkCls, "w-full text-left text-destructive hover:bg-destructive/10")}
          disabled={loggingOut}
        >
          <LogOut className="h-4 w-4" />
          <span>{loggingOut ? "Saindo..." : "Sair"}</span>
        </button>
        <div className="px-2 text-[11px] text-muted-foreground">© {new Date().getFullYear()} Eleva</div>
      </div>
    </div>
  );
}

function Badge({ count }: { count: number }) {
  return (
    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
      {count > 99 ? "99+" : count}
    </span>
  );
}

const baseLinkCls =
  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const activeLinkCls = "bg-accent text-accent-foreground";
const inactiveLinkCls = "hover:bg-accent text-muted-foreground";

function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}
