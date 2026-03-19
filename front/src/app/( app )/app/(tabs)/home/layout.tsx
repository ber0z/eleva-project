// Server Component
import { ReactNode } from "react";
import TopBar from "../../_components/topBar";

export default function AppWithTabsLayout({ children }: { children: ReactNode }) {
  return (
    <div>
        <TopBar />
      <main >
        {children}
      </main>
    </div>
  );
}
