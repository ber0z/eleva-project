import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .email({ message: "O e-mail fornecido não é válido" }) // Validação para garantir que é um e-mail válido
    .min(1, { message: "O e-mail é obrigatório" }), // Garantir que o e-mail não esteja vazio

  password: z
    .string()
    .min(6, { message: "A senha deve ter pelo menos 6 caracteres" }) // Garantir que a senha tenha no mínimo 6 caracteres
    .max(255, { message: "A senha deve ter no máximo 255 caracteres" }) // Limite de tamanho para a senha
    .min(1, { message: "A senha é obrigatória" }), // Garantir que a senha não esteja vazia
});

export const initiatePasswordRecoverySchema = z.object({
  email: z.string().email("Formato de e-mail inválido"),  // Verifica se o email é válido
});

export const checkEmailSchema = z.object({
  email: z.string().email("Formato de e-mail inválido"),  // Verifica se o email é válido
});

// Schema para validar os dados na redefinição de senha
export const verifyTokenSchema = z.object({
  email: z.string().email("Formato de e-mail inválido"),  // Verifica se o e-mail é válido
  recoveryCode: z.string().min(6, "Código de recuperação deve ter pelo menos 6 caracteres"),  // Verifica o código
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Formato de e-mail inválido"),  // Verifica se o e-mail é válido
  recoveryCode: z.string().min(6, "Código de recuperação deve ter pelo menos 6 caracteres"),  // Verifica o código
  newPassword: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),  // Verifica se a nova senha tem 6 ou mais caracteres
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});
 