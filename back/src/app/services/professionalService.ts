import { prisma } from "../lib/prismaClient";
import { ProfessionalRepository, CreateProfessionalInput, UpdateProfessionalInput } from "../repositories/professionalRepository";
import { AuthenticationRepository, CreateAuthenticationDTO } from "../repositories/authenticationRepository";
import { ProfessionalLinkRepository } from "../repositories/professionalLinkRepository";
import { ProfessionalInviteRepository } from "../repositories/professionalInviteRepository";
import { NotificationService } from "./notificationService";
import { hashPassword } from "../utils/passwordUtils";
import { generateInviteCode, generateInviteToken, sendInviteEmail } from "../utils/inviteEmailUtils";
import { NotFoundError, ConflictError } from "../errors/appErrors";
import { presignR2Get, deleteR2Keys } from "./r2Service";
import { uploadProfessionalProfilePhotoR2, presignR2GetUrlByKey } from "./uploadService";
import { ImageService } from "./imageService";
import { Professional, LinkPermission, LinkStatus, InviteStatus } from "@prisma/client";

async function presignProfilePicture<T extends { user: { profilePicture: string | null } }>(item: T): Promise<T> {
    if (item.user.profilePicture) {
        item.user.profilePicture = await presignR2Get(item.user.profilePicture, 900);
    }
    return item;
}

export class ProfessionalService {
    private professionalRepository = new ProfessionalRepository();
    private authRepository = new AuthenticationRepository();
    private linkRepository = new ProfessionalLinkRepository();
    private inviteRepository = new ProfessionalInviteRepository();
    private notificationService = new NotificationService();

    // ===================== Criação =====================

    async createProfessional(data: CreateProfessionalInput): Promise<Professional> {
        return prisma.$transaction(async (tx) => {
            const professional = await this.professionalRepository.createProfessional(data, tx);
            const passwordHash = await hashPassword(data.password);

            const authData: CreateAuthenticationDTO = {
                subjectType: "professional",
                idProfessional: professional.id,
                email: data.email,
                password: passwordHash,
                refreshToken: "",
                lastAccess: new Date(),
            };

            await this.authRepository.createAuthentication(authData, tx);
            return professional;
        });
    }

    // ===================== Perfil =====================

    async getProfile(professionalId: number): Promise<Professional> {
        const professional = await this.professionalRepository.findById(professionalId);
        if (!professional) throw new NotFoundError("Profissional não encontrado");
        return professional;
    }

    async updateProfile(professionalId: number, data: UpdateProfessionalInput, photoBuffer?: Buffer): Promise<Professional> {
        const existing = await this.getProfile(professionalId);
        let oldKeyToDelete: string | null = null;

        if (photoBuffer) {
            const processed = await ImageService.processImage(photoBuffer, 70 * 1024, 800, 800);
            const newKey = await uploadProfessionalProfilePhotoR2({ professionalId, buffer: processed });
            if (existing.profilePicture) oldKeyToDelete = existing.profilePicture;
            data.profilePicture = newKey;
        }

        const updated = await this.professionalRepository.updateById(professionalId, data);

        if (oldKeyToDelete) {
            const failed = await deleteR2Keys([oldKeyToDelete]);
            if (failed.length) console.warn("[R2] falha ao deletar foto antiga do profissional:", failed);
        }

        return updated;
    }

    async getProfilePhotoUrl(professionalId: number, ttlSeconds = 300): Promise<{ url: string; expiresAt: string } | null> {
        const professional = await this.professionalRepository.findById(professionalId);
        if (!professional?.profilePicture) return null;
        return presignR2GetUrlByKey(professional.profilePicture, ttlSeconds);
    }

    // ===================== Clientes (Links) =====================

    async listClients(
        professionalId: number,
        filters: { status?: LinkStatus },
        pagination: { page: number; perPage: number }
    ) {
        const skip = (pagination.page - 1) * pagination.perPage;
        const [data, total] = await Promise.all([
            this.linkRepository.findByProfessionalId(professionalId, filters, { skip, take: pagination.perPage }),
            this.linkRepository.countByProfessionalId(professionalId, filters),
        ]);
        await Promise.all(data.map(presignProfilePicture));
        return {
            data,
            meta: {
                page: pagination.page,
                perPage: pagination.perPage,
                total,
                totalPages: Math.ceil(total / pagination.perPage),
            },
        };
    }

