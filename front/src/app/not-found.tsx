// app/not-found.tsx
"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function GlobalNotFound() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!pathname) return;

    if (pathname.startsWith("/app")) {
      router.replace("/app/home");
    } else if (pathname.startsWith("/pro")) {
      router.replace("/pro"); // ou /professional, depende do teu prefixo real
    } else if (pathname.startsWith("/admin")) {
      router.replace("/admin");
    } else {
      // fallback pra qualquer outra coisa
      router.replace("/");
    }
  }, [pathname, router]);

  return (
    <div className="min-h-svh flex items-center justify-center bg-background text-foreground">
      <p className="text-sm text-muted-foreground">
        Redirecionando…
      </p>
    </div>
  );
}
