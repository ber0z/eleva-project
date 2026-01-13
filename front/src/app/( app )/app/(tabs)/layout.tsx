// Server Component
import { ReactNode } from "react";
import TabsClient from "../_components/tabsClient";
// import TopBar from "../_components/topBar";

export default function AppWithTabsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="
      min-h-dvh bg-background text-foreground flex flex-col
      md:pl-24 overflow-x-hidden
    ">
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-4 md:px-6 md:py-6 pb-20 md:pb-0">
        {children}
      </main>
      <TabsClient />
    </div>
  );
}
