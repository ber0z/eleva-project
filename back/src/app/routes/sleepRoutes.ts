// src/routes/sleep.routes.ts
import type { FastifyInstance } from "fastify";
import { SleepController } from "../controllers/sleepController";
import { authMiddleware, requireSubject } from "../middlewares/authGuard";

export async function sleepRoutes(app: FastifyInstance) {
    const controller = new SleepController();

    app.addHook("preHandler", authMiddleware);


    app.post("/", { preHandler: [requireSubject("user")] }, controller.create);
    app.get("/:id", { preHandler: [requireSubject("user")] }, controller.getOne);
    app.get("/", { preHandler: [requireSubject("user")] }, controller.list);
    app.put("/:id", { preHandler: [requireSubject("user")] }, controller.update);
    app.delete("/:id", { preHandler: [requireSubject("user")] }, controller.delete);

    app.get("/stats", { preHandler: [requireSubject("user")] }, controller.stats);

}
