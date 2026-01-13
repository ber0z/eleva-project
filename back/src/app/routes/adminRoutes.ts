import { FastifyInstance } from "fastify";
import { AdminController } from "../controllers/adminController";
import { authMiddleware, requireSubject } from "../middlewares/authGuard";

export async function adminRoutes(fastify: FastifyInstance) {
  const adminController = new AdminController();
  fastify.addHook("preHandler", authMiddleware);


  // POST /admins
  fastify.post("/",{ preHandler: [requireSubject("admin")] }, adminController.createAdmin);
  fastify.get("/", { preHandler: [requireSubject("admin")] }, adminController.getMe.bind(adminController));
  fastify.put("/users/:subjectType/:subjectId/toggle-access", { preHandler: [requireSubject("admin")] }, adminController.toggleBlock.bind(adminController));

  // fastify.put("/", { preHandler: [requireSubject("admin")] }, adminController.updateMe.bind(adminController));
  // fastify.delete("/", { preHandler: [requireSubject("admin")] }, adminController.deleteMe.bind(adminController));

}
