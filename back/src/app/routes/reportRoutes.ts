import type { FastifyInstance } from "fastify";
import { ReportController } from "../controllers/reportController";
import { authMiddleware, requireSubject } from "../middlewares/authGuard";

export async function reportRoutes(app: FastifyInstance) {
    const controller = new ReportController();

    app.addHook("preHandler", authMiddleware);     


    app.get("/dashboard",  { preHandler: [requireSubject("admin")] }, controller.dashboard);
}
