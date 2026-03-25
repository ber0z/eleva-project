import { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import fs from "fs/promises";
import type { MultipartFile } from "@fastify/multipart";
import {
    professionalSchema,
    professionalUpdateSchema,
    createInviteSchema,
    updatePermissionsSchema,
    listClientsQuerySchema,
    listInvitesQuerySchema,
    listNotificationsQuerySchema,
    inviteTokenSchema,
} from "../schemas/professionalSchema";
import { ProfessionalService } from "../services/professionalService";
import { NotificationService } from "../services/notificationService";
import { NotFoundError, ConflictError } from "../errors/appErrors";

function isImageMime(m?: string): boolean {
    return !!m && m.startsWith("image/");
}

interface SavedFile extends MultipartFile {
    filepath: string;
}

function fieldToPrimitive(input: unknown): unknown {
    if (Array.isArray(input)) return fieldToPrimitive(input[0]);
    if (input && typeof input === "object" && "value" in (input as Record<string, unknown>)) {
        return (input as Record<string, unknown>).value;
    }
    return input;
}

export class ProfessionalController {
    private service = new ProfessionalService();
    private notificationService = new NotificationService();

    // ===================== Criação (público) =====================

    createProfessional = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const data = professionalSchema.parse(request.body);
            const created = await this.service.createProfessional({
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
            return this.handleError(error, reply, "Erro ao criar profissional");
        }
    };

    // ===================== Perfil =====================

    getMe = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const professionalId = request.auth!.subjectId;
            const professional = await this.service.getProfile(professionalId);
            return reply.code(200).send(professional);
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao buscar perfil");
        }
    };

    updateMe = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const professionalId = request.auth!.subjectId;
            let photoBuffer: Buffer | undefined;
            let updateData;

            const isMulti = typeof request.isMultipart === "function" && request.isMultipart();

            if (isMulti) {
                const files = (await request.saveRequestFiles()) as SavedFile[];
                const body = request.body as Record<string, unknown>;

                const normalized: Record<string, unknown> = {};
                for (const key of ["name", "bio", "crefNumber", "crnNumber", "contactPhone", "whatsapp", "instagram"]) {
                    const val = fieldToPrimitive(body[key]);
                    if (val !== undefined) normalized[key] = val;
                }
                // roles vem como string JSON no multipart
                const rawRoles = fieldToPrimitive(body.roles);
                if (rawRoles) {
                    try {
                        normalized.roles = typeof rawRoles === "string" ? JSON.parse(rawRoles) : rawRoles;
                    } catch {
                        normalized.roles = rawRoles;
                    }
                }

                updateData = professionalUpdateSchema.parse(normalized);

                const photoFile = files.find((f) => f.fieldname === "photo");
                try {
                    if (photoFile) {
                        if (!isImageMime(photoFile.mimetype)) {
                            await fs.unlink(photoFile.filepath).catch(() => {});
                            return reply.code(400).send({ error: "Arquivo de foto inválido" });
                        }
                        photoBuffer = await fs.readFile(photoFile.filepath);
                    }
                } finally {
                    await Promise.all(files.map((f) => fs.unlink(f.filepath).catch(() => {})));
                }
            } else {
                updateData = professionalUpdateSchema.parse(request.body);
            }

            const updated = await this.service.updateProfile(professionalId, updateData, photoBuffer);
            return reply.code(200).send(updated);
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao atualizar perfil");
        }
    };

    getMyProfilePhoto = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const professionalId = request.auth!.subjectId;
            const result = await this.service.getProfilePhotoUrl(professionalId);
            if (!result) return reply.code(404).send({ error: "Sem foto de perfil" });
            return reply.code(200).send(result);
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao buscar foto de perfil");
        }
    };

    // ===================== Dashboard =====================

    getDashboard = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const professionalId = request.auth!.subjectId;
            const dashboard = await this.service.getDashboard(professionalId);
            return reply.code(200).send(dashboard);
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao buscar dashboard");
        }
    };

    // ===================== Clientes =====================

    listClients = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const professionalId = request.auth!.subjectId;
            const query = listClientsQuerySchema.parse(request.query);
            const result = await this.service.listClients(
                professionalId,
                { status: query.status as any },
                { page: query.page, perPage: query.perPage }
            );
            return reply.code(200).send(result);
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao listar clientes");
        }
    };

    getClient = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const professionalId = request.auth!.subjectId;
            const userId = Number((request.params as any).userId);
            if (isNaN(userId)) return reply.code(400).send({ error: "userId inválido" });
            const link = await this.service.getClient(professionalId, userId);
            return reply.code(200).send(link);
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao buscar cliente");
        }
    };

    updateClientPermissions = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const professionalId = request.auth!.subjectId;
            const userId = Number((request.params as any).userId);
            if (isNaN(userId)) return reply.code(400).send({ error: "userId inválido" });
            const { permissions } = updatePermissionsSchema.parse(request.body);
            const updated = await this.service.updateClientPermissions(professionalId, userId, permissions);
            return reply.code(200).send(updated);
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao atualizar permissões");
        }
    };

    revokeClient = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const professionalId = request.auth!.subjectId;
            const userId = Number((request.params as any).userId);
            if (isNaN(userId)) return reply.code(400).send({ error: "userId inválido" });
            await this.service.revokeClient(professionalId, userId);
            return reply.code(200).send({ message: "Vínculo revogado com sucesso" });
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao revogar vínculo");
        }
    };

    // ===================== Convites =====================

    sendInvite = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const professionalId = request.auth!.subjectId;
            const data = createInviteSchema.parse(request.body);
            const invite = await this.service.sendInvite(professionalId, {
                inviteeEmail: data.inviteeEmail,
                inviteePhone: data.inviteePhone,
                message: data.message,
                permissions: data.permissions,
            });
            return reply.code(201).send(invite);
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao enviar convite");
        }
    };

    listInvites = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const professionalId = request.auth!.subjectId;
            const query = listInvitesQuerySchema.parse(request.query);
            const result = await this.service.listInvites(
                professionalId,
                { status: query.status as any },
                { page: query.page, perPage: query.perPage }
            );
            return reply.code(200).send(result);
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao listar convites");
        }
    };

    getInvite = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const professionalId = request.auth!.subjectId;
            const inviteId = Number((request.params as any).inviteId);
            if (isNaN(inviteId)) return reply.code(400).send({ error: "inviteId inválido" });
            const invite = await this.service.getInvite(professionalId, inviteId);
            return reply.code(200).send(invite);
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao buscar convite");
        }
    };

    cancelInvite = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const professionalId = request.auth!.subjectId;
            const inviteId = Number((request.params as any).inviteId);
            if (isNaN(inviteId)) return reply.code(400).send({ error: "inviteId inválido" });
            await this.service.cancelInvite(professionalId, inviteId);
            return reply.code(200).send({ message: "Convite cancelado" });
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao cancelar convite");
        }
    };

    // ===================== Aceitar/Recusar (user-facing) =====================

    acceptInvite = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const userId = request.auth!.subjectId;
            const { token } = inviteTokenSchema.parse(request.body);
            const result = await this.service.acceptInvite(token, userId);
            return reply.code(200).send(result);
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao aceitar convite");
        }
    };

    declineInvite = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const userId = request.auth!.subjectId;
            const { token } = inviteTokenSchema.parse(request.body);
            await this.service.declineInvite(token, userId);
            return reply.code(200).send({ message: "Convite recusado" });
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao recusar convite");
        }
    };

    // ===================== Notificações =====================

    listNotifications = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const professionalId = request.auth!.subjectId;
            const query = listNotificationsQuerySchema.parse(request.query);
            const result = await this.notificationService.listForProfessional(
                professionalId,
                { read: query.read },
                { page: query.page, perPage: query.perPage }
            );
            return reply.code(200).send(result);
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao listar notificações");
        }
    };

    markNotificationRead = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const professionalId = request.auth!.subjectId;
            const id = Number((request.params as any).id);
            if (isNaN(id)) return reply.code(400).send({ error: "id inválido" });
            await this.notificationService.markAsRead(id, professionalId);
            return reply.code(200).send({ message: "Notificação marcada como lida" });
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao marcar notificação");
        }
    };

    markAllNotificationsRead = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const professionalId = request.auth!.subjectId;
            await this.notificationService.markAllAsRead(professionalId);
            return reply.code(200).send({ message: "Todas as notificações marcadas como lidas" });
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao marcar notificações");
        }
    };

    // ===================== Error Handler =====================

    private handleError(error: unknown, reply: FastifyReply, defaultMessage: string) {
        if (error instanceof ZodError) {
            return reply.code(400).send({ error: "Dados inválidos", details: error.issues });
        }
        if (error instanceof NotFoundError) {
            return reply.code(404).send({ error: error.message });
        }
        if (error instanceof ConflictError) {
            return reply.code(409).send({ error: error.message });
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2002") {
                return reply.code(409).send({ error: "Conflito de dados únicos", details: error.meta });
            }
            if (error.code === "P2025") {
                return reply.code(404).send({ error: "Registro não encontrado" });
            }
        }
        return reply.code(500).send({ error: defaultMessage, details: String(error) });
    }
}
