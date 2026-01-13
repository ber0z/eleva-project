import { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { professionalSchema } from "../schemas/professionalSchema";
import { ProfessionalService } from "../services/professionalService";
import { Prisma } from "@prisma/client";

export class ProfessionalController {
    private professionalService = new ProfessionalService();

    createProfessional = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const data = professionalSchema.parse(request.body);

            const created = await this.professionalService.createProfessional({
                name: data.name,
                email: data.email,
                password: data.password,
                roles: data.roles,
                profilePicture: data.profilePicture,
                bio: data.bio,
                crefNumber: data.crefNumber,
                crnNumber: data.crnNumber,
                contactPhone: data.contactPhone,
                whatsapp: data.whatsapp,
                instagram: data.instagram,
            });

            return reply.code(201).send(created);
        } catch (error: unknown) {
            if (error instanceof ZodError) {
                return reply.code(400).send({ error: "Dados inválidos", details: error.issues });
            }

            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                // P2002 = unique constraint (ajuste conforme seus índices únicos, se houver)
                if (error.code === "P2002") {
                    return reply.code(409).send({ error: "Conflito de dados únicos", details: error.meta });
                }
            }

            return reply.code(500).send({ error: "Erro ao criar professional", details: String(error) });
        }
    };
}
