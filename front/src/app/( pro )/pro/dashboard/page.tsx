"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Users, Mail, Apple, Dumbbell, Bell, Loader2 } from "lucide-react";

type DashboardData = {
  activeClients: number;
  pendingClients: number;
  pendingInvites: number;
  dietsAuthored: number;
  trainingsAuthored: number;
  unreadNotifications: number;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/professional/dashboard")
      .then((res) => setData(res.data))
      .catch(() => setError("Erro ao carregar dashboard"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">
        {error ?? "Dados indisponíveis"}
      </div>
    );
  }

  const stats = [
    { label: "Clientes Ativos", value: data.activeClients, icon: Users, color: "text-emerald-500" },
    { label: "Clientes Pendentes", value: data.pendingClients, icon: Users, color: "text-amber-500" },
    { label: "Convites Pendentes", value: data.pendingInvites, icon: Mail, color: "text-blue-500" },
    { label: "Dietas Criadas", value: data.dietsAuthored, icon: Apple, color: "text-rose-500" },
    { label: "Treinos Criados", value: data.trainingsAuthored, icon: Dumbbell, color: "text-purple-500" },
    { label: "Notificações", value: data.unreadNotifications, icon: Bell, color: "text-orange-500" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border/30 bg-card shadow-sm p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`rounded-xl bg-muted p-2.5 ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
