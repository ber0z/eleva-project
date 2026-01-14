import { FastifyRequest, FastifyReply } from "fastify";
import { AuthenticationService } from "../services/authenticationService";
import { generateAccessTokenFor, generateRefreshTokenFor, SubjectType, verifyAccessTokenStrict, verifyRefreshTokenStrict } from '../utils/tokenUtils';
import { prisma } from "../lib/prismaClient";
import { Prisma } from "@prisma/client";
import { comparePasswords } from '../utils/passwordUtils';
import { initiatePasswordRecoverySchema, resetPasswordSchema, loginSchema, verifyTokenSchema } from "../schemas/auhenticationSchema";
import { checkEmailSchema } from "../schemas/auhenticationSchema";
import { z } from 'zod';
import { JwtPayload, TokenExpiredError } from "jsonwebtoken";


function safeMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// === helpers =========================
const REFRESH_ROTATE_THRESHOLD_SEC = 3 * 24 * 60 * 60; // rotaciona faltando <= 3 dias

const refreshBodySchema = z.object({
  refreshToken: z.string().min(10),
});

type RefreshClaims = {
  sub: string;
  subjectType: "admin" | "professional" | "user";
  subjectId: number;
  typ: "refresh";
};



function secondsLeft(payload: JwtPayload) {
  if (!payload.exp) return Number.POSITIVE_INFINITY;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp - now;
}

// (opcional) buscar roles atuais para embutir no access
async function getRolesIfNeeded(subjectType: RefreshClaims["subjectType"], subjectId: number) {
  // adapte ao seu ORM
  if (subjectType === "admin") {
    const admin = await prisma.admin.findUnique({ where: { id: subjectId }, select: { roles: true, isActive: true } });
    if (!admin) throw new Error("Admin não encontrado");
    if (!admin.isActive) throw new Error("Admin desativado");
    return admin.roles as unknown as string[];
  }
  if (subjectType === "professional") {
    const prof = await prisma.professional.findUnique({ where: { id: subjectId }, select: { roles: true } });
    if (!prof) throw new Error("Profissional não encontrado");
    return prof.roles as unknown as string[];
  }
  return undefined; // user comum
}


const authService = new AuthenticationService();

export class AuthenticationController {

