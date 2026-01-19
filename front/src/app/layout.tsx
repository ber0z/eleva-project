// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { SwRegister } from "./_components/SwRegister";

export const metadata: Metadata = {
  title: "Eleva",
  description: "Eleva - Plataforma de acompanhamento físico",
  icons: {
    icon: "imgs/Elevax_favicon.png",
    shortcut: "/imgs/Elevax_favicon.png",
    // apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="dark" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <SwRegister />

        {children}
      </body>
    </html>
  );
} 
