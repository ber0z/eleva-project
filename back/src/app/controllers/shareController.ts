// src/app/controllers/shareController.ts
import { FastifyReply, FastifyRequest } from "fastify";
import { ShareLinkService } from "../services/shareService";
import { paramsSchema, shareProfileCreateBody, TokenOrUsername, shareEvolutionCreateBody, shareTokenParams, createCompareShareBody } from "../schemas/shareSchema";


export class ShareController {
  private shareLinkService = new ShareLinkService();

  //share link management
   async listMyLinks(req: FastifyRequest, reply: FastifyReply) {
    try {
      if (!req.auth || req.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário autenticado" });
      }

      const ownerId = Number(req.auth.subjectId);

      const items = await this.shareLinkService.listMyShareLinks( ownerId );

      return reply.code(200).send( items ); 
    } catch (err) {
      return reply.code(400).send({
        error: err instanceof Error ? err.message : "Falha ao listar links",
      });
    }
  }
  async deleteMyLink(req: FastifyRequest, reply: FastifyReply) {
    try {
      if (!req.auth || req.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário autenticado" });
      }
      const ownerId = Number(req.auth.subjectId);
      const { id } = paramsSchema.parse(req.params);

      const result = await this.shareLinkService.deleteMyShareLink(ownerId, id);
      return reply.code(result.status).send(result.body);
    } catch (err) {
      return reply
        .code(400)
        .send({ error: err instanceof Error ? err.message : "Falha ao excluir compartilhamento" });
    }
  }


  //share profile link
 async shareProfile(req: FastifyRequest, reply: FastifyReply) {
    try {
      if (!req.auth || req.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário autenticado" });
      }
      const ownerId = Number(req.auth.subjectId);

      const { ttlMinutes = 60, images = true } = shareProfileCreateBody.parse(req.body ?? {});

      const result = await this.shareLinkService.createProfileShareLink({
        ownerId,
        ttlMinutes,
        includeImages: images,
      });

      return reply.code(200).send(result);
    } catch (err) {
      return reply.code(400).send({
        error: err instanceof Error ? err.message : "Falha ao gerar link",
      });
    }
  }

  async resolveProfile(
    req: FastifyRequest<{ Params: { tokenOrUsername: string } }>,
    reply: FastifyReply
  ) {
    try {
      const params = TokenOrUsername.parse(req.params);
      const result = await this.shareLinkService.resolveProfileShare(params); 
      return reply.code(result.status).send(result.body);
    } catch {
      return reply.code(400).send({ error: "Invalid input" });
    }
  }


  //share evolution link
  async shareEvolution(req: FastifyRequest, reply: FastifyReply) {
    try {
      if (!req.auth || req.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário autenticado" });
      }
      const ownerId = Number(req.auth.subjectId);


      const { evolutionId, ttlMinutes, images } = shareEvolutionCreateBody.parse(req.body ?? {});

      const result = await this.shareLinkService.createEvolutionShareLink({
        ownerId,
        evolutionId,
        ttlMinutes,
        includeImages: images,
      });

      return reply.code(200).send(result);
    } catch (err) {
      return reply
        .code(400)
        .send({ error: err instanceof Error ? err.message : "Falha ao gerar link" });
    }
  }

  async resolveEvolution(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { token } = shareTokenParams.parse(req.params);
      
      const result = await this.shareLinkService.resolveEvolutionShare(token);
      return reply.code(result.status).send(result.body);
    } catch {
      return reply.code(400).send({ error: "Invalid input" });
    }
  }

  //share compare link
  async shareCompare(req: FastifyRequest, reply: FastifyReply) {
    try {
      if (!req.auth || req.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário autenticado" });
      }
      const ownerId = Number(req.auth.subjectId);

      const body = createCompareShareBody.parse(req.body ?? {});
      const result = await this.shareLinkService.createCompareShareLink({ ownerId, ...body });

      return reply.code(200).send(result);
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : "Falha ao gerar link" });
    }
  }

  async resolveCompare(
    req: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      const { token } = shareTokenParams.parse(req.params);
      const result = await this.shareLinkService.resolveCompareShare(token);
      return reply.code(result.status).send(result.body);
    } catch {
      return reply.code(400).send({ error: "Invalid input" });
    }
  }
 


}
