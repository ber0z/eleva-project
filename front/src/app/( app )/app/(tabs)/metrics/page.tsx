// app/app/home/page.tsx
import Link from "next/link";
import { ClipboardList, Bot, Dumbbell, Ruler, ArrowRight } from "lucide-react";

const SHORTCUTS = [
  {
    href: "/app/measures",
    label: "Medidas",
    description: "Veja suas medidas corporais",
    Icon: Ruler,
    gradient: "from-blue-500/20 to-indigo-500/10",
    iconBg: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    border: "border-blue-500/20",
  },
  {
    href: "/app/activities/workouts",
    label: "Executar Treino",
    description: "Inicie uma sessão de treino",
    Icon: Dumbbell,
    gradient: "from-orange-500/20 to-red-500/10",
    iconBg: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
    border: "border-orange-500/20",
  },
  {
    href: "/app/anamnesis",
    label: "Anamnese",
    description: "Histórico de saúde e preferências",
    Icon: ClipboardList,
    gradient: "from-emerald-500/20 to-teal-500/10",
    iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20",
  },
  {
    href: "/app/chat",
    label: "Assistente IA",
    description: "Converse com seu assistente",
    Icon: Bot,
    gradient: "from-violet-500/20 to-purple-500/10",
    iconBg: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    border: "border-violet-500/20",
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
        {SHORTCUTS.map(({ href, label, description, Icon, gradient, iconBg, border }) => (
          <Link
            key={href}
            href={href}
            className={`
              group relative overflow-hidden
              rounded-2xl border ${border}
              bg-gradient-to-br ${gradient}
              p-4 sm:p-5
              flex flex-col gap-3
              hover:shadow-md hover:scale-[1.02]
              transition-all duration-200
            `}
          >
            <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}>
              <Icon className="h-5 w-5" strokeWidth={2} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm sm:text-base leading-snug">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
            </div>

            <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all duration-200" />
          </Link>
        ))}
      </div>
    </section>
  );
}
