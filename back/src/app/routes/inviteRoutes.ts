import { FastifyInstance } from "fastify";
import { ProfessionalController } from "../controllers/professionalController";
import { authMiddleware, requireSubject } from "../middlewares/authGuard";

export async function inviteRoutes(fastify: FastifyInstance) {
    const ctrl = new ProfessionalController();

    fastify.register(async (r) => {
        r.addHook("preHandler", authMiddleware);

        // Rotas do lado do usuário para aceitar/recusar convites
        r.post("/accept", { preHandler: [requireSubject("user")] }, ctrl.acceptInvite);
        r.post("/decline", { preHandler: [requireSubject("user")] }, ctrl.declineInvite);
    });
}
