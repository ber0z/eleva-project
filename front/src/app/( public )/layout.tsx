// app/layout.tsx  (ROOT layout)
import type { ReactNode } from "react";
// import type { Metadata } from "next";
import "../globals.css";

// export const metadata: Metadata = {
//   title: "Eleva",
//   description: "Landing e app",
// };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
      <div>
        <main>{children}</main>
      </div>
  );
}
