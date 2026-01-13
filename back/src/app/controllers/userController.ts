import { FastifyRequest, FastifyReply } from "fastify";
import { UserService } from "../services/userService";
import { userSchema, userUpdateSchema, listUsersQuerySchema, usernameSchema } from "../schemas/userSchema";
import { Prisma } from "@prisma/client";
import { ZodError, z } from "zod";
import fs from "fs/promises";
import type { MultipartFile } from "@fastify/multipart";


function isImageMime(m?: string): boolean {
  return !!m && m.startsWith("image/");
}

interface SavedFile extends MultipartFile {
  filepath: string; // caminho do tmp criado por saveRequestFiles()
}





// type FormDataBody = {
//   name?: { value: string };
//   birthDate?: { value: string };
//   gender?: { value: string };
//   photo?: { value: Buffer };
//   deletePhoto?: { value: string }
// };

type UserUpdateDTO = z.infer<typeof userUpdateSchema>; // { name?: string; birthDate?: string; gender?: string; deletePhoto?: boolean }

function fieldToPrimitive(input: unknown): unknown {
  if (Array.isArray(input)) {
    return fieldToPrimitive(input[0]);
  }
  if (input && typeof input === "object" && "value" in (input as Record<string, unknown>)) {
    return (input as Record<string, unknown>).value;
  }
  return input; // já é string/boolean/undefined etc.
}

export class UserController {

  private userService = new UserService();

  async createUser(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = userSchema.parse(request.body);

      const created = await this.userService.createUser({
        name: data.name,
        birthDate: new Date(data.birthDate),
        gender: data.gender,
        email: data.email,
        password: data.password,
        preset: data.preset, // opcional
      });

      return reply.code(201).send(created);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: "Dados inválidos", details: error.issues });
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          return reply.code(409).send({ error: "E-mail já registrado" });
        }
      }
      if (error instanceof Prisma.PrismaClientValidationError) {
        // <- MOSTRA o detalhe do que o Prisma não aceitou
        return reply.code(400).send({ error: "Payload inválido para criação", message: error.message });
      }
      const msg = error instanceof Error ? error.message : "Erro desconhecido";
      return reply.code(500).send({ error: "Erro ao registrar usuário", details: msg });
    }
  }

  async getMe(req: FastifyRequest, reply: FastifyReply) {
    try {
      if (!req.auth || req.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário pode acessar" });
      }
      const user = await this.userService.getUserById(req.auth.subjectId);
      if (!user) return reply.code(404).send({ error: "Usuário não encontrado" });
      return reply.code(200).send(user);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: "Dados inválidos", details: error.issues });
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        return reply.code(500).send({ error: "Erro Prisma", code: error.code });
      }
      return reply.code(500).send({ error: "Erro ao buscar usuário" });
    }
  };

  async getAll(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { page, perPage, q, sortBy, order } = listUsersQuerySchema.parse(
        req.query
      );
      const skip = (page - 1) * perPage;
      const take = perPage;

      const { rows, total } = await this.userService.listUsers({
        q,
        skip,
        take,
        orderBy: { [sortBy]: order } as Prisma.UserOrderByWithRelationInput,
      });

      return reply.code(200).send({
        data: rows,
        meta: {
          page,
          perPage,
          total,
          totalPages: Math.ceil(total / perPage),
          hasNextPage: page * perPage < total,
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: "Parâmetros inválidos", details: error.issues });
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        return reply.code(500).send({ error: "Erro Prisma", code: error.code });
      }
      return reply.code(500).send({ error: "Erro ao listar usuários" });
    }
  };

  async updateMe(req: FastifyRequest, reply: FastifyReply) {
    try {
      if (!req.auth || req.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário autenticado pode atualizar o próprio perfil" });
      }
      const userId = Number(req.auth.subjectId);

      let photoBuffer: Buffer | undefined;
      let updateData: UserUpdateDTO;

      const isMulti = typeof req.isMultipart === "function" && req.isMultipart();

      if (isMulti) {
        const files = (await req.saveRequestFiles()) as SavedFile[];

        // ✅ inclua username e isProfilePublic aqui
        const body = req.body as Record<string, unknown>;
        const normalized = {
          name: fieldToPrimitive(body.name),
          birthDate: fieldToPrimitive(body.birthDate),
          gender: fieldToPrimitive(body.gender),
          deletePhoto: fieldToPrimitive(body.deletePhoto),
          username: fieldToPrimitive(body.username),        // <- novo
          isProfilePublic: fieldToPrimitive(body.isProfilePublic), // <- novo
          isProfileImagesPublic: fieldToPrimitive(body.isProfileImagesPublic), // <- novo
        };

        updateData = userUpdateSchema.parse(normalized); 
        

        const photoFile = files.find((f) => f.fieldname === "photo");
        try {
          if (photoFile) {
            if (!isImageMime(photoFile.mimetype)) {
              await fs.unlink(photoFile.filepath).catch(() => { });
              return reply.code(400).send({ error: "Arquivo de foto inválido" });
            }
            photoBuffer = await fs.readFile(photoFile.filepath);
          }
        } finally {
          await Promise.all(files.map((f) => fs.unlink(f.filepath).catch(() => { })));
        }
      } else {
        updateData = userUpdateSchema.parse(req.body);
      }

      const updatedUser = await this.userService.updateUser(userId, updateData, photoBuffer);
      return reply.code(200).send(updatedUser);
    } catch (err) {
      // conflito de username
      if (err instanceof Error && err.message === "USERNAME_TAKEN") {
        return reply.code(409).send({ error: "Username já está em uso" });
      }
      if (err instanceof ZodError) {
        return reply.status(400).send({ error: "Dados inválidos", details: err.issues });
      }
      req.log.error({ err }, "Erro ao atualizar usuário");
      return reply.status(500).send({ error: "Falha ao atualizar usuário" });
    }
  }

  async getMyProfilePhoto(req: FastifyRequest, reply: FastifyReply) {
    console.log(req.auth);

    if (!req.auth || req.auth.subjectType !== "user") {
      return reply.code(403).send({ error: "Apenas usuário autenticado" });
    }
    const userId = Number(req.auth.subjectId);

    const result = await this.userService.getProfilePhotoUrl(userId);
    if (!result) return reply.code(404).send({ error: "Foto de perfil não encontrada" });
    return reply.send(result); // { url, expiresAt }
  }

  async getGoalAndHeight(req: FastifyRequest, reply: FastifyReply) {
    try {
      if (!req.auth || req.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário pode acessar" });
      }
      const idUser = req.auth.subjectId;
      const data = await this.userService.getGoalAndHeightForUser(idUser);
      return reply.code(200).send(data);
    } catch {
      return reply.code(500).send({ error: "Erro ao buscar dados" });
    }
  };

  async getUsernameAvailability(req: FastifyRequest, reply: FastifyReply) {
    try {
      if (!req.auth || req.auth.subjectType !== "user") {
        return reply.code(403).send({ error: "Apenas usuário pode acessar" });
      }
      const { username } = usernameSchema.parse(req.params);
      const isAvailable = await this.userService.isUsernameAvailable(username);
      return reply.code(200).send({ username, isAvailable });
    } catch {
      return reply.code(500).send({ error: "Erro ao verificar disponibilidade" });
    }
  }


}
