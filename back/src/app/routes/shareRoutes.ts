// src/routes/sleep.routes.ts
import type { FastifyInstance } from "fastify";
import { ShareController } from "../controllers/shareController";
import { authMiddleware, requireSubject } from "../middlewares/authGuard";

export async function shareRoutes(fastify: FastifyInstance) {
    const controller = new ShareController();


    fastify.get("/profile/:tokenOrUsername", controller.resolveProfile.bind(controller));

    fastify.get("/evolution/:token", controller.resolveEvolution.bind(controller));

    fastify.get("/evolution/compare/:token", controller.resolveCompare.bind(controller));



    fastify.register(async (route) => {
        route.addHook("preHandler", authMiddleware);


        route.get("/", { preHandler: [requireSubject("user")] }, controller.listMyLinks.bind(controller)
        );

        route.delete("/:id", { preHandler: [requireSubject("user")] }, controller.deleteMyLink.bind(controller)
        );

        route.post("/profile", { preHandler: [requireSubject("user")] }, controller.shareProfile.bind(controller)
        );

        route.post("/evolution", { preHandler: [requireSubject("user")] }, controller.shareEvolution.bind(controller)
        );

        route.post("/evolution/compare", { preHandler: [requireSubject("user")] }, controller.shareCompare.bind(controller)
        );

    });


}