  async loginUser(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { email, password } = loginSchema.parse(request.body);

      const auth = await authService.getAuthenticationByEmail(email);
      if (!auth) return reply.code(404).send({ error: "Usuário não encontrado" });

      // (opcional) checagens de bloqueio, se tiver esses campos no schema
      // if (auth.isBlocked) return reply.code(403).send({ error: "Acesso bloqueado" });
      // if (auth.lockedUntil && auth.lockedUntil > new Date()) return reply.code(429).send({ error: "Conta temporariamente bloqueada" });

      const ok = await comparePasswords(password, auth.password);
      if (!ok) return reply.code(401).send({ error: "Credenciais inválidas" });

      // Descobrir subjectType + subjectId + roles (quando aplicável)
      const subjectType: SubjectType = auth.subjectType as SubjectType;
      let subjectId: number | null = null;
      let roles: string[] | undefined;


      if (auth.isBlocked) {
        return reply.code(403).send({ error: "Conta bloqueada" });
      }


      if (subjectType === "user") {
        subjectId = auth.idUser ?? null;
        if (subjectId == null) return reply.code(500).send({ error: "Auth sem idUser" });
        // users geralmente não têm roles
      } else if (subjectType === "professional") {
        subjectId = auth.idProfessional ?? null;
        if (subjectId == null) return reply.code(500).send({ error: "Auth sem idProfessional" });

        const prof = await prisma.professional.findUnique({
          where: { id: subjectId },
          select: { roles: true /*, isActive: true*/ },
        });
        if (!prof) return reply.code(404).send({ error: "Profissional não encontrado" });
        // if (!prof.isActive) return reply.code(403).send({ error: "Profissional desativado" });
        roles = prof.roles as unknown as string[];
      } else {
        // admin
        subjectId = auth.idAdmin ?? null;
        if (subjectId == null) return reply.code(500).send({ error: "Auth sem idAdmin" });

        const admin = await prisma.admin.findUnique({
          where: { id: subjectId },
          select: { roles: true, isActive: true },
        });
        if (!admin) return reply.code(404).send({ error: "Admin não encontrado" });
        if (!admin.isActive) return reply.code(403).send({ error: "Admin desativado" });
        roles = admin.roles as unknown as string[];
      }

      // Gera tokens com subjectType + subjectId (JWT carrega o tipo de acesso)
      const accessToken = generateAccessTokenFor({
        sub: String(auth.id),     // authId como "sub"
        subjectType,
        subjectId,
        roles,                    // opcional: acelera check de permissão
      });

      const refreshRaw = generateRefreshTokenFor({
        sub: String(auth.id),
        subjectType,
        subjectId,
      });

      // Persistir HASH do refresh no DB
      await authService.updateRefreshToken(auth.id, refreshRaw);
      const isProd = process.env.NODE_ENV === "production";

      reply
        .setCookie("rt", refreshRaw, {
          httpOnly: true,
          secure: isProd,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
          signed: true,
          domain: isProd ? ".elevapp.com.br" : undefined, 

        })

        .setCookie("at", accessToken, {
          httpOnly: true,
          secure: isProd,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 10,
          domain: isProd ? ".elevapp.com.br" : undefined, 

        });

      return reply.code(200).send({
        accessToken,
        refreshToken: refreshRaw,
        subjectType,
      });

    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: "Dados inválidos", details: error.errors });
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        return reply.code(500).send({ error: "Erro Prisma", code: error.code });
      }
      const msg = error instanceof Error ? error.message : "Erro desconhecido";
      return reply.code(500).send({ error: msg });
    }
  }

  async initiatePasswordRecovery(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Valida a entrada com o schema
      const validatedBody = initiatePasswordRecoverySchema.parse(request.body);

      // Chamando o serviço para iniciar a recuperação de senha
      await authService.initiatePasswordRecovery(validatedBody.email);
      return reply.code(200).send({ message: 'Código de recuperação enviado para o seu email.' });
    } catch (error: unknown) {
      if (error instanceof Error) {
        // Se o erro for uma instância de Error, você pode acessar a mensagem
        return reply.code(400).send({ error: error.message });
      }
      // Caso o erro não seja do tipo Error, você pode enviar um erro genérico
      return reply.code(400).send({ error: "Erro desconhecido" });
    }
  }

  async refreshToken(request: FastifyRequest, reply: FastifyReply) {
    try {
      // 1) valida body
      const { refreshToken } = refreshBodySchema.parse(request.body);

      // 2) valida assinatura/expiração do refresh
      let pr: (JwtPayload & RefreshClaims);
      try {
        pr = verifyRefreshTokenStrict(refreshToken) as JwtPayload & RefreshClaims;
      } catch (e) {
        if (e instanceof TokenExpiredError) {
          return reply.code(401).send({ error: "Refresh token expirado" });
        }
        return reply.code(403).send({ error: "Refresh token inválido" });
      }

      const authId = Number(pr.sub);


      const ok = await authService.isRefreshTokenValidByAuthId(authId, refreshToken);
      if (!ok) return reply.code(401).send({ error: "Refresh token revogado" });

      // 4) (opcional) recarrega roles atuais
      let roles: string[] | undefined = undefined;
      try {
        roles = await getRolesIfNeeded(pr.subjectType, pr.subjectId);
      } catch (e: unknown) {
        // converta para HTTP adequado
        const msg = safeMessage(e);
        if (msg.includes("não encontrado")) return reply.code(404).send({ error: msg });
        if (msg.includes("desativado")) return reply.code(403).send({ error: msg });
        throw e;
      }

      // 5) sempre gera novo ACCESS
      const accessToken = generateAccessTokenFor({
        sub: pr.sub,
        subjectType: pr.subjectType,
        subjectId: pr.subjectId,
        roles,
      });

      // 6) decide se deve rotacionar o REFRESH
      const rotate = secondsLeft(pr) <= REFRESH_ROTATE_THRESHOLD_SEC;
      let outRefreshToken = refreshToken;

      if (rotate) {
        outRefreshToken = generateRefreshTokenFor({
          sub: pr.sub,
          subjectType: pr.subjectType,
          subjectId: pr.subjectId,
        });
        await authService.updateRefreshToken(authId, outRefreshToken);
      }

      // 7) resposta (mobile-friendly)
      reply.header("Cache-Control", "no-store");
      return reply.code(200).send({
        tokenType: "Bearer",
        accessToken,
        refreshToken: outRefreshToken, // se não rotacionou, volta o mesmo
        rotated: rotate,
        expiresIn: 10 * 60,            // 10m do access (opcional, ajuda o app a agendar renovação)
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.code(400).send({ error: "Payload inválido", details: err.flatten() });
      }
      return reply.code(500).send({ error: "Erro no refresh" });
    }
  }

  async verifyToken(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Valida a entrada com o schema
      const validatedBody = verifyTokenSchema.parse(request.body);

      // Chamando o serviço para redefinir a senha
      await authService.verifyToken(validatedBody.email, validatedBody.recoveryCode);
      return reply.code(200).send({ message: 'token valido' });
    } catch (error: unknown) {
      if (error instanceof Error) {
        return reply.code(400).send({ error: error.message });
      }
      return reply.code(400).send({ error: "Erro desconhecido" });
    }
  }

  async resetPassword(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Valida a entrada com o schema
      const validatedBody = resetPasswordSchema.parse(request.body);

      // Chamando o serviço para redefinir a senha
      await authService.resetPassword(validatedBody.email, validatedBody.recoveryCode, validatedBody.newPassword);
      return reply.code(200).send({ message: 'Senha alterada com sucesso!' });
    } catch (error: unknown) {
      if (error instanceof Error) {
        // Se o erro for uma instância de Error, você pode acessar a mensagem
        return reply.code(400).send({ error: error.message });
      }
      // Caso o erro não seja do tipo Error, você pode enviar um erro genérico
      return reply.code(400).send({ error: "Erro desconhecido" });
    }
  }

  async logoutUser(request: FastifyRequest, reply: FastifyReply) {
    try {
      let authId: number | null = null;

      // 1) se passou pelo authMiddleware, já temos:
      if (request.auth?.authId) {
        authId = request.auth.authId;
      }

      // 2) senão, tenta via Authorization: Bearer <access>
      if (!authId) {
        const h = request.headers.authorization;
        const at = h?.startsWith("Bearer ") ? h.slice(7) : null;
        if (at) {
          try {
            const p = verifyAccessTokenStrict(at);
            authId = Number(p.sub);
          } catch {
            // access inválido/expirado — segue
          }
        }
      }

      // 3) por fim, tenta via refresh (cookie assinado "rt" ou header x-refresh-token)
      if (!authId) {
        const rawCookie = request.cookies?.rt ?? null;
        let refreshRaw: string | null = null;
        if (rawCookie) {
          const u = request.unsignCookie(rawCookie);
          refreshRaw = u.valid ? (u.value as string) : rawCookie; // aceita assinado ou não
        } else {
          const rh = request.headers["x-refresh-token"];
          refreshRaw = Array.isArray(rh) ? rh[0] : rh || null;
        }
        if (refreshRaw) {
          try {
            const pr = verifyRefreshTokenStrict(refreshRaw);
            authId = Number(pr.sub);
          } catch {
            // refresh inválido — segue para limpar cookies mesmo assim
          }
        }
      }

      // Invalida o refresh no banco (id = authId da tabela Authentication)
      if (authId) {
        await authService.updateRefreshToken(authId, ""); // ou null, conforme seu schema
      }

      // Limpa cookies (web). No mobile você ignora isso e só apaga do storage.
      reply
        .clearCookie("at", { path: "/" })
        .clearCookie("rt", { path: "/" });

      return reply.code(200).send({ message: "Logout realizado com sucesso" });
    } catch {
      return reply.code(500).send({ error: "Erro ao fazer logout" });
    }
  }
  //check if the email is already registered
  async checkEmail(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { email } = checkEmailSchema.parse(request.query);

      const exists = await authService.emailExists(email);

      // 200 em ambos os casos para evitar enumeração de contas
      return reply.code(200).send({ exists });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: "E-mail inválido",
          details: error.errors
        });
      }
      return reply.code(500).send({ error: "Falha ao verificar e-mail" });
    }
  }

  async validateSubjectType(request: FastifyRequest, reply: FastifyReply) {
    try {

      if (!request.auth?.subjectType) {
        return reply.code(403).send({ error: "Usuario não autenticado" });
      }

      return reply.code(200).send({ subjectType: request.auth.subjectType });
    } catch {
      return reply.code(500).send({ error: "Falha ao validar em subject-type:" });
    }

  }

}
