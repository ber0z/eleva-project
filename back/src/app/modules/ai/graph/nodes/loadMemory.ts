import { AiMemoryService } from "../../services/ai-memory.service";
import type { AiGraphStateType } from "../state";

export async function loadMemory(state: AiGraphStateType) {
  if (state.answer) return {};

  try {
    const memory = new AiMemoryService();
    const [history, lastRoute] = await Promise.all([
      memory.getLast(state.userId, 10),
      memory.getLastRoute(state.userId),
    ]);
    return {
      history,
      lastRoute: (lastRoute as "diet" | "training" | "general") ?? undefined,
    };
  } catch {
    return { history: [], lastRoute: undefined };
  }
}