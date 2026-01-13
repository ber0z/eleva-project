import { PrismaClient, Prisma, User } from "@prisma/client";
import { prisma } from "../lib/prismaClient";



// Define a interface DTO para a criação de um usuário
export interface CreateUserDTO {
  name: string;
  birthDate: Date;
  gender: string;
}

type ListUsersParams = {
  q?: string;
  skip: number;
  take: number;
  orderBy: Prisma.UserOrderByWithRelationInput;
};


export class UserRepository {

  constructor(private readonly prisma: PrismaClient) { }


  async createUser(
    data: { name: string; birthDate: Date; gender: string },
    tx?: Prisma.TransactionClient
  ): Promise<User> {
    return (tx ?? prisma).user.create({ data });
  }

  async findUserById(id: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.user.findUnique({
      where: { id },
    });
  }

  async updateUser(
    id: number,
    data: Prisma.UserUpdateInput,
    tx?: Prisma.TransactionClient
  ): Promise<User> {
    const db = tx ?? this.prisma;
    return db.user.update({
      where: { id },
      data: {
        name: data.name,
        birthDate: data.birthDate,
        gender: data.gender,
        profilePicture: data.profilePicture,
        username: data.username,        // <- novo
        isProfilePublic: data.isProfilePublic, // <- novo
        isProfileImagesPublic: data.isProfileImagesPublic, // <- novo
        updatedAt: new Date(),
      },
    })
  }

  // async updateUserProfileTx(
  //   id: number,
  //   baseData: Pick<Prisma.UserUpdateInput, "name" | "birthDate" | "gender">,
  //   opts: { newPhotoKey?: string | null; deletePhoto?: boolean }
  // ): Promise<{ updated: User; oldKeyToDelete: string | null }> {
  //   return this.prisma.$transaction(async (tx) => {
  //     const existing = await tx.user.findUnique({
  //       where: { id },
  //       select: { id: true, profilePicture: true },
  //     });
  //     if (!existing) throw new Error("Usuário não encontrado");

  //     // decide foto final
  //     let newKey: string | null = existing.profilePicture;
  //     let oldKey: string | null = null;

  //     if (opts.newPhotoKey) {
  //       // prioriza substituição se veio foto nova
  //       newKey = opts.newPhotoKey;
  //       if (existing.profilePicture) oldKey = existing.profilePicture;
  //     } else if (opts.deletePhoto) {
  //       if (existing.profilePicture) oldKey = existing.profilePicture;
  //       newKey = null;
  //     }

  //     const updated = await tx.user.update({
  //       where: { id },
  //       data: {
  //         name: baseData.name,
  //         birthDate: baseData.birthDate,
  //         gender: baseData.gender,
  //         profilePicture: newKey,
  //         updatedAt: new Date(),
  //       },
  //     });

  //     return { updated, oldKeyToDelete: oldKey };
  //   });
  // }

  async listUsers({ q, skip, take, orderBy }: ListUsersParams) {
    const where: Prisma.UserWhereInput = q
      ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          {
            authentications: {
              some: {
                email: { contains: q, mode: "insensitive" },
              },
            },
          },
        ],
      }
      : {};

    // Campos “seguros” do usuário + autenticações (email/subjectType)
    const select = {
      id: true,
      name: true,
      birthDate: true,
      gender: true,
      profilePicture: true,
      createdAt: true,
      updatedAt: true,
      authentications: {
        select: {
          id: true,
          email: true,
          subjectType: true, // "user" | "professional" | "admin"
          isBlocked: true,
        },
        orderBy: { id: "desc" }, // opcional: garante determinismo
      },
    } satisfies Prisma.UserSelect;

    const [rows, total] = await Promise.all([
      prisma.user.findMany({ where, select, skip, take, orderBy }),
      prisma.user.count({ where }),
    ]);

    return { rows, total };
  }

  async getProfilePictureKey(
    userId: number,
    tx?: Prisma.TransactionClient
  ): Promise<string | null> {
    const db = tx ?? this.prisma;
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { profilePicture: true },
    });
    return user?.profilePicture ?? null;
  }

  async getLatestHeightByUser(idUser: number, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    // Se você tiver "createdAt" em Measure, mantenha no orderBy abaixo
    const row = await db.measure.findFirst({
      where: { idUser },
      select: { height: true },
    });
    return row?.height ?? null; // Decimal | number | null
  }
  
  async getCurrentGoalByUser(idUser: number, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    const row = await db.preset.findFirst({
      where: { idUser },
      select: { currentGoal: true },
    });
    return row?.currentGoal ?? null; // string | null
  }

  async findUserByUsername(username: string, tx?: Prisma.TransactionClient) {

    const db = tx ?? this.prisma;
    return db.user.findUnique({
      where: { username },
    });



  }
}