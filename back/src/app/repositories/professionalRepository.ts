import { Prisma, Professional } from "@prisma/client";
import { prisma } from "../lib/prismaClient";

export type CreateProfessionalInput = {
    name: string;
    email: string;
    password: string;
    roles: ("trainer" | "nutritionist")[];
    profilePicture?: string | null;
    bio?: string | null;
    crefNumber?: string | null;
    crnNumber?: string | null;
    contactPhone?: string | null;
    whatsapp?: string | null;
    instagram?: string | null;
};

export type UpdateProfessionalInput = Partial<Omit<CreateProfessionalInput, "email" | "password">>;

export class ProfessionalRepository {
    async createProfessional(
        data: CreateProfessionalInput,
        tx?: Prisma.TransactionClient
    ): Promise<Professional> {
        const db = tx ?? prisma;
        return db.professional.create({
            data: {
                name: data.name,
                roles: data.roles as ("trainer" | "nutritionist")[],
                profilePicture: data.profilePicture ?? null,
                bio: data.bio ?? null,
                crefNumber: data.crefNumber ?? null,
                crnNumber: data.crnNumber ?? null,
                contactPhone: data.contactPhone ?? null,
                whatsapp: data.whatsapp ?? null,
                instagram: data.instagram ?? null,
            },
        });
    }

    async findById(
        id: number,
        tx?: Prisma.TransactionClient
    ): Promise<Professional | null> {
        const db = tx ?? prisma;
        return db.professional.findUnique({ where: { id } });
    }

    async updateById(
        id: number,
        data: UpdateProfessionalInput,
        tx?: Prisma.TransactionClient
    ): Promise<Professional> {
        const db = tx ?? prisma;
        return db.professional.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.roles !== undefined && { roles: data.roles }),
                ...(data.profilePicture !== undefined && { profilePicture: data.profilePicture }),
                ...(data.bio !== undefined && { bio: data.bio }),
                ...(data.crefNumber !== undefined && { crefNumber: data.crefNumber }),
                ...(data.crnNumber !== undefined && { crnNumber: data.crnNumber }),
                ...(data.contactPhone !== undefined && { contactPhone: data.contactPhone }),
                ...(data.whatsapp !== undefined && { whatsapp: data.whatsapp }),
                ...(data.instagram !== undefined && { instagram: data.instagram }),
            },
        });
    }

    async findByIdWithCounts(
        id: number,
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? prisma;
        return db.professional.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        links: true,
                        invites: true,
                        dietsAuthored: true,
                        trainingsAuthored: true,
                    },
                },
            },
        });
    }
}
