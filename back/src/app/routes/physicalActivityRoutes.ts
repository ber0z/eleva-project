import { FastifyInstance } from "fastify";
import { PhysicalActivityController } from "../controllers/physicalActivityController";
import { authMiddleware, requireSubject } from "../middlewares/authGuard";

export async function physicalActivityRoutes(app: FastifyInstance) {
  const controller = new PhysicalActivityController();


    app.addHook("preHandler", authMiddleware);


    app.post("/", { preHandler: [requireSubject("user")] }, controller.create);
    app.get("/", { preHandler: [requireSubject("user")] },  controller.list);
    app.get("/:id", { preHandler: [requireSubject("user")] },  controller.getOne);
    app.put("/:id", { preHandler: [requireSubject("user")] },  controller.update); 
    app.delete("/:id", { preHandler: [requireSubject("user")] },  controller.delete);
}
  