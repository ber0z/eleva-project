import { FastifyInstance } from "fastify";
import { EvolutionController } from "../controllers/evolutionController";
import { authMiddleware, requireSubject } from "../middlewares/authGuard";

export async function evolutionRoutes(fastify: FastifyInstance) {
  const evolutionController = new EvolutionController();

  fastify.addHook("preHandler", authMiddleware);


  
  fastify.post("/", { preHandler: [requireSubject("user")] }, evolutionController.createEvolution.bind(evolutionController));
  fastify.get("/all", { preHandler: [requireSubject("user")] }, evolutionController.getAllEvolutions.bind(evolutionController));
  fastify.get("/:id",{ preHandler: [requireSubject("user")] }, evolutionController.getEvolution.bind(evolutionController));
  fastify.put('/:id', { preHandler: [requireSubject("user")] },evolutionController.updateEvolution.bind(evolutionController));
  fastify.delete('/:id', { preHandler: [requireSubject("user")] },evolutionController.deleteEvolution.bind(evolutionController));
  fastify.get("/compare/:evo1Id/:evo2Id", { preHandler: [requireSubject("user")] },evolutionController.compareEvolutions.bind(evolutionController));
  fastify.get("/last-two",{ preHandler: [requireSubject("user")] }, evolutionController.getLastTwoEvolutions.bind(evolutionController));
  fastify.get("/last", { preHandler: [requireSubject("user")] }, evolutionController.getLastEvolutions.bind(evolutionController));




}
    