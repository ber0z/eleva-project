import { UserRepository } from "../repositories/userRepository";
import { PresetRepository } from "../repositories/presetRepository";
import { AuthenticationRepository } from "../repositories/authenticationRepository";
import { User, PrismaClient, Prisma } from "@prisma/client";
import { metricsService } from "./metricsService";
import { prisma } from "../lib/prismaClient";
import { ImageService } from "./imageService";
import { presignR2GetUrlByKey, uploadUserProfilePhotoR2 } from "./uploadService";
import { deleteR2Keys } from "./r2Service";
import { UserUpdateInput } from "../schemas/userSchema"
import { hashPassword } from "../utils/passwordUtils";


type CreateUserInput = {
  name: string;
  birthDate: Date;
  gender: 'male' | 'female' | 'other';
  email: string;
  password: string;
  preset?: {
    currentGoal?: string;
    terms: string;
  };
};

type ListUsersParams = {
  q?: string;
  skip: number;
  take: number;
  orderBy: Prisma.UserOrderByWithRelationInput;
};

export class UserService {
  private userRepository = new UserRepository(prisma);
  private presetRepository = new PresetRepository();
  private authRepository = new AuthenticationRepository();

  async createUser(input: CreateUserInput): Promise<User> {
    return prisma.$transaction(async (tx) => {
      // 1) cria o usuário
      const user = await this.userRepository.createUser(
        { name: input.name, birthDate: input.birthDate, gender: input.gender },
        tx
      );

      // 2) cria o preset (opcional)
      await this.presetRepository.createPreset(
        {
          idUser: user.id,
          currentGoal: input.preset?.currentGoal ?? "Default Goal",
          terms: input.preset?.terms ?? "Default Terms",
          dateSigningTerm: new Date(),
        },
        tx
      );

      // 3) cria a autenticação (subject=user), SEM logar ainda
      await this.authRepository.createAuthentication(
        {
          subjectType: "user",     // << importante para seu modelo de auth
          idUser: user.id,
          email: input.email,
          password: await hashPassword(input.password),
          refreshToken: "",        // cadastro não inicia sessão; login fará rotação correta
          recoveryCode: null,
          lastAccess: new Date(),
        },
        tx
      );

      try {
        await metricsService.trackSignupTx(tx);
      } catch (err) {
        console.error("Falha ao trackear métrica de signup:", err);
      }

      return user;
    });
  }

  async getUserById(id: number) {
    const user = await this.userRepository.findUserById(id);
    const preset = await this.presetRepository.getPresetByUserId(id);
    return {
      user,
      preset
    };
  }

  async listUsers(params: ListUsersParams) {
    return this.userRepository.listUsers(params);
  }

  async updateUser(
    id: number,
    updateData: UserUpdateInput,
    photoBuffer?: Buffer
  ): Promise<User> {
    let oldKeyToDelete: string | null = null;

    const updated = await (prisma as PrismaClient).$transaction(async (tx) => {
      const existing = await this.userRepository.findUserById(id, tx);
      if (!existing) throw new Error("Usuário não encontrado");

      // 1) conflito de username (se veio e é diferente do atual)
      if (updateData.username && updateData.username !== existing.username) {
        const clash = await this.userRepository.findUserByUsername(updateData.username, tx);
        if (clash && clash.id !== id) {
          throw new Error("USERNAME_TAKEN");
        }
      }

      // 2) foto (como já fazia)
      let newKey: string | null = existing.profilePicture;
      if (photoBuffer) {
        const processed = await ImageService.processImage(photoBuffer, 70 * 1024, 800, 800);
        newKey = await uploadUserProfilePhotoR2({ userId: id, buffer: processed, contentType: "image/webp" });
        if (existing.profilePicture) oldKeyToDelete = existing.profilePicture;
      } else if (updateData.deletePhoto) {
        if (existing.profilePicture) oldKeyToDelete = existing.profilePicture;
        newKey = null;
      }

      // 3) montar patch apenas com campos definidos
      const data: Prisma.UserUpdateInput = {
        updatedAt: new Date(),
      };
      if (updateData.name !== undefined) data.name = updateData.name;
      if (updateData.birthDate !== undefined) data.birthDate = updateData.birthDate;
      if (updateData.gender !== undefined) data.gender = updateData.gender;
      if (updateData.username !== undefined) data.username = updateData.username; // <- novo
      if (updateData.isProfilePublic !== undefined) data.isProfilePublic = updateData.isProfilePublic; // <- novo
      if (updateData.isProfileImagesPublic !== undefined) data.isProfileImagesPublic = updateData.isProfileImagesPublic; // <- novo
      data.profilePicture = newKey;

      return this.userRepository.updateUser(id, data, tx);
    });

    if (oldKeyToDelete) {
      const failed = await deleteR2Keys([oldKeyToDelete]);
      if (failed.length) console.warn("[R2] falha ao deletar foto antiga:", failed);
    }

    return updated;
  }

  async getProfilePhotoUrl(
    userId: number,
    ttlSeconds = 300
  ): Promise<{ url: string; expiresAt: string } | null> {
    const key = await this.userRepository.getProfilePictureKey(userId);
    if (!key) return null;
    return presignR2GetUrlByKey(key, ttlSeconds);
  }

  async getGoalAndHeightForUser(idUser: number, tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    const [heightRaw, currentGoal] = await Promise.all([
      this.userRepository.getLatestHeightByUser(idUser, db),
      this.userRepository.getCurrentGoalByUser(idUser, db),
    ]);
    return {
      height: heightRaw,
      currentGoal,
    };

  }

  async isUsernameAvailable(username: string, tx?: Prisma.TransactionClient) {

    const db = tx ?? prisma;
    const existing = await this.userRepository.findUserByUsername(username, db);
    return existing ? false : true;
  }


}
