// app/admin/layout.tsx
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, Menu, X, LogOut } from "lucide-react";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";

const SIDEBAR_WIDTH = 260;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const nav = useMemo(
    () => [
      {
        href: "/admin/dashboard",
        label: "Dashboard",
        icon: <LayoutDashboard className="h-4 w-4" />,
        active: pathname === "/admin" || pathname?.startsWith("/admin/dashboard"),
      },
      {
        href: "/admin/users",
        label: "Usuários",
        icon: <Users className="h-4 w-4" />,
        active: pathname?.startsWith("/admin/users"),
      },
    ],
    [pathname]
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
    <div className="min-h-svh bg-background text-foreground">
      {/* Topbar (mobile) */}
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 md:hidden">
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Abrir menu">
          <Menu className="h-5 w-5" />
        </Button>

        <Link href="/admin/dashboard" className="inline-flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10">
            <span className="text-primary text-sm font-bold">∞</span>
          </div>
          <span className="text-sm font-semibold">Admin</span>
        </Link>

        <div className="w-9" />
      </header>

      <div className="relative flex">
        {/* Sidebar (desktop) */}
        <aside
          className="sticky top-0 hidden h-dvh shrink-0 border-r border-border md:block"
          style={{ width: SIDEBAR_WIDTH }}
        >
          <SidebarContent nav={nav} onLogout={handleLogout} loggingOut={loggingOut} />
        </aside>

        {/* Drawer (mobile) */}
        {open && (
          <>
            <button
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
              onClick={() => setOpen(false)}
              aria-label="Fechar menu"
            />

            {/* ✅ Drawer em coluna: header fixo, miolo rolável, footer fixo */}
            <div
              className="fixed inset-y-0 left-0 z-50 w-[82%] max-w-[320px] border-r border-border bg-background shadow-xl md:hidden flex flex-col"
              role="dialog"
              aria-modal="true"
              style={{
                paddingTop: "env(safe-area-inset-top)",
                paddingBottom: "env(safe-area-inset-bottom)",
              }}
            >
              {/* Header fixo */}
              <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 shrink-0">
                <Link
                  href="/admin/dashboard"
                  className="inline-flex items-center gap-2"
                  onClick={() => setOpen(false)}
                >
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10">
                    <span className="text-primary text-sm font-bold">∞</span>
                  </div>
                  <span className="text-sm font-semibold">Admin</span>
                </Link>

                <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Fechar menu">
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Miolo rolável */}
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
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Footer fixo */}
              <div className="shrink-0 border-t border-border p-2 space-y-2">
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
        <div className="flex-1 md:ml-0" style={{ minWidth: 0 }}>
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
}: {
  nav: { href: string; label: string; icon: React.ReactNode; active: boolean }[];
  onLogout: () => void;
  loggingOut: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10">
          <span className="text-primary text-base font-bold">∞</span>
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">Admin</div>
          <div className="truncate text-[11px] text-muted-foreground">Painel de controle</div>
        </div>
      </div>

      {/* Navegação principal */}
      <nav className="mt-2 flex-1 space-y-1 px-2">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(baseLinkCls, item.active ? activeLinkCls : inactiveLinkCls)}
            aria-current={item.active ? "page" : undefined}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Área inferior: logout + copyright */}
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

/* -------- styles helpers -------- */

const baseLinkCls =
  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const activeLinkCls = "bg-accent text-accent-foreground";
const inactiveLinkCls = "hover:bg-accent text-muted-foreground";

function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}
