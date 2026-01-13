import { prisma } from "../lib/prismaClient"; 
import { ProfessionalRepository, CreateProfessionalInput } from "../repositories/professionalRepository";
import { AuthenticationRepository, CreateAuthenticationDTO } from "../repositories/authenticationRepository";
import {  hashPassword } from "../utils/passwordUtils";
import { Professional } from "@prisma/client";

export class ProfessionalService {
  private professionalRepository = new ProfessionalRepository();
  private authRepository = new AuthenticationRepository();

  async createProfessional(data: CreateProfessionalInput): Promise<Professional> {
    // Mantém padrão transacional, caso no futuro crie Authentication/Invites junto
    return prisma.$transaction(async (tx) => {
      const professional = await this.professionalRepository.createProfessional(data, tx);
      // 2.2 cria a auth apontando para o professional
      const passwordHash = await hashPassword(data.password);

      const authData: CreateAuthenticationDTO = {
        subjectType: "professional",
        idProfessional: professional.id, 
        email: data.email,
        password: passwordHash,
        refreshToken: "null",
        lastAccess: new Date(),
      };

      await this.authRepository.createAuthentication(authData, tx);
      return professional;
    });
  }
}
