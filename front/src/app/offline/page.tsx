"use client";

import { useEffect, useState } from "react";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);

    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  function retry() {
    window.location.reload();
  }

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto grid min-h-svh max-w-2xl place-items-center px-4 py-8">
        <section className="w-full rounded-2xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
          {/* topo */}
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-muted/50 text-xl">
              📴
            </div>

            <div className="min-w-0">
              <h1 className="text-xl font-semibold leading-tight">
                {isOnline ? "Conexão voltou — recarregue" : "Você está offline"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {isOnline
                  ? "Parece que sua internet voltou. Clique em “Tentar novamente” para continuar."
                  : "Sem internet no momento. Verifique o Wi-Fi ou o 4G/5G e tente novamente."}
              </p>

              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isOnline ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
                Status: <b className="text-foreground">{isOnline ? "online" : "offline"}</b>
              </div>
            </div>
          </div>

          {/* ações */}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm font-medium hover:bg-accent sm:w-auto"
            >
              Voltar
            </button>

            <button
              type="button"
              onClick={retry}
              className="h-11 w-full rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 sm:w-auto"
            >
              Tentar novamente
            </button>
          </div>

          {/* dica */}
          <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/20 p-4">
            <p className="text-sm font-medium">Dica</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>No celular, adicione o app à Tela Inicial para abrir mais rápido.</li>
              <li>Algumas telas podem funcionar mesmo offline (cache do PWA).</li>
            </ul>
          </div>

          {/* rodapé */}
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Se continuar assim, feche e abra o app novamente depois.
          </p>
        </section>
      </div>
    </main>
  );
}
