"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ChartNoAxesColumnIncreasing,
  ChartNoAxesCombined,
  // Dumbbell,
  // Apple,
} from "lucide-react";
import { Zzz } from "@/components/icons/Zzz";

/* pega o primeiro segmento DEPOIS de "/app" */
function getAppSegment(pathname: string) {
  if (!pathname.startsWith("/app")) return "";
  return pathname.split("/")[2] ?? "";
}

type NavItem = {
  href: string;
  seg: string;
  label: string;
  Icon: LucideIcon;
};

export default function ResponsiveNav() {
  const pathname = usePathname();
  const current = getAppSegment(pathname);

  const items: NavItem[] = [
    { href: "/app/metrics", seg: "metrics", label: "Medidas", Icon: ChartNoAxesColumnIncreasing },
    { href: "/app/evolutions", seg: "evolutions", label: "Evolução", Icon: ChartNoAxesCombined },
    // { href: "/app/trainings", seg: "trainings", label: "Treinamento", Icon: Dumbbell },
    // { href: "/app/diets", seg: "diets", label: "Alimentação", Icon: Apple },
    { href: "/app/sleep", seg: "sleep", label: "Sono", Icon: Zzz },
  ];

  return (
    <>
      {/* ===== Sidebar fixa (desktop), abaixo do header ===== */}
      <aside
        className="
    hidden md:flex fixed inset-y-0 left-0 w-24
    border-r border-border bg-background z-30
  "
        aria-label="Navegação lateral"
      >
        {/* Reserva a altura do header aqui dentro */}
        <nav className="h-full overflow-y-auto p-2 pt-22 w-24">
          <ul className="flex min-h-full flex-col gap-2">
            {items.map(({ href, seg, label, Icon }) => {
              const active = current === seg;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`
                aspect-square w-full
                flex flex-col items-center justify-center
                rounded-xl transition
                border ${active ? "border-primary/35" : "border-transparent"}
                ${active
                        ? "text-primary bg-primary/15"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted hover:border-border"}
              `}
                  >
                    <Icon className="size-5" strokeWidth={active ? 2.2 : 1.7} aria-hidden />
                    <span className="mt-1 text-[11px] leading-none text-center">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* ===== Tabs no rodapé (mobile) ===== */}
      <nav
        className="
          md:hidden fixed bottom-0 inset-x-0 z-40
          border-t border-border
          px-2 pt-1
          pb-[max(0.5rem,env(safe-area-inset-bottom))]
          backdrop-blur
          bg-background/80 
        "
        aria-label="Navegação por abas"
      >
        <ul className="grid grid-cols-3 gap-1">
          {items.map(({ href, seg, label, Icon }) => {
            const active = current === seg;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`
                    flex flex-col items-center justify-center rounded-xl py-2
                    text-xs font-medium transition
                    border ${active ? "border-primary/35" : "border-transparent"}
                    ${active
                      ? "text-primary bg-primary/15"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"}
                  `}
                >
                  <Icon
                    className="size-5"
                    strokeWidth={active ? 2.2 : 1.7}
                    aria-hidden
                  />
                  <span className="mt-1">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
