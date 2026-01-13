import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Eleva",
};

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark" data-theme="dark" suppressHydrationWarning>
      <body>
        <nav style={{ display: "flex", gap: 12, padding: 12, borderBottom: "1px solid #ddd" }}>
          {/* <a href="/">/</a> */}
          <a href="/pro/dashboard">/dashboard</a>
          <a href="/pro/users">/users</a>

        </nav>
        <main style={{ padding: 20 }}>{children}</main>
      </body>
    </html>
  );
}
