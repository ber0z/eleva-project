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
        "bg-yellow-500/15 border border-yellow-500/30 text-yellow-800 dark:text-yellow-300 shadow-sm";

    const tabInactive =
        "text-foreground/60 hover:text-foreground/85 dark:text-muted-foreground dark:hover:text-foreground";


    return (
        <div className="min-h-svh bg-background text-foreground">
            <div >
                {showTabs ? (
                    <div className="mb-4 px-4">
                        <div className="inline-flex w-full sm:w-auto items-center gap-1 rounded-full border border-border p-1">
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
