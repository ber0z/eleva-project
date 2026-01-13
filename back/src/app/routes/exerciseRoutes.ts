import { FastifyInstance } from "fastify";
import { ExerciseController } from "../controllers/exerciseController";
// import { authMiddleware } from "../middlewares/authMiddleware";
// import { requireSubject } from "../middlewares/guards";

export async function exerciseRoutes(app: FastifyInstance) {
  const exerciseController = new ExerciseController();

  // Se quiser proteger:
  // app.addHook("preHandler", authMiddleware);

  app.post("/", /* { preHandler: [requireSubject("admin")] }, */ exerciseController.create);
  app.get("/", exerciseController.list);
  app.get("/:id", exerciseController.getOne);
  app.put("/:id", /* { preHandler: [requireSubject("admin","professional")] }, */ exerciseController.update);
  app.delete("/:id", /* { preHandler: [requireSubject("admin")] }, */ exerciseController.delete);
}
  