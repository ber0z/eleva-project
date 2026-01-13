import { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { adminSchema, toggleBlockSchema,   type AdminCreateDTO } from "../schemas/adminSchema";
import { AdminService } from "../services/adminService";

export class AdminController {
  private adminService = new AdminService();

 
  async  createAdmin(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data: AdminCreateDTO = adminSchema.parse(request.body);
      const created = await this.adminService.createAdmin({
        name: data.name,
        roles: data.roles,
        profilePicture: data.profilePicture,
        isActive: data.isActive,
        auth: { email: data.email, password: data.password },
      });
      return reply.code(201).send(created);
    } catch (error: unknown) {
      return handle(reply, error, "Erro ao criar admin com auth");
    }
  };

  async getMe(req: FastifyRequest, reply: FastifyReply) {
    try {
      if (!req.auth) {
        return reply.code(401).send({ error: "Não autenticado" });
      }
      const adminId = req.auth.subjectId;
      
      const admin = await this.adminService.getById(adminId);    

      if (!admin) return reply.code(404).send({ error: "Admin não encontrado" });

      return reply.code(200).send(admin);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: "Dados inválidos", details: error.issues });
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        return reply.code(500).send({ error: "Erro Prisma", code: error.code });
      }
      return reply.code(500).send({ error: "Erro ao buscar admin" });
    }
  }

  
async toggleBlock(req: FastifyRequest, reply: FastifyReply) {
    const { subjectType, subjectId } = toggleBlockSchema.parse(req.params);
    const r = await this.adminService.toggleBlockSubject(subjectType, subjectId);
    return reply.send(r);
  }


  // async updateMe(req: FastifyRequest, reply: FastifyReply) {
  //   try {
  //     if (!req.auth) {
  //       return reply.code(401).send({ error: "Não autenticado" });
  //     }
  //     const adminId = req.auth.subjectId;

  //     const data = adminUpdateSchema.parse(req.body);
  //     const updated = await this.adminService.update(adminId, data);

  //     return reply.code(200).send(updated);
  //   } catch (error: unknown) {
  //     if (error instanceof ZodError) {
  //       return reply.code(400).send({ error: "Dados inválidos", details: error.issues });
  //     }
  //     if (error instanceof Prisma.PrismaClientKnownRequestError) {
  //       if (error.code === "P2002") {
  //         return reply.code(409).send({ error: "Conflito: valor único já existente (ex.: email)" });
  //       }
  //       if (error.code === "P2025") {
  //         return reply.code(404).send({ error: "Admin não encontrado para atualização" });
  //       }
  //     }
  //     return reply.code(500).send({ error: "Erro ao atualizar admin" });
  //   }
  // }


  // async deleteMe(req: FastifyRequest, reply: FastifyReply) {
  //   try {
  //     if (!req.auth) {
  //       return reply.code(401).send({ error: "Não autenticado" });
  //     }
  //     const adminId = req.auth.subjectId;

  //     await this.adminService.delete(adminId);
  //     return reply.code(204).send();
  //   } catch (error: unknown) {
  //     if (error instanceof ZodError) {
  //       return reply.code(400).send({ error: "Parâmetros inválidos", details: error.issues });
  //     }
  //     if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
  //       return reply.code(404).send({ error: "Admin não encontrado para remoção" });
  //     }
  //     return reply.code(500).send({ error: "Erro ao remover admin" });
  //   }
  // }

}




function handle(reply: FastifyReply, error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    return reply.code(400).send({ error: "Dados inválidos", details: error.issues });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return reply.code(409).send({ error: "Conflito de dados únicos", details: error.meta });
    }
  }
  const message = error instanceof Error ? error.message : "Erro desconhecido";
  return reply.code(500).send({ error: fallback, details: message });
}
