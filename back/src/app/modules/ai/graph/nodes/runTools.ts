import { AiToolsService } from "../../services/ai-tools.service";
import type { AiGraphStateType } from "../state";

export async function runTools(state: AiGraphStateType) {
  if (state.answer) return {};
  return { toolsService: new AiToolsService() };
}