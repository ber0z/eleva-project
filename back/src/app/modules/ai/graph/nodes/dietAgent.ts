import type { AiGraphStateType } from "../state";
import { callLLM } from "../../utils/callLLM";
import { dietSystemPrompt } from "../../agents/diet/prompt";
import { dietTools } from "../../agents/diet/tools";
import { dietRegistry } from "../../agents/diet/registry";

export async function dietAgent(state: AiGraphStateType) {
  if (state.answer) return {};
  if (!state.context || !state.history || !state.toolsService) return { answer: "Estado incompleto." };

  const answer = await callLLM({
    system: dietSystemPrompt,
    context: state.context,
    userMessage: state.message,
    history: state.history,
    userId: state.userId,
    toolsService: state.toolsService,

    tools: dietTools,
    registry: dietRegistry,
  });

  return { answer };
}