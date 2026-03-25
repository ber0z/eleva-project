"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { ArrowLeft, Loader2, User, Dumbbell, Moon, Utensils, TrendingUp, LayoutDashboard } from "lucide-react";

type ClientInfo = {
    user: {
        id: number;
        name: string;
        profilePicture: string | null;
    };
};

export default function RecordsLayout({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const pathname = usePathname();
    const userId = params.userId as string;

    const [client, setClient] = useState<ClientInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/professional/clients/${userId}`)
            .then((res) => setClient(res.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [userId]);

    const basePath = `/pro/clients/${userId}/records`;

    const tabs = [
        { href: basePath, label: "Resumo", icon: <LayoutDashboard className="h-4 w-4" />, exact: true },
        { href: `${basePath}/activities`, label: "Atividades", icon: <Dumbbell className="h-4 w-4" /> },
        { href: `${basePath}/sleep`, label: "Sono", icon: <Moon className="h-4 w-4" /> },
        { href: `${basePath}/meals`, label: "Alimentacao", icon: <Utensils className="h-4 w-4" /> },
        { href: `${basePath}/evolutions`, label: "Evolucao", icon: <TrendingUp className="h-4 w-4" /> },
    ];

    function isActive(tab: { href: string; exact?: boolean }) {
        if (tab.exact) return pathname === tab.href;
        return pathname.startsWith(tab.href);
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <Link
                    href={`/pro/clients/${userId}`}
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
                >
                    <ArrowLeft className="h-4 w-4" /> Voltar ao cliente
                </Link>

                {loading ? (
                    <div className="flex items-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : client ? (
                    <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted">
                            {client.user.profilePicture ? (
                                <img src={client.user.profilePicture} alt={client.user.name} className="h-10 w-10 rounded-full object-cover" />
                            ) : (
                                <User className="h-5 w-5 text-muted-foreground" />
                            )}
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold">{client.user.name}</h1>
                            <p className="text-xs text-muted-foreground">Registros do cliente</p>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">Cliente nao encontrado</p>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-2 mb-6 border-b border-border/30">
                {tabs.map((tab) => (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                            isActive(tab)
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </Link>
                ))}
            </div>

            {/* Content */}
            {children}
        </div>
    );
}
