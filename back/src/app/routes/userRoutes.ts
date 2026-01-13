import { FastifyInstance } from "fastify";
import { UserController } from "../controllers/userController";
import { authMiddleware, requireSubject } from "../middlewares/authGuard";

const userController = new UserController();



export async function userRoutes(fastify: FastifyInstance) {

 
   // 🔓 Pública — sem preHandler nenhum
  fastify.post("/", userController.createUser.bind(userController));

  // 🔒 Protegidas — tudo aqui dentro herda o authMiddleware
  fastify.register(async (r) => {
    r.addHook("preHandler", authMiddleware);

    r.get("/", { preHandler: [requireSubject("user")] }, userController.getMe.bind(userController));
    r.get("/all", { preHandler: [requireSubject("admin")] }, userController.getAll.bind(userController));
    r.put("/", { preHandler: [requireSubject("user")] }, userController.updateMe.bind(userController));
    r.get("/profile-picture", { preHandler: [requireSubject("user")] }, userController.getMyProfilePhoto.bind(userController));
    r.get("/goal-and-height", { preHandler: [requireSubject("user")] }, userController.getGoalAndHeight.bind(userController));
    r.get("/username-availability/:username", { preHandler: [requireSubject("user")] }, userController.getUsernameAvailability.bind(userController));



  });

} 
  

