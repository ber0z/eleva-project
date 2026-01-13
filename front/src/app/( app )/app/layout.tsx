// Server Component
// import type { Metadata } from "next";

// export const metadata: Metadata = {
//   title: "Eleva",
// };

export default function AppBaseLayout({
  children,
}: { children: React.ReactNode }) {
  return <>{children}</>;
}
