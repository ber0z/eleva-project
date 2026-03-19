import { AiMemoryService } from "../../services/ai-memory.service";
import type { AiGraphStateType } from "../state";

export async function saveMemory(state: AiGraphStateType) {
  if (!state.answer) return {};

  try {
    const memory = new AiMemoryService();
    await memory.append(state.userId, { role: "user", content: state.message }, 10);
    await memory.append(state.userId, { role: "assistant", content: state.answer }, 10);

    if (state.route) {
      await memory.setLastRoute(state.userId, state.route);
    }
  } catch { /* Redis indisponível — continua sem persistir */ }

  return {};
}