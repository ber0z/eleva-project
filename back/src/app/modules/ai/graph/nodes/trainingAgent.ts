import type { AiGraphStateType } from "../state";
import { callLLM } from "../../utils/callLLM";
import { trainingSystemPrompt } from "../../agents/training/prompt";
import { trainingTools } from "../../agents/training/tools";
import { trainingRegistry } from "../../agents/training/registry";

export async function trainingAgent(state: AiGraphStateType) {
  if (state.answer) return {};
  if (!state.context || !state.history || !state.toolsService) return { answer: "Estado incompleto." };

  const answer = await callLLM({
    system: trainingSystemPrompt,
    context: state.context,
    userMessage: state.message,
    history: state.history,
    userId: state.userId,
    toolsService: state.toolsService,

    tools: trainingTools,
    registry: trainingRegistry,
  });

  return { answer };
}