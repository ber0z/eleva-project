"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ActivitiesLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const isPhysicalRoot = pathname === "/app/activities/physical";
    const isWorkoutsRoot = pathname === "/app/activities/workouts";

    // mostra tabs somente nas páginas raiz das abas
    const showTabs = isPhysicalRoot || isWorkoutsRoot;

    const tabBase =
        "flex-1 text-center text-sm px-3 py-2 rounded-full border border-transparent transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";
    const tabActive =
        "bg-primary/10 border-primary/30 text-primary shadow-sm";
    const tabInactive = "text-muted-foreground hover:text-foreground";

    return (
        <div className="min-h-svh bg-background  text-foreground">
            <div >
                {showTabs ? (
                    <div className="mb-4 px-4">
                        <div className="inline-flex w-full  sm:w-auto items-center gap-1 rounded-full border border-border/30 p-1">
                            <Link
                                href="/app/activities/physical"
                                className={`${tabBase} ${isPhysicalRoot ? tabActive : tabInactive}`}
                                aria-current={isPhysicalRoot ? "page" : undefined}
                            >
                                Atividades
                            </Link>

                            <Link
                                href="/app/activities/workouts"
                                className={`${tabBase} ${isWorkoutsRoot ? tabActive : tabInactive}`}
                                aria-current={isWorkoutsRoot ? "page" : undefined}
                            >
                                Treinos
                            </Link>
                        </div>
                    </div>
                ) : null}

                {children}
            </div>
        </div>
    );
}
