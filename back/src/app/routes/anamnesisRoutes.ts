import { FastifyInstance } from "fastify";
import { authMiddleware, requireSubject } from "../middlewares/authGuard";
import { AnamnesisController } from "../controllers/anamnesisController";

export async function anamnesisRoutes(app: FastifyInstance) {
  const controller = new AnamnesisController();

  app.addHook("preHandler", authMiddleware);

  app.get("/", { preHandler: [requireSubject("user")] }, controller.getAnamnesis);
  app.post("/", { preHandler: [requireSubject("user")] }, controller.createAnamnesis);
  app.put("/", { preHandler: [requireSubject("user")] }, controller.updateAnamnesis);
}
