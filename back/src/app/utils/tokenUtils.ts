import jwt, { JwtPayload } from "jsonwebtoken";
import crypto from "crypto";
// import { AuthenticationService } from "../services/authenticationService";


// const authService = new AuthenticationService();

const ACCESS_SECRET  = process.env.ACCESS_SECRET  || "dev_access_secret";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "dev_refresh_secret";

export type SubjectType = "user" | "professional" | "admin";


// // ---------- helpers ----------
export const hashToken = (t: string) =>
  crypto.createHash("sha256").update(t).digest("hex");
 

// ===== Novo: payloads com subjectType =====
export type AccessClaims = {
  sub: string;             // id da linha em Authentication (authId), como string
  subjectType: SubjectType;
  subjectId: number;       // idUser | idProfessional | idAdmin
  roles?: string[];        // opcional: acelera autorização (admin/professional)
  typ: "access";
};

export type RefreshClaims = {
  sub: string;             // authId
  subjectType: SubjectType;
  subjectId: number;
  typ: "refresh";
};

// ===== Novo: gerar/validar ACCESS =====
export function generateAccessTokenFor(c: Omit<AccessClaims, "typ">) {
  const payload: AccessClaims = { ...c, typ: "access" };
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: "10m" });
}
export function verifyAccessTokenStrict(token: string) {
  const decoded = jwt.verify(token, ACCESS_SECRET) as JwtPayload & AccessClaims;
  if (decoded.typ !== "access") throw new Error("Invalid token type");
  return decoded;
}

// ===== Novo: gerar/validar REFRESH =====
export function generateRefreshTokenFor(c: Omit<RefreshClaims, "typ">) {
  const payload: RefreshClaims = { ...c, typ: "refresh" };
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });
}
export function verifyRefreshTokenStrict(token: string) {
  const decoded = jwt.verify(token, REFRESH_SECRET) as JwtPayload & RefreshClaims;
  if (decoded.typ !== "refresh") throw new Error("Invalid token type");
  return decoded;
}