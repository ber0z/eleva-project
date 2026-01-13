import { PresetRepository, CreatePresetDTO } from "../repositories/presetRepository";
import { Prisma } from "@prisma/client"; // Importa o tipo TransactionClient

export class PresetService {
  private presetRepository: PresetRepository;

  constructor() {
    this.presetRepository = new PresetRepository();
  }

  async createPreset(data: CreatePresetDTO, tx?: Prisma.TransactionClient) {
    return await this.presetRepository.createPreset(data, tx);
  }


   async setCurrentGoalForUser(
    idUser: number,
    currentGoal: string, // ajuste tipo se necessário
    tx?: Prisma.TransactionClient
  ) {
    return this.presetRepository.upsertCurrentGoalByUser(idUser, currentGoal, tx);
  }
}
