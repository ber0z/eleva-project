import { FastifyInstance } from "fastify";
import { authMiddleware, requireSubject } from "../../../middlewares/authGuard";
import { AiController } from "../controllers/ai.controller";

const aiController = new AiController();

export async function aiRoutes(fastify: FastifyInstance) {
  fastify.register(async (r) => {
    r.addHook("preHandler", authMiddleware);

    r.post(
      "/chat",
      { preHandler: [requireSubject("user")] },
      aiController.chat.bind(aiController)
    );

    r.post(
      "/macros",
      { preHandler: [requireSubject("user")] },
      aiController.estimateMacros.bind(aiController)
    );
  });
}
