import { FastifyInstance } from "fastify";
import { ProfessionalController } from "../controllers/professionalController";

export async function professionalRoutes(fastify: FastifyInstance) {
  const professionalController = new ProfessionalController();

  // POST /professionals
  fastify.post("/", professionalController.createProfessional);
}
 