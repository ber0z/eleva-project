import { prisma } from "../lib/prismaClient";
import { Prisma, Admin } from "@prisma/client";
import { AdminRepository, CreateAdminInput } from "../repositories/adminRepository";
import { AdminUpdateInput } from "../schemas/adminSchema";
import { AuthenticationRepository, CreateAuthenticationDTO, SubjectType  } from "../repositories/authenticationRepository";
import { hashPassword } from "../utils/passwordUtils";
import { generateRefreshTokenFor, hashToken } from "../utils/tokenUtils";

type CreateAdminWithAuthInput = CreateAdminInput & {
  auth: { email: string; password: string };
};

export class AdminService {
  private adminRepository = new AdminRepository();
  private authRepository = new AuthenticationRepository();


  async createAdmin(payload: CreateAdminWithAuthInput): Promise<Admin> {
    return prisma.$transaction(async (tx) => {
      const admin = await this.adminRepository.createAdmin(
        {
          name: payload.name,
          roles: payload.roles,
          profilePicture: payload.profilePicture,
          isActive: payload.isActive,
        },
        tx
      );

      const passwordHash = await hashPassword(payload.auth.password);
      const refreshRaw = generateRefreshTokenFor({ sub: String(admin.id), subjectType: "admin", subjectId: admin.id });
      const refreshHashed = hashToken(refreshRaw);

      const authData: CreateAuthenticationDTO = {
        subjectType: "admin",
        idAdmin: admin.id,
        email: payload.auth.email,
        password: passwordHash,
        refreshToken: refreshHashed,
        lastAccess: new Date(),
      };

      await this.authRepository.createAuthentication(authData, tx);

      // Se quiser retornar o refresh token em claro, faça isso no controller.
      return admin;
    });
  }

  async getById(id: number) {
    return this.adminRepository.findById(id);
  }

  async update(id: number, data: AdminUpdateInput) {
    return this.adminRepository.update(id, {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      // ...(data.role !== undefined ? { role: data.role } : {}),
      updatedAt: new Date(),
    } as Prisma.AdminUpdateInput);
  }

  async delete(id: number) {
    return this.adminRepository.delete(id);
  }

  async toggleBlockSubject(subjectType: SubjectType, subjectId: number) {
    return prisma.$transaction(async (tx) => {
      const cur = await this.authRepository.isSubjectBlocked(tx, subjectType, subjectId);
      const next = !cur;
      const res = await this.authRepository.setBlockedBySubject(tx, subjectType, subjectId, next);
      return { subjectType, subjectId, isBlocked: next, affectedAuths: res.count };
    });
  }

  async setBlockSubject(subjectType: SubjectType, subjectId: number, block: boolean) {
    return prisma.$transaction(async (tx) => {
      const res = await this.authRepository.setBlockedBySubject(tx, subjectType, subjectId, block);
      return { subjectType, subjectId, isBlocked: block, affectedAuths: res.count };
    });
  }
}