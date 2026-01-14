import { FastifyRequest, FastifyReply } from 'fastify';
import {
  verifyAccessTokenStrict,
  verifyRefreshTokenStrict,
  generateAccessTokenFor,
  generateRefreshTokenFor,
} from "../utils/tokenUtils";
import { prisma } from "../lib/prismaClient";
import { metricsService } from '../services/metricsService';
import { AuthenticationService } from '../services/authenticationService';

const authService = new AuthenticationService();

const SECURE_COOKIE = process.env.NODE_ENV !== "development";



type SameSite = "lax" | "strict" | "none";
// defina via env (ou lógica própria)
function resolveSameSiteFromEnv(): SameSite {
  const env = (process.env.NODE_ENV ?? "development").toLowerCase();
  if (env === "production") return "none"; // cross-site em produção
  // em geral, "lax" é seguro e suficiente
  return "lax";
}

const SAME_SITE: SameSite = resolveSameSiteFromEnv();


function readSignedCookie(req: FastifyRequest, name: string): string | null {
  const raw = req.cookies?.[name];
  if (!raw) return null;
  const u = req.unsignCookie(raw);
  return u.valid ? (u.value as string) : null;
}

export type SubjectType = "user" | "professional" | "admin";

export const requireSubject =
  (...allowed: SubjectType[]) =>
    async (req: FastifyRequest, reply: FastifyReply) => {
      const st = req.auth?.subjectType;
      if (!st) return reply.code(401).send({ error: "Não autenticado" });
      if (!allowed.includes(st)) {
        return reply.code(403).send({
          error: "Tipo de acesso não permitido",
          detail: { required: allowed, got: st },
        });
      }
    };

// limiar para rotacionar o refresh 
const REFRESH_ROTATE_THRESHOLD_SEC = 1 * 24 * 60 * 60; // 1d 

function shouldRotateRefresh(pr: { exp?: number }): boolean {
  if (!pr.exp) return false; // se o refresh não tem exp no JWT, não rotaciona por tempo
  const now = Math.floor(Date.now() / 1000);
  const timeLeft = pr.exp - now;
  return timeLeft <= REFRESH_ROTATE_THRESHOLD_SEC;
}

//helper para trackear usuários ativos
function maybeTrackActive(subjectType: SubjectType | undefined, subjectId: number | undefined) {
  if (subjectType === "user" && typeof subjectId === "number") {
    // não bloqueie a request; se quiser garantir persistência, use await
    metricsService.trackActiveUserDayRedis(subjectId, "user").catch(() => { });
  }
}


export const authMiddleware = async (req: FastifyRequest, reply: FastifyReply) => {
  // 1) Prefira cookie (web) ao header (evita usar Authorization expirado)
  const accessFromCookie = req.cookies?.at ?? null;
  const accessFromHeader = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
  const accessToken = accessFromCookie ?? accessFromHeader;

  if (accessToken) {
    try {
      const p = verifyAccessTokenStrict(accessToken);

      // ⛔ BLOQUEIO: checa na Authentication pelo authId (sub)
      const authIdNum = Number(p.sub);
      const authRow = await prisma.authentication.findUnique({
        where: { id: authIdNum },
        select: { isBlocked: true },
      });
      if (authRow?.isBlocked) {
        return reply.code(403).send({ error: "Conta bloqueada" });
      }

      req.auth = {
        authId: Number(p.sub),
        subjectType: p.subjectType,
        subjectId: p.subjectId,
        roles: p.roles,
      };

      maybeTrackActive(p.subjectType, p.subjectId);

      return; // ok
    } catch {
      // tenta refresh abaixo
    }
  }

  // 2) tenta REFRESH
  const refreshFromCookie = readSignedCookie(req, "rt");
  const rh = req.headers["x-refresh-token"];
  const refreshFromHeader = Array.isArray(rh) ? rh[0] : rh || null;

  const refreshRaw = refreshFromCookie ?? refreshFromHeader;
  if (!refreshRaw) return reply.code(401).send({ error: "Sem credenciais" });

  // 2.1 valida e confere revogação
  let pr: ReturnType<typeof verifyRefreshTokenStrict>;
  try {
    pr = verifyRefreshTokenStrict(refreshRaw);
  } catch {
    return reply.code(401).send({ error: "Refresh token inválido" });
  }
  const authId = Number(pr.sub);

  const isValid = await authService.isRefreshTokenValidByAuthId(authId, refreshRaw);
  if (!isValid) return reply.code(401).send({ error: "Refresh revogado" });

  // 2.2 (opcional) recarrega roles
  let roles: string[] | undefined;
  if (pr.subjectType === "admin") {
    const admin = await prisma.admin.findUnique({
      where: { id: pr.subjectId },
      select: { roles: true, isActive: true },
    });
    if (!admin) return reply.code(404).send({ error: "Admin não encontrado" });
    if (!admin.isActive) return reply.code(403).send({ error: "Admin desativado" });
    roles = admin.roles as unknown as string[];
  } else if (pr.subjectType === "professional") {
    const prof = await prisma.professional.findUnique({
      where: { id: pr.subjectId },
      select: { roles: true },
    });
    if (!prof) return reply.code(404).send({ error: "Profissional não encontrado" });
    roles = prof.roles as unknown as string[];
  }

  // 3) Sempre gera novo ACCESS; decide se rotaciona REFRESH
  const newAccess = generateAccessTokenFor({
    sub: String(authId),
    subjectType: pr.subjectType,
    subjectId: pr.subjectId,
    roles,
  });

  const rotateRefresh = shouldRotateRefresh(pr);

  // só gera e salva novo refresh se estiver perto de expirar (ou outra política sua)
  const newRefreshRaw = rotateRefresh
    ? generateRefreshTokenFor({
      sub: String(authId),
      subjectType: pr.subjectType,
      subjectId: pr.subjectId,
    })
    : null;

  if (rotateRefresh) {
    await authService.updateRefreshToken(authId, newRefreshRaw!);
  }

  // 4) Devolve tokens
  if (refreshFromCookie) {
    const isProd = process.env.NODE_ENV === "production";

    // WEB (cookies). Sempre regrava o access. O refresh só quando rotacionar.
    reply.setCookie("at", newAccess, {
      httpOnly: true,
      secure: SECURE_COOKIE,
      sameSite: SAME_SITE,
      path: "/",
      maxAge: 60 * 10, // 10m
      domain: isProd ? ".elevapp.com.br" : undefined,

    });

    if (rotateRefresh) {
      reply.setCookie("rt", newRefreshRaw!, {
        httpOnly: true,
        secure: SECURE_COOKIE,
        sameSite: SAME_SITE === "none" ? "none" : "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7d (ou o que você usa)
        domain: isProd ? ".elevapp.com.br" : undefined,

        signed: true,
      });
    }

    // opcional: também devolva em headers para apps híbridos
    reply.header("x-access-token", newAccess);
    if (rotateRefresh) reply.header("x-refresh-token", newRefreshRaw!);
  } else {
    // MOBILE (headers). Sempre devolve novo access. Refresh só quando rotacionar.
    reply.header("x-access-token", newAccess);
    if (rotateRefresh) reply.header("x-refresh-token", newRefreshRaw!);
  }

  // 5) Injeta contexto e segue
  req.auth = {
    authId,
    subjectType: pr.subjectType,
    subjectId: pr.subjectId,
    roles,
  };

  maybeTrackActive(pr.subjectType, pr.subjectId);


  return;
};