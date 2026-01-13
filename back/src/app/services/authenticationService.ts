import { Prisma } from "@prisma/client";
import { AuthenticationRepository, CreateAuthenticationDTO } from "../repositories/authenticationRepository";
import { generateRecoveryCode } from '../utils/recoveryCode';
import { sendRecoveryEmail } from '../utils/recoveryEmailUtils';
import { hashPassword } from '../utils/passwordUtils';
import { hashToken } from '../utils/tokenUtils';

export class AuthenticationService {
  private authRepository: AuthenticationRepository;

  constructor() {
    this.authRepository = new AuthenticationRepository();
  }

  async createAuthentication(
    data: CreateAuthenticationDTO,
    tx?: Prisma.TransactionClient
  ) {
    return await this.authRepository.createAuthentication(data, tx);
  }

  async updateRefreshToken(
    id: number,
    refreshToken: string,                 // token cru
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const tokenHash = hashToken(refreshToken);  // <-- hasheia aqui
    return this.authRepository.updateRefreshToken(id, tokenHash, tx);
  }

  async getAuthenticationByEmail(email: string, tx?: Prisma.TransactionClient) {
    return await this.authRepository.findAuthenticationByEmail(email, tx);
  }

  async initiatePasswordRecovery(email: string): Promise<void> {
    const user = await this.authRepository.findAuthenticationByEmail(email);

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const recoveryCode = generateRecoveryCode();

    await this.authRepository.updateRecoveryCode(user.id, recoveryCode);

    await sendRecoveryEmail(email, recoveryCode);
  }

  async verifyToken(email: string, recoveryCode: string): Promise<void> {

    const user = await this.authRepository.findAuthenticationByEmail(email);

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Verifica se o código de recuperação é válido
    if (user.recoveryCode !== recoveryCode) {
      throw new Error('Código de recuperação inválido');
    }

    if (!user.recoveryCodeExpiresAt || user.recoveryCodeExpiresAt < new Date()) {
      throw new Error('Código de recuperação expirado');
    }

  }

  async resetPassword(email: string, recoveryCode: string, newPassword: string): Promise<void> {
    // Corrigido: Instanciar e utilizar o método de instância
    const user = await this.authRepository.findAuthenticationByEmail(email);

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Verifica se o código de recuperação é válido
    if (user.recoveryCode !== recoveryCode) {
      throw new Error('Código de recuperação inválido');
    }

    if (!user.recoveryCodeExpiresAt || user.recoveryCodeExpiresAt < new Date()) {
      throw new Error('Código de recuperação expirado');
    }

    // Hash da nova senha
    const hashedPassword = await hashPassword(newPassword);

    // Atualiza a senha e limpa o código de recuperação
    await this.authRepository.updatePassword(user.id, hashedPassword);
    await this.authRepository.updateRecoveryCode(user.id, null);
  }

  async invalidateRefreshToken(userId: number, tx?: Prisma.TransactionClient): Promise<void> {
    // Atualiza o refreshToken para uma string vazia ou null (conforme seu modelo permitir)
    await this.authRepository.updateRefreshToken(userId, "", tx);
  }

 async isRefreshTokenValidByAuthId(
    id: number,
    refreshToken: string,                  // token cru recebido do cookie/header
    tx?: Prisma.TransactionClient
  ): Promise<boolean> {
    const tokenHash = hashToken(refreshToken);  // <-- hasheia aqui
    return this.authRepository.isRefreshTokenValidByAuthId(id, tokenHash, tx);
  }

  async emailExists(email: string): Promise<boolean> {
    const user = await this.authRepository.findAuthenticationByEmail(email);
    return !!user;
  }
}
