import { FastifyInstance } from "fastify";
import { AuthenticationController } from "../controllers/authenticationController";
import { authMiddleware } from "../middlewares/authGuard";

const authenticationController = new AuthenticationController();

export async function authenticationRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/login',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '10m',
          errorResponseBuilder() {
            return { error: 'Muitas tentativas de login. Tente novamente em alguns minutos.' };
          },
        },
      },
    },
    authenticationController.loginUser.bind(authenticationController)
  );


  fastify.post("/recovery", authenticationController.initiatePasswordRecovery.bind(authenticationController));
  fastify.post("/refresh", authenticationController.refreshToken.bind(authenticationController));
  fastify.post("/verify-token", authenticationController.verifyToken.bind(authenticationController));
  fastify.post("/reset-password", authenticationController.resetPassword.bind(authenticationController));
  fastify.post("/logout", authenticationController.logoutUser.bind(authenticationController));
  fastify.get("/check-email", authenticationController.checkEmail.bind(authenticationController));
  fastify.get("/validate-subject-type", { preHandler: [authMiddleware] }, authenticationController.validateSubjectType.bind(authenticationController));


} 