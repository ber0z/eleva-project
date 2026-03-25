import { FastifyInstance } from "fastify";
import { userRoutes } from "./userRoutes";
import { authenticationRoutes } from "./authRoutes";
import { evolutionRoutes } from "./evolutionRoutes";
import { shareRoutes } from "./shareRoutes";
import { professionalRoutes } from "./professionalRoutes";
import { inviteRoutes } from "./inviteRoutes";
import { adminRoutes } from "./adminRoutes";
import { exerciseRoutes } from "./exerciseRoutes";
import { physicalActivityRoutes } from "./physicalActivityRoutes";
import { sleepRoutes } from "./sleepRoutes";
import { trainingRoutes } from "./trainingRoutes";
import { dietRoutes } from "./dietRoutes";
import { mealLogRoutes } from "./mealLogRoutes";
import { reportRoutes } from "./reportRoutes";
import { aiRoutes } from "../modules/ai/routes/ai.routes";
import { anamnesisRoutes } from "./anamnesisRoutes";
import { chatRoutes } from "./chatRoutes";

export async function registerRoutes(fastify: FastifyInstance) {

  await fastify.register(authenticationRoutes, { prefix: "/auth" });
  await fastify.register(professionalRoutes, { prefix: "/professional" });
  await fastify.register(inviteRoutes, { prefix: "/invite" });
  await fastify.register(adminRoutes, { prefix: "/admin" });
  await fastify.register(shareRoutes, { prefix: "/share" });
  await fastify.register(sleepRoutes, { prefix: "/sleep" });
  await fastify.register(trainingRoutes, { prefix: "/training" });
  await fastify.register(dietRoutes, { prefix: "/diet" });
  await fastify.register(mealLogRoutes, { prefix: "/meal-log-day" });
  await fastify.register(reportRoutes, { prefix: "/report" });
  await fastify.register(exerciseRoutes, { prefix: "/exercise" });
  await fastify.register(physicalActivityRoutes, { prefix: "/physical-activities" });
  await fastify.register(userRoutes, { prefix: "/user" });
  await fastify.register(evolutionRoutes, { prefix: "/evolution" });

  await fastify.register(aiRoutes, { prefix: "/ai" });
  await fastify.register(anamnesisRoutes, { prefix: "/anamnesis" });
  await fastify.register(chatRoutes, { prefix: "/chat" });

}
