// app/app/home/page.tsx
import Link from "next/link";
import { ClipboardList, Bot, Dumbbell, Ruler, ArrowRight } from "lucide-react";

const SHORTCUTS = [
  {
    href: "/app/measures",
    label: "Medidas",
    description: "Veja suas medidas corporais",
    Icon: Ruler,
  },
  {
    href: "/app/activities/workouts",
    label: "Treinar",
    description: "Inicie uma sessão de treino",
    Icon: Dumbbell,
  },
  {
    href: "/app/anamnesis",
    label: "Anamnese",
    description: "Histórico de saúde e preferências",
    Icon: ClipboardList,
  },
  {
    href: "/app/chat",
    label: "Assistente IA",
    description: "Converse com seu assistente",
    Icon: Bot,
  },
];

export default function HomePage() {
  return (
    <section className="mx-auto max-w-5xl px-3 sm:px-4 lg:px-6 py-5 sm:py-8 space-y-5 sm:space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Início</h1>
        <p className="text-sm text-muted-foreground mt-1">Acesso rápido às suas atividades</p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {SHORTCUTS.map(({ href, label, description, Icon }) => (
          <Link
            key={href}
            href={href}
            className="group relative overflow-hidden rounded-2xl border border-border/30 bg-card p-4 sm:p-5 flex flex-col gap-3 hover:shadow-md hover:border-border/60 transition-all duration-200"
          >
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" strokeWidth={2} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm sm:text-base leading-snug">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
            </div>

            <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all duration-200" />
          </Link>
        ))}
      </div>
    </section>
  );
}
