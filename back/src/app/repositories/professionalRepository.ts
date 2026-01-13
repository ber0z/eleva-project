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
}
