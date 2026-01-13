import Image from "next/image";
import Link from "next/link";
import eleva from "../../../public/imgs/eleva.png";

export default function LandingPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-background text-foreground">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        {/* grid sutil */}
        <div className="absolute inset-0 opacity-[0.25] [background:radial-gradient(circle_at_1px_1px,rgba(148,163,184,0.25)_1px,transparent_0)] bg-size-[28px_28px]" />

        {/* blobs */}
        <div className="absolute -top-72 left-1/2 h-[820px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(250,204,21,0.35)_0,transparent_62%)]" />
        <div className="absolute -bottom-[520px] left-1/2 h-[1200px] w-[1200px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.35)_0,transparent_65%)]" />

        {/* vinheta */}
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_20%,transparent_0,rgba(0,0,0,0.06)_100%)] dark:bg-[radial-gradient(60%_50%_at_50%_20%,transparent_0,rgba(0,0,0,0.35)_100%)]" />
      </div>

      {/* Content */}
      <section className="relative mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center px-6 py-12 text-center">
        {/* Logo + pill */}
        <div className="flex flex-col items-center">
          <Image
            src={eleva}
            alt="Eleva"
            width={96}
            height={96}
            priority
            className="mb-5 rounded-2xl shadow-sm"
          />

          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Privado • Rápido • Simples
          </div>
        </div>

        {/* Headline */}
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
          Evolução física,{" "}
          <span className="bg-linear-to-r from-primary to-foreground bg-clip-text text-transparent">
            do jeito certo
          </span>
          .
        </h1>

        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Acompanhe suas <strong className="text-foreground">medidas</strong>,{" "}
          <strong className="text-foreground">fotos de evolução</strong> e sua{" "}
          <strong className="text-foreground">meta atual</strong> em um só lugar
          com foco total no que importa. E o melhor de tudo <strong className="text-foreground">100% grátis</strong>  e sem anúncios.
        </p>

        {/* CTAs */}
        <div className="mt-7 flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="
              group relative inline-flex h-11 items-center justify-center overflow-hidden rounded-2xl
              px-6 font-semibold text-slate-900
              shadow-sm ring-1 ring-black/10
              bg-[#FACC15] transition
              hover:bg-[#EAB308]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50
            "
          >
            <span className="relative z-10">Entrar</span>
            {/* shine */}
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.5),transparent)] opacity-60 transition duration-700 group-hover:translate-x-full" />
          </Link>

          <Link
            href="/register"
            className="
              inline-flex h-11 items-center justify-center rounded-2xl px-6 font-medium
              border border-border bg-card/60 text-foreground backdrop-blur
              transition hover:bg-accent
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50
            "
          >
            Criar conta
          </Link>
        </div>

        <div className="mt-3 text-xs text-muted-foreground">
          Sem enrolação. Você cria a conta e já começa a registrar.
        </div>

        {/* Benefits */}
        <div className="mt-10 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card/60 p-4 text-left backdrop-blur">
            <div className="text-sm font-semibold">Medidas</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Registre peso, cintura, coxa, bíceps e acompanhe seu progresso.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card/60 p-4 text-left backdrop-blur">
            <div className="text-sm font-semibold">Fotos</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Compare visualmente sua evolução com organização por posição.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card/60 p-4 text-left backdrop-blur">
            <div className="text-sm font-semibold">Privacidade</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Compartilhamento só quando você quiser, público ou por link temporário.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-10 text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} Eleva
        </p>
      </section>
    </main>
  );
}
