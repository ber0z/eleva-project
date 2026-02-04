"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ActivitiesLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const isMealRoot = pathname === "/app/diets/meals";
    const isPlansRoot = pathname === "/app/diets/plans";

    // mostra tabs somente nas páginas raiz das abas
    const showTabs = isMealRoot || isPlansRoot;

    const tabBase =
        "flex-1 text-center text-sm px-3 py-2 rounded-full border border-transparent transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";
    const tabActive =
        "bg-yellow-500/15 border border-yellow-500/30 text-yellow-700 dark:text-yellow-300 shadow-sm";
    const tabInactive = "text-muted-foreground hover:text-foreground";

    return (
        <div className="min-h-svh bg-background text-foreground">
            <div >
                {showTabs ? (
                    <div className="mb-4">
                        <div className="inline-flex w-full sm:w-auto items-center gap-1 rounded-full border border-border bg-muted/40 p-1">
                            <Link
                                href="/app/diets/meals"
                                className={`${tabBase} ${isMealRoot ? tabActive : tabInactive}`}
                                aria-current={isMealRoot ? "page" : undefined}
                            >
                                Refeições
                            </Link>

                            <Link
                                href="/app/diets/plans"
                                className={`${tabBase} ${isPlansRoot ? tabActive : tabInactive}`}
                                aria-current={isPlansRoot ? "page" : undefined}
                            >
                                Dietas
                            </Link>
                        </div>
                    </div>
                ) : null}

                {children}
            </div>
        </div>
    );
}
