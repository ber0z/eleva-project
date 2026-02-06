// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { SwRegister } from "./_components/SwRegister";
import { manrope, sora} from "./fonts";

export const metadata: Metadata = {
  title: "Eleva",
  description: "Eleva - Plataforma de acompanhamento físico",
  icons: {
    icon: "/imgs/eleva-favicon.png",
    shortcut: "/imgs/eleva-favicon.png",
  },
};

const THEME_KEY = "theme";

function ThemeInitScript() {
  const code = `
(function () {
  try {
    var key = ${JSON.stringify(THEME_KEY)};
    var saved = localStorage.getItem(key);
    var mode = (saved === "light" || saved === "dark") ? saved : "dark";
    var root = document.documentElement;

    root.setAttribute("data-theme", mode);
    if (mode === "dark") root.classList.add("dark");
    else root.classList.remove("dark");

    root.style.colorScheme = mode;
  } catch (e) {}
})();
`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${manrope.variable} ${sora.variable}`}
    >
      <head>
        <ThemeInitScript />
      </head>

      <body className="min-h-screen bg-background text-foreground antialiased font-sans">
        <SwRegister />
        {children}
      </body>
    </html>
  );
}
