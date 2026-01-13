import { Prisma, Admin, AdminRole } from "@prisma/client";
import { prisma } from "../lib/prismaClient";

export type CreateAdminInput = {
  name: string;
  roles: ("superadmin" | "manager" | "support" | "auditor")[]; // compatível com o schema Zod
  profilePicture?: string | null;
  isActive?: boolean;
};

export class AdminRepository {
  async createAdmin(
    data: CreateAdminInput,
    tx?: Prisma.TransactionClient
  ): Promise<Admin> {
    const db = tx ?? prisma;

    return db.admin.create({
      data: {
        name: data.name,
        roles: data.roles as AdminRole[],
        profilePicture: data.profilePicture ?? null,
        isActive: data.isActive ?? true,
      },
    });
  }

  async findById(id: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.admin.findUnique({ where: { id } });
  }

  async update(
    id: number,
    data: Prisma.AdminUpdateInput,
    tx?: Prisma.TransactionClient
  ): Promise<Admin> {
    const client = tx ?? prisma;
    return client.admin.update({
      where: { id },
      data,
    });
  }

  async delete(id: number, tx?: Prisma.TransactionClient): Promise<Admin> {
    const client = tx ?? prisma;
    return client.admin.delete({ where: { id } });
  }
  
}
