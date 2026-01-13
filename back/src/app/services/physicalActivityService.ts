import { prisma } from "../lib/prismaClient";
import { Prisma, PhysicalActivity } from "@prisma/client";
import { NotFoundError } from "../errors/appErrors";
import {
    PhysicalActivityRepository,
    CreatePhysicalActivityInput,
    UpdatePhysicalActivityInput,
} from "../repositories/physicalActivityRepository";

export class PhysicalActivityService {
    private repo = new PhysicalActivityRepository();

    async create(data: CreatePhysicalActivityInput) {
        return prisma.$transaction(async (tx) => {
            if (data.trainingWorkoutId != null) {
                const exists = await this.repo.trainingWorkoutExists(data.trainingWorkoutId, tx);
                if (!exists) throw new NotFoundError("Treino não encontrado", "trainingWorkoutId");
            }
            try {
                return await this.repo.create(data, tx);
            } catch (e) {
                // fallback FK (P2003)
                if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
                    throw new NotFoundError("Relacionamento inválido", "trainingWorkoutId");
                }
                throw e;
            }
        });
    }


    async updateOwned(id: number, idUser: number, data: UpdatePhysicalActivityInput) {
        return prisma.$transaction(async (tx) => {
            if (typeof data.trainingWorkoutId === "number") {
                const exists = await this.repo.trainingWorkoutExists(data.trainingWorkoutId, tx);
                if (!exists) throw new NotFoundError("Treino não encontrado", "trainingWorkoutId");
            }
            try {
                return await this.repo.updateOwned(id, idUser, data, tx);
            } catch (e) {
                if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
                    throw new NotFoundError("Relacionamento inválido", "trainingWorkoutId");
                }
                throw e;
            }
        });
    }

    async deleteOwned(id: number, idUser: number): Promise<boolean> {
        return prisma.$transaction(async (tx) => this.repo.deleteOwned(id, idUser, tx));
    }

    async getByIdOwned(id: number, idUser: number): Promise<PhysicalActivity | null> {
        return this.repo.findByIdOwned(id, idUser);
    }

    async listByUser(idUser: number, p: { page: number; pageSize: number; dateFrom?: Date; dateTo?: Date; type?: string; trainingWorkoutId?: number }) {
        return this.repo.listByUser(idUser, p);
    }
}
