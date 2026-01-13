// app/app/(no-tabs)/layout.tsx
import { ReactNode } from "react";
import TopBarProfileSettings from "../_components/topBarProfileSettings";

export default function AppNoTabsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col overflow-x-hidden">
      <TopBarProfileSettings />
      <main className="mx-auto w-full max-w-screen-lg flex-1 px-4 py-4 md:px-6 md:py-6">
        {children}
      </main>
    </div>
  );
}
