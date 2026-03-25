import { FastifyInstance } from "fastify";
import { UserController } from "../controllers/userController";
import { UserNotificationController } from "../controllers/userNotificationController";
import { authMiddleware, requireSubject } from "../middlewares/authGuard";

const userController = new UserController();
const notifCtrl = new UserNotificationController();

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

    // ===================== Notificações do Usuário =====================
    r.get("/notifications", { preHandler: [requireSubject("user")] }, notifCtrl.listNotifications);
    r.patch("/notifications/:id/read", { preHandler: [requireSubject("user")] }, notifCtrl.markAsRead);
    r.patch("/notifications/read-all", { preHandler: [requireSubject("user")] }, notifCtrl.markAllAsRead);
    r.get("/notifications/unread-count", { preHandler: [requireSubject("user")] }, notifCtrl.countUnread);

    // ===================== Convites do Usuário =====================
    r.get("/invites", { preHandler: [requireSubject("user")] }, notifCtrl.listPendingInvites);
    r.post("/invites/accept", { preHandler: [requireSubject("user")] }, notifCtrl.acceptInvite);
    r.post("/invites/decline", { preHandler: [requireSubject("user")] }, notifCtrl.declineInvite);

    // ===================== Profissionais Conectados =====================
    r.get("/professionals", { preHandler: [requireSubject("user")] }, notifCtrl.listProfessionals);
    r.get("/professionals/:professionalId", { preHandler: [requireSubject("user")] }, notifCtrl.getProfessional);
    r.post("/professionals/:professionalId/permissions/approve", { preHandler: [requireSubject("user")] }, notifCtrl.approvePermissions);
    r.post("/professionals/:professionalId/permissions/reject", { preHandler: [requireSubject("user")] }, notifCtrl.rejectPermissions);
    r.delete("/professionals/:professionalId", { preHandler: [requireSubject("user")] }, notifCtrl.revokeProfessional);
  });
} 
  