    async getClient(professionalId: number, userId: number) {
        const link = await this.linkRepository.findByProfessionalAndUser(professionalId, userId);
        if (!link) throw new NotFoundError("Vínculo não encontrado");
        return presignProfilePicture(link);
    }

    async updateClientPermissions(professionalId: number, userId: number, permissions: LinkPermission[]) {
        const link = await this.linkRepository.findByProfessionalAndUser(professionalId, userId);
        if (!link) throw new NotFoundError("Vínculo não encontrado");
        if (link.status !== "accepted") {
            throw new Error("Só é possível alterar permissões de vínculos aceitos");
        }

        return prisma.$transaction(async (tx) => {
            const updated = await this.linkRepository.setPendingPermissions(professionalId, userId, permissions, tx);
            await this.notificationService.createForUser(
                userId,
                {
                    type: "permissions_updated",
                    title: "Alteração de permissões",
                    body: "Seu profissional solicitou alteração de permissões. Acesse para aprovar.",
                    data: { permissions, professionalId },
                    actorProfessionalId: professionalId,
                },
                tx
            );
            return updated;
        });
    }

    async revokeClient(professionalId: number, userId: number) {
        const link = await this.linkRepository.findByProfessionalAndUser(professionalId, userId);
        if (!link) throw new NotFoundError("Vínculo não encontrado");
        if (link.status === "revoked") {
            throw new Error("Vínculo já foi revogado");
        }

        return prisma.$transaction(async (tx) => {
            const revoked = await this.linkRepository.revokeLink(professionalId, userId, tx);
            await this.notificationService.createForUser(
                userId,
                {
                    type: "link_revoked",
                    title: "Vínculo encerrado",
                    body: "Seu vínculo com um profissional foi encerrado.",
                    actorProfessionalId: professionalId,
                },
                tx
            );
            return revoked;
        });
    }

    // ===================== Convites =====================

    async sendInvite(
        professionalId: number,
        data: {
            inviteeEmail?: string;
            inviteePhone?: string;
            message?: string;
            permissions: LinkPermission[];
        }
    ) {
        const existing = await this.inviteRepository.findExistingPending(
            professionalId,
            data.inviteeEmail,
            data.inviteePhone
        );
        if (existing) {
            throw new ConflictError("Já existe um convite pendente para este contato");
        }

        const code = generateInviteCode();
        const token = generateInviteToken();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

        // Buscar userId se email corresponde a um usuário existente
        let userId: number | null = null;
        if (data.inviteeEmail) {
            const auth = await this.authRepository.findAuthenticationByEmail(data.inviteeEmail);
            if (auth?.idUser) userId = auth.idUser;
        }

        const invite = await prisma.$transaction(async (tx) => {
            const created = await this.inviteRepository.create(
                {
                    professionalId,
                    inviteeEmail: data.inviteeEmail ?? null,
                    inviteePhone: data.inviteePhone ?? null,
                    userId,
                    code,
                    token,
                    expiresAt,
                    message: data.message ?? null,
                    permissions: data.permissions,
                },
                tx
            );

            // Notificar usuário se já existe na plataforma
            if (userId) {
                await this.notificationService.createForUser(
                    userId,
                    {
                        type: "invite_created",
                        title: "Novo convite recebido",
                        body: "Um profissional convidou você para ser seu aluno(a).",
                        actorProfessionalId: professionalId,
                    },
                    tx
                );
            }

            return created;
        });

        // Enviar email fora da transação
        if (data.inviteeEmail) {
            const professional = await this.professionalRepository.findById(professionalId);
            sendInviteEmail(data.inviteeEmail, {
                professionalName: professional?.name ?? "Profissional",
                code,
                message: data.message,
            }).catch((err) => {
                console.error("[InviteEmail] falha ao enviar:", err);
            });
        }

        return invite;
    }

