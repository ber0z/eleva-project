// proxy.ts
import { NextRequest, NextResponse } from "next/server";

type SubjectType = "user" | "admin" | "professional" | string;
type SubjectResp = {
  authId: number;
  subjectType: SubjectType;
  subjectId: number;
  roles?: string[];
};

const USER_PREFIXES  = ["/app"];
const ADMIN_PREFIXES = ["/admin"];
const PRO_PREFIXES   = ["/pro"];

const API_BASE = (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

function startsWithAny(path: string, prefixes: string[]) {
  return prefixes.some((p) => path === p || path.startsWith(p + "/"));
}
function redirect(req: NextRequest, to: string) {
  const url = req.nextUrl.clone();
  url.pathname = to;
  url.search = "";
  return NextResponse.redirect(url);
}

async function fetchSubject(req: NextRequest): Promise<SubjectResp | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/validate-subject-type`, {
      method: "GET",
      headers: {
        cookie: req.headers.get("cookie") ?? "",
        accept: "application/json",
      },
      cache: "no-store",
    });

    const data = await res.json();
    if (!res.ok || !data?.subjectType) return null;

    return {
      authId: Number(data.authId),
      subjectType: data.subjectType as SubjectType,
      subjectId: Number(data.subjectId),
      roles: (data.roles as string[]) ?? [],
    };
  } catch (err) {
    console.warn("[proxy] fetchSubject error:", (err as Error).message);
    return null;
  }
}

const hasRole = (roles?: string[], ...need: string[]) =>
  !!roles?.some((r) => need.includes(r.toLowerCase()));
const isAdmin = (s: SubjectResp | null) =>
  !!s && (s.subjectType === "admin" || hasRole(s.roles, "admin", "manager", "superadmin"));
const isPro = (s: SubjectResp | null) =>
  !!s && (s.subjectType === "professional" || hasRole(s.roles, "professional", "pro"));
const isUser = (s: SubjectResp | null) => !!s && s.subjectType === "user";

// helper pra decidir home por tipo:
function subjectHome(s: SubjectResp): string {
  if (isAdmin(s)) return "/admin";
  if (isPro(s)) return "/pro";
  if (isUser(s)) return "/app/metrics"; // ou "/app", se preferir
  return "/";
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Ignora estáticos/internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/favicon") ||
    /\.(png|jpg|jpeg|svg|ico|gif|webp|avif|css|js|map)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  const me = await fetchSubject(req);

  // 🔹 Regra: se já estiver logado e abrir /login, manda pra home dele
  if (pathname === "/login") {
    if (!me) return NextResponse.next(); // não logado => deixa ver o login

    const target = subjectHome(me);
    return redirect(req, target);
  }

  // USER-only
  if (startsWithAny(pathname, USER_PREFIXES)) {
    if (!me) return redirect(req, "/login");
    if (!isUser(me)) return redirect(req, "/"); // ou subjectHome(me) se quiser mandar pra área dele
    return NextResponse.next();
  }

  // ADMIN-only
  if (startsWithAny(pathname, ADMIN_PREFIXES)) {
    if (!me) return redirect(req, "/login");
    if (!isAdmin(me)) return redirect(req, "/");
    return NextResponse.next();
  }

  // PRO-only
  if (startsWithAny(pathname, PRO_PREFIXES)) {
    if (!me) return redirect(req, "/login");
    if (!isPro(me)) return redirect(req, "/");
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/cadastro",
    "/recuperar-senha",
    "/home/:path*",
    "/atividades/:path*",
    "/perfil/:path*",
    "/configuracoes/:path*",
    "/app/:path*",
    "/admin/:path*",
    "/pro/:path*",
  ],
};



// // proxy.ts (ou src/proxy.ts)
// import { NextRequest, NextResponse } from "next/server";

// type SubjectType = "user" | "admin" | "professional" | string;
// type SubjectResp = {
//   authId: number;
//   subjectType: SubjectType;
//   subjectId: number;
//   roles?: string[];
// };

// // Se essas rotas são do "usuário comum", trate como USER-only:
// const USER_PREFIXES  = ["/app"];
// const ADMIN_PREFIXES = ["/admin"];
// const PRO_PREFIXES   = ["/pro"]; 
                                                          
// // URL do seu backend (server-side). Evite NEXT_PUBLIC_ aqui se possível:
// const API_BASE = (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

// function startsWithAny(path: string, prefixes: string[]) {
//   return prefixes.some((p) => path === p || path.startsWith(p + "/"));
// }
// function redirect(req: NextRequest, to: string) {
//   const url = req.nextUrl.clone();
//   url.pathname = to;
//   url.search = "";
//   return NextResponse.redirect(url);
// }

// async function fetchSubject(req: NextRequest): Promise<SubjectResp | null> {
  
//   try {
//     const res = await fetch(`${API_BASE}/api/auth/validate-subject-type`, {
//       method: "GET",
//       headers: {
//         cookie: req.headers.get("cookie") ?? "",
//         accept: "application/json",
//       },
//       cache: "no-store",
//     });

//     const data = await res.json(); // leia UMA vez
//     if (!res.ok || !data?.subjectType) return null;

//     return {
//       authId: Number(data.authId),
//       subjectType: data.subjectType as SubjectType,
//       subjectId: Number(data.subjectId),
//       roles: (data.roles as string[]) ?? [],
//     };
//   } catch (err) {
//     console.warn("[proxy] fetchSubject error:", (err as Error).message);
//     return null;
//   }
// }

// const hasRole = (roles?: string[], ...need: string[]) =>
//   !!roles?.some((r) => need.includes(r.toLowerCase()));
// const isAdmin = (s: SubjectResp | null) =>
//   !!s && (s.subjectType === "admin" || hasRole(s.roles, "admin", "manager", "superadmin"));
// const isPro = (s: SubjectResp | null) =>
//   !!s && (s.subjectType === "professional" || hasRole(s.roles, "professional", "pro"));
// const isUser = (s: SubjectResp | null) => !!s && s.subjectType === "user";

// export async function proxy(req: NextRequest) {
//   const { pathname } = req.nextUrl;

//   // Ignora estáticos/internals
//   if (
//     pathname.startsWith("/_next") ||
//     pathname.startsWith("/static") ||
//     pathname.startsWith("/favicon") ||
//     /\.(png|jpg|jpeg|svg|ico|gif|webp|avif|css|js|map)$/i.test(pathname)
//   ) {
//     return NextResponse.next();
//   }

//   // Protegidas — pergunte ao backend
//   const me = await fetchSubject(req);

//   // USER-only
//   if (startsWithAny(pathname, USER_PREFIXES)) {
//     if (!me) return redirect(req, "/login");
//     if (!isUser(me)) return redirect(req, "/"); // ou "/admin" se preferir
//     return NextResponse.next();
//   }

//   // ADMIN-only
//   if (startsWithAny(pathname, ADMIN_PREFIXES)) {
//     if (!me) return redirect(req, "/login");
//     if (!isAdmin(me)) return redirect(req, "/");
//     return NextResponse.next();
//   }

//   // PRO-only (se admin também puder acessar /pro, troque a condição)
//   if (startsWithAny(pathname, PRO_PREFIXES)) {
//     if (!me) return redirect(req, "/login");
//     if (!isPro(me)) return redirect(req, "/");
//     return NextResponse.next();
//   }

//   return NextResponse.next();
// }

// export const config = {
//   matcher: [
//     "/",
//     "/login", 
//     "/cadastro",
//     "/recuperar-senha",
//     "/home/:path*",
//     "/atividades/:path*",
//     "/perfil/:path*",
//     "/configuracoes/:path*",
//     "/app/:path*",
//     "/admin/:path*",
//     "/pro/:path*",
//     // "/profissional/:path*",
//   ],
// };
