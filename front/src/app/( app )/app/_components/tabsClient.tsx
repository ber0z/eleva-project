"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Home,
  ChartNoAxesCombined,
  Dumbbell,
  Apple
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
  const pathname = usePathname() ?? "";

  const HIDE_TABS_ON_SUBROUTES_OF = [
    "/app/activities/workouts",
    "/app/activities/physical",
    "/app/diets/plans",
    "/app/diets/meals",
    "/app/evolutions",
    "/app/sleep",
  ] as const;

  const normalize = (p: string) => (p === "/" ? "/" : p.replace(/\/+$/, "")); // remove trailing slash
  const path = normalize(pathname);

  const shouldHide = HIDE_TABS_ON_SUBROUTES_OF.some((base) => {
    const b = normalize(base);
    // esconde se for "base + /alguma-coisa"
    return path.startsWith(b + "/");
  });

  if (shouldHide) return null;

  const current = getAppSegment(pathname);

  const items: NavItem[] = [
    { href: "/app/home", seg: "home", label: "Home", Icon: Home },
    { href: "/app/evolutions", seg: "evolutions", label: "Evolução", Icon: ChartNoAxesCombined },
    { href: "/app/diets/meals", seg: "diets", label: "Dieta", Icon: Apple },
    { href: "/app/activities/physical", seg: "activities", label: "Atividade", Icon: Dumbbell },
    { href: "/app/sleep", seg: "sleep", label: "Sono", Icon: Zzz },
  ];

  return ( 
    <>
      {/* ===== Sidebar fixa (desktop), abaixo do header ===== */}
      <aside
        className="
          hidden md:flex flex-col justify-center fixed inset-y-0 left-0 w-24
          z-30
        "
        aria-label="Navegação lateral"
      >
        <nav className="
          mx-2 p-2
          bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/80
          border border-border/40 rounded-2xl
          w-20
        ">
          <ul className="flex flex-col gap-2">
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
                      ${active
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }
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
          mx-3 mb-3 px-2 py-2
          bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/80
          border border-border/40 rounded-2xl
        "
        aria-label="Navegação por abas"
      >
        <ul className="grid grid-cols-5 gap-1">
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
                    ${active ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"}
                  `}
                >
                  <Icon className="size-5" strokeWidth={active ? 2.2 : 1.7} aria-hidden />
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
