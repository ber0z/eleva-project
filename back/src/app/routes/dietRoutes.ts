import type { FastifyInstance } from "fastify";
import { DietController } from "../controllers/dietController";
import { authMiddleware, requireSubject } from "../middlewares/authGuard";

export async function dietRoutes(app: FastifyInstance) {
  const controller = new DietController();

  app.addHook("preHandler", authMiddleware);

  app.post("/",  { preHandler: [requireSubject("user")] }, controller.create);
  app.get("/:id", { preHandler: [requireSubject("user")] }, controller.getOne);
  app.get("/", { preHandler: [requireSubject("user")] }, controller.list);
  app.put("/:id", { preHandler: [requireSubject("user")] }, controller.update);
  app.delete("/:id", { preHandler: [requireSubject("user")] }, controller.delete);
}