    async listInvites(
        professionalId: number,
        filters: { status?: InviteStatus },
        pagination: { page: number; perPage: number }
    ) {
        const skip = (pagination.page - 1) * pagination.perPage;
        const [data, total] = await Promise.all([
            this.inviteRepository.findByProfessionalId(professionalId, filters, { skip, take: pagination.perPage }),
            this.inviteRepository.countByProfessionalId(professionalId, filters),
        ]);
        return {
            data,
            meta: {
                page: pagination.page,
                perPage: pagination.perPage,
                total,
                totalPages: Math.ceil(total / pagination.perPage),
            },
        };
    }

    async getInvite(professionalId: number, inviteId: number) {
        const invite = await this.inviteRepository.findById(inviteId);
        if (!invite || invite.professionalId !== professionalId) {
            throw new NotFoundError("Convite não encontrado");
        }
        return invite;
    }

    async cancelInvite(professionalId: number, inviteId: number) {
        const invite = await this.inviteRepository.findById(inviteId);
        if (!invite || invite.professionalId !== professionalId) {
            throw new NotFoundError("Convite não encontrado");
        }
        if (invite.status !== "pending") {
            throw new Error("Só é possível cancelar convites pendentes");
        }
        return this.inviteRepository.updateStatus(inviteId, "cancelled");
    }

    async acceptInvite(token: string, userId: number) {
        return prisma.$transaction(async (tx) => {
            const invite = await this.inviteRepository.findByToken(token, tx);
            if (!invite) throw new NotFoundError("Convite não encontrado");
            if (invite.status !== "pending") {
                throw new Error("Este convite não está mais pendente");
            }
            if (invite.expiresAt && invite.expiresAt < new Date()) {
                await this.inviteRepository.updateStatus(invite.id, "expired", undefined, tx);
                throw new Error("Este convite expirou");
            }

            // Atualizar convite
            await this.inviteRepository.updateStatus(
                invite.id,
                "accepted",
                { acceptedAt: new Date(), userId },
                tx
            );

            // Verificar se já existe vínculo
            const existingLink = await this.linkRepository.findByProfessionalAndUser(
                invite.professionalId,
                userId,
                tx
            );
            if (existingLink && existingLink.status === "accepted") {
                throw new ConflictError("Você já possui vínculo ativo com este profissional");
            }

            // Criar ou reativar vínculo
            if (existingLink) {
                await this.linkRepository.updatePermissions(
                    invite.professionalId,
                    userId,
                    invite.permissions,
                    tx
                );
            } else {
                await this.linkRepository.createLink(
                    {
                        professionalId: invite.professionalId,
                        userId,
                        status: "accepted",
                        permissions: invite.permissions,
                    },
                    tx
                );
            }

            // Notificar profissional
            await this.notificationService.createForProfessional(
                invite.professionalId,
                {
                    type: "invite_accepted",
                    title: "Convite aceito",
                    body: "Um aluno aceitou seu convite!",
                    actorUserId: userId,
                },
                tx
            );

            return { message: "Convite aceito com sucesso" };
        });
    }

    async declineInvite(token: string, userId: number) {
        const invite = await this.inviteRepository.findByToken(token);
        if (!invite) throw new NotFoundError("Convite não encontrado");
        if (invite.status !== "pending") {
            throw new Error("Este convite não está mais pendente");
        }
        if (invite.expiresAt && invite.expiresAt < new Date()) {
            await this.inviteRepository.updateStatus(invite.id, "expired");
            throw new Error("Este convite expirou");
        }
        return this.inviteRepository.updateStatus(invite.id, "declined", { userId });
    }

    // ===================== Dashboard =====================

    async getDashboard(professionalId: number) {
        await this.getProfile(professionalId);

        const [
            activeClients,
            pendingClients,
            pendingInvites,
            dietsAuthored,
            trainingsAuthored,
            unreadNotifications,
        ] = await Promise.all([
            this.linkRepository.countByProfessionalId(professionalId, { status: "accepted" }),
            this.linkRepository.countByProfessionalId(professionalId, { status: "pending" }),
            this.inviteRepository.countPendingByProfessional(professionalId),
            prisma.diet.count({ where: { idProfessional: professionalId } }),
            prisma.training.count({ where: { idProfessional: professionalId } }),
            this.notificationService.countUnread(professionalId),
        ]);

        return {
            activeClients,
            pendingClients,
            pendingInvites,
            dietsAuthored,
            trainingsAuthored,
            unreadNotifications,
        };
    }
}

