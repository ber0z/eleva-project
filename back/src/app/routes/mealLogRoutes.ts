import type { FastifyInstance } from "fastify";
import { MealLogController } from "../controllers/mealLogController";
import { authMiddleware, requireSubject } from "../middlewares/authGuard";

export async function mealLogRoutes(app: FastifyInstance) {
  const controller = new MealLogController();

  app.addHook("preHandler", authMiddleware);

  app.post("/",    { preHandler: [requireSubject("user")] }, controller.create);
  app.get("/:id", { preHandler: [requireSubject("user")] }, controller.getOne);
  app.get("/",     { preHandler: [requireSubject("user")] }, controller.list);
  app.put("/:id", { preHandler: [requireSubject("user")] }, controller.update);
  app.delete("/:id", { preHandler: [requireSubject("user")] }, controller.delete);
}
