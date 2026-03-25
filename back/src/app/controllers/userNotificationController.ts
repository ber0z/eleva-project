import { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import {
    listNotificationsQuerySchema,
    listClientsQuerySchema,
    inviteTokenSchema,
} from "../schemas/professionalSchema";
import { NotificationService } from "../services/notificationService";
import { ProfessionalService } from "../services/professionalService";
import { ProfessionalInviteRepository } from "../repositories/professionalInviteRepository";
import { ProfessionalLinkRepository } from "../repositories/professionalLinkRepository";
import { NotFoundError, ConflictError } from "../errors/appErrors";
import { prisma } from "../lib/prismaClient";
import { presignR2Get } from "../services/r2Service";

async function presignProfessionalPicture<T extends { professional: { profilePicture: string | null } }>(item: T): Promise<T> {
    if (item.professional.profilePicture) {
        item.professional.profilePicture = await presignR2Get(item.professional.profilePicture, 900);
    }
    return item;
}

export class UserNotificationController {
    private notificationService = new NotificationService();
    private professionalService = new ProfessionalService();
    private inviteRepo = new ProfessionalInviteRepository();
    private linkRepo = new ProfessionalLinkRepository();

    // ===================== Notificações =====================

    listNotifications = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const userId = request.auth!.subjectId;
            const query = listNotificationsQuerySchema.parse(request.query);
            const result = await this.notificationService.listForUser(
                userId,
                { read: query.read },
                { page: query.page, perPage: query.perPage }
            );
            return reply.code(200).send(result);
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao listar notificações");
        }
    };

    markAsRead = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const userId = request.auth!.subjectId;
            const id = Number((request.params as any).id);
            if (isNaN(id)) return reply.code(400).send({ error: "id inválido" });
            await this.notificationService.markAsReadForUser(id, userId);
            return reply.code(200).send({ message: "Notificação marcada como lida" });
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao marcar notificação");
        }
    };

    markAllAsRead = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const userId = request.auth!.subjectId;
            await this.notificationService.markAllAsReadForUser(userId);
            return reply.code(200).send({ message: "Todas as notificações marcadas como lidas" });
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao marcar notificações");
        }
    };

    countUnread = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const userId = request.auth!.subjectId;
            const count = await this.notificationService.countUnreadForUser(userId);
            return reply.code(200).send({ unreadCount: count });
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao contar notificações");
        }
    };

    // ===================== Convites =====================

    listPendingInvites = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const userId = request.auth!.subjectId;

            // Buscar email do user via Authentication
            const auth = await prisma.authentication.findFirst({
                where: { idUser: userId },
                select: { email: true },
            });
            if (!auth) return reply.code(404).send({ error: "Usuário não encontrado" });

            const query = listNotificationsQuerySchema.parse(request.query);
            const skip = (query.page - 1) * query.perPage;

            const [data, total] = await Promise.all([
                this.inviteRepo.findPendingByEmail(auth.email, { skip, take: query.perPage }),
                this.inviteRepo.countPendingByEmail(auth.email),
            ]);

            return reply.code(200).send({
                data,
                meta: {
                    page: query.page,
                    perPage: query.perPage,
                    total,
                    totalPages: Math.ceil(total / query.perPage),
                },
            });
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao listar convites");
        }
    };

    acceptInvite = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const userId = request.auth!.subjectId;
            const { token } = inviteTokenSchema.parse(request.body);
            const result = await this.professionalService.acceptInvite(token, userId);
            return reply.code(200).send(result);
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao aceitar convite");
        }
    };

    declineInvite = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const userId = request.auth!.subjectId;
            const { token } = inviteTokenSchema.parse(request.body);
            await this.professionalService.declineInvite(token, userId);
            return reply.code(200).send({ message: "Convite recusado" });
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao recusar convite");
        }
    };

    // ===================== Profissionais Conectados =====================

    listProfessionals = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const userId = request.auth!.subjectId;
            const query = listClientsQuerySchema.parse(request.query);
            const skip = (query.page - 1) * query.perPage;

            const [data, total] = await Promise.all([
                this.linkRepo.findByUserId(userId, { status: query.status as any }, { skip, take: query.perPage }),
                this.linkRepo.countByUserId(userId, { status: query.status as any }),
            ]);

            await Promise.all(data.map(presignProfessionalPicture));

            return reply.code(200).send({
                data,
                meta: {
                    page: query.page,
                    perPage: query.perPage,
                    total,
                    totalPages: Math.ceil(total / query.perPage),
                },
            });
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao listar profissionais");
        }
    };

    getProfessional = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const userId = request.auth!.subjectId;
            const professionalId = Number((request.params as any).professionalId);
            if (isNaN(professionalId)) return reply.code(400).send({ error: "professionalId inválido" });

            const link = await this.linkRepo.findByProfessionalAndUser(professionalId, userId);
            if (!link) throw new NotFoundError("Vínculo não encontrado");

            // Enrich with professional details
            const professional = await prisma.professional.findUnique({
                where: { id: professionalId },
                select: {
                    id: true,
                    name: true,
                    roles: true,
                    profilePicture: true,
                    bio: true,
                    crefNumber: true,
                    crnNumber: true,
                    contactPhone: true,
                    whatsapp: true,
                    instagram: true,
                },
            });

            if (professional?.profilePicture) {
                professional.profilePicture = await presignR2Get(professional.profilePicture, 900);
            }

            return reply.code(200).send({ ...link, professional });
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao buscar profissional");
        }
    };

    revokeProfessional = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const userId = request.auth!.subjectId;
            const professionalId = Number((request.params as any).professionalId);
            if (isNaN(professionalId)) return reply.code(400).send({ error: "professionalId inválido" });

            const link = await this.linkRepo.findByProfessionalAndUser(professionalId, userId);
            if (!link) throw new NotFoundError("Vínculo não encontrado");

            await prisma.$transaction(async (tx) => {
                await this.linkRepo.revokeLink(professionalId, userId, tx);
                await this.notificationService.createForProfessional(
                    professionalId,
                    {
                        type: "link_revoked",
                        title: "Vínculo revogado",
                        body: "Um usuário revogou o vínculo com você",
                        actorUserId: userId,
                    },
                    tx
                );
            });

            return reply.code(200).send({ message: "Vínculo revogado com sucesso" });
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao revogar vínculo");
        }
    };

    // ===================== Permissões Pendentes =====================

    approvePermissions = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const userId = request.auth!.subjectId;
            const professionalId = Number((request.params as any).professionalId);
            if (isNaN(professionalId)) return reply.code(400).send({ error: "professionalId inválido" });

            const link = await this.linkRepo.findByProfessionalAndUser(professionalId, userId);
            if (!link) throw new NotFoundError("Vínculo não encontrado");
            if (link.status !== "accepted") {
                return reply.code(400).send({ error: "Vínculo não está aceito" });
            }
            if (link.pendingPermissions.length === 0) {
                return reply.code(400).send({ error: "Não há permissões pendentes para aprovar" });
            }

            await prisma.$transaction(async (tx) => {
                await this.linkRepo.applyPendingPermissions(professionalId, userId, tx);
                await this.notificationService.createForProfessional(
                    professionalId,
                    {
                        type: "permissions_updated",
                        title: "Permissões aprovadas",
                        body: "O usuário aprovou a alteração de permissões.",
                        data: { permissions: link.pendingPermissions },
                        actorUserId: userId,
                    },
                    tx
                );
            });

            return reply.code(200).send({ message: "Permissões aprovadas com sucesso" });
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao aprovar permissões");
        }
    };

    rejectPermissions = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const userId = request.auth!.subjectId;
            const professionalId = Number((request.params as any).professionalId);
            if (isNaN(professionalId)) return reply.code(400).send({ error: "professionalId inválido" });

            const link = await this.linkRepo.findByProfessionalAndUser(professionalId, userId);
            if (!link) throw new NotFoundError("Vínculo não encontrado");
            if (link.pendingPermissions.length === 0) {
                return reply.code(400).send({ error: "Não há permissões pendentes para rejeitar" });
            }

            await prisma.$transaction(async (tx) => {
                await this.linkRepo.clearPendingPermissions(professionalId, userId, tx);
                await this.notificationService.createForProfessional(
                    professionalId,
                    {
                        type: "permissions_rejected",
                        title: "Permissões rejeitadas",
                        body: "O usuário rejeitou a alteração de permissões.",
                        data: { permissions: link.pendingPermissions },
                        actorUserId: userId,
                    },
                    tx
                );
            });

            return reply.code(200).send({ message: "Permissões rejeitadas" });
        } catch (error: unknown) {
            return this.handleError(error, reply, "Erro ao rejeitar permissões");
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
