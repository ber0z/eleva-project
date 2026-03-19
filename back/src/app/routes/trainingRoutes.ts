// src/routes/training.routes.ts
import type { FastifyInstance } from "fastify";
import { TrainingController } from "../controllers/trainingController";
import { authMiddleware, requireSubject } from "../middlewares/authGuard";

export async function trainingRoutes(app: FastifyInstance) {
  const controller = new TrainingController();

  app.addHook("preHandler", authMiddleware);

  app.post("/",                        { preHandler: [requireSubject("user")] }, controller.create);
  app.get("/workout/:workoutId",       { preHandler: [requireSubject("user")] }, controller.getWorkout);
  app.get("/:id",                      { preHandler: [requireSubject("user")] }, controller.getOne);
  app.get("/",             { preHandler: [requireSubject("user")] }, controller.list);
  app.put("/:id",         { preHandler: [requireSubject("user")] }, controller.update);
  app.delete("/:id",      { preHandler: [requireSubject("user")] }, controller.delete);
}

