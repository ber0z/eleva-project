import { FastifyInstance } from "fastify";
import { ProfessionalController } from "../controllers/professionalController";
import { ClientRecordController } from "../controllers/clientRecordController";
import { ClientTrainingDietController } from "../controllers/clientTrainingDietController";
import { authMiddleware, requireSubject } from "../middlewares/authGuard";

export async function professionalRoutes(fastify: FastifyInstance) {
    const ctrl = new ProfessionalController();
    const recordCtrl = new ClientRecordController();
    const clientTrainingDietCtrl = new ClientTrainingDietController();

    // Pública — criar conta de profissional
    fastify.post("/", ctrl.createProfessional);

    // Protegidas — tudo aqui dentro herda o authMiddleware
    fastify.register(async (r) => {
        r.addHook("preHandler", authMiddleware);

        // Perfil
        r.get("/me", { preHandler: [requireSubject("professional")] }, ctrl.getMe);
        r.put("/me", { preHandler: [requireSubject("professional")] }, ctrl.updateMe);
        r.get("/me/profile-picture", { preHandler: [requireSubject("professional")] }, ctrl.getMyProfilePhoto);

        // Dashboard
        r.get("/dashboard", { preHandler: [requireSubject("professional")] }, ctrl.getDashboard);

        // Clientes (vínculos)
        r.get("/clients", { preHandler: [requireSubject("professional")] }, ctrl.listClients);
        r.get("/clients/:userId", { preHandler: [requireSubject("professional")] }, ctrl.getClient);
        r.patch("/clients/:userId/permissions", { preHandler: [requireSubject("professional")] }, ctrl.updateClientPermissions);
        r.delete("/clients/:userId", { preHandler: [requireSubject("professional")] }, ctrl.revokeClient);

        // Registros do cliente (leitura)
        r.get("/clients/:userId/records/overview", { preHandler: [requireSubject("professional")] }, recordCtrl.getOverview);
        r.get("/clients/:userId/records/activities", { preHandler: [requireSubject("professional")] }, recordCtrl.listActivities);
        r.get("/clients/:userId/records/activities/stats", { preHandler: [requireSubject("professional")] }, recordCtrl.getActivityStats);
        r.get("/clients/:userId/records/sleep", { preHandler: [requireSubject("professional")] }, recordCtrl.listSleep);
        r.get("/clients/:userId/records/sleep/stats", { preHandler: [requireSubject("professional")] }, recordCtrl.getSleepStats);
        r.get("/clients/:userId/records/meals", { preHandler: [requireSubject("professional")] }, recordCtrl.listMealDays);
        r.get("/clients/:userId/records/meals/:id", { preHandler: [requireSubject("professional")] }, recordCtrl.getMealDay);
        r.get("/clients/:userId/records/evolutions", { preHandler: [requireSubject("professional")] }, recordCtrl.listEvolutions);
        r.get("/clients/:userId/records/evolutions/:id", { preHandler: [requireSubject("professional")] }, recordCtrl.getEvolution);

        // Treinos/dietas do cliente (listagem e criação)
        r.get("/clients/:userId/trainings", { preHandler: [requireSubject("professional")] }, clientTrainingDietCtrl.listTrainingsForClient);
        r.get("/clients/:userId/diets", { preHandler: [requireSubject("professional")] }, clientTrainingDietCtrl.listDietsForClient);
        r.post("/clients/:userId/training", { preHandler: [requireSubject("professional")] }, clientTrainingDietCtrl.createTrainingForClient);
        r.post("/clients/:userId/diet", { preHandler: [requireSubject("professional")] }, clientTrainingDietCtrl.createDietForClient);

        // Treino individual do cliente (detalhe, edição, exclusão)
        r.get("/clients/:userId/training/:id", { preHandler: [requireSubject("professional")] }, clientTrainingDietCtrl.getTrainingForClient);
        r.put("/clients/:userId/training/:id", { preHandler: [requireSubject("professional")] }, clientTrainingDietCtrl.updateTrainingForClient);
        r.delete("/clients/:userId/training/:id", { preHandler: [requireSubject("professional")] }, clientTrainingDietCtrl.deleteTrainingForClient);

        // Dieta individual do cliente (detalhe, edição, exclusão)
        r.get("/clients/:userId/diet/:id", { preHandler: [requireSubject("professional")] }, clientTrainingDietCtrl.getDietForClient);
        r.put("/clients/:userId/diet/:id", { preHandler: [requireSubject("professional")] }, clientTrainingDietCtrl.updateDietForClient);
        r.delete("/clients/:userId/diet/:id", { preHandler: [requireSubject("professional")] }, clientTrainingDietCtrl.deleteDietForClient);

        // Convites
        r.post("/invites", { preHandler: [requireSubject("professional")] }, ctrl.sendInvite);
        r.get("/invites", { preHandler: [requireSubject("professional")] }, ctrl.listInvites);
        r.get("/invites/:inviteId", { preHandler: [requireSubject("professional")] }, ctrl.getInvite);
        r.patch("/invites/:inviteId/cancel", { preHandler: [requireSubject("professional")] }, ctrl.cancelInvite);

        // Notificações (read-all antes de :id para evitar conflito)
        r.get("/notifications", { preHandler: [requireSubject("professional")] }, ctrl.listNotifications);
        r.patch("/notifications/read-all", { preHandler: [requireSubject("professional")] }, ctrl.markAllNotificationsRead);

        r.patch("/notifications/:id/read", { preHandler: [requireSubject("professional")] }, ctrl.markNotificationRead);
    });}
 