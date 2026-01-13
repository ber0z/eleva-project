import Link from "next/link";
import AvatarCircle from "../_components/avatarCircle";

export default function TopBar() {
  return (
    <header
      className="
        sticky top-0 z-40
        bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60
        border-b border-border
      "
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {/* altura fixa (56px) p/ a sidebar saber onde começar */}
      <div
        className="
          mx-auto max-w-5xl
          px-3 sm:px-4           
          h-16 flex items-center justify-between
          relative -top-1.5 sm:top-0
        "
      >
        <Link href="/app" className="flex items-center gap-2">
          <span className="font-semibold tracking-tight text-2xl">Eleva</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/app/profile"
            className="
              group flex items-center gap-2
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 rounded-md
            "
          >
            <AvatarCircle size={32} />
            <span className="hidden sm:inline text-sm text-muted-foreground group-hover:text-foreground">
              Perfil
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
