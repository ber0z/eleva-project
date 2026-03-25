import { FastifyInstance } from "fastify";
import { ChatController } from "../controllers/chatController";
import { authMiddleware, requireSubject } from "../middlewares/authGuard";

export async function chatRoutes(fastify: FastifyInstance) {
    const ctrl = new ChatController();

    fastify.register(async (r) => {
        r.addHook("preHandler", authMiddleware);

        const guard = { preHandler: [requireSubject("user", "professional")] };

        r.post("/start", guard, ctrl.startConversation);
        r.get("/conversations", guard, ctrl.listConversations);
        r.get("/conversations/:conversationId/messages", guard, ctrl.listMessages);
        r.post("/conversations/:conversationId/messages", guard, ctrl.sendMessage);
        r.patch("/conversations/:conversationId/read", guard, ctrl.markAsRead);
        r.get("/unread-count", guard, ctrl.countUnread);
        r.get("/conversations/:conversationId/poll", guard, ctrl.pollMessages);
    });
}
