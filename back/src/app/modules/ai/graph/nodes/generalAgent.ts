import type { AiGraphStateType } from "../state";
import { callLLM } from "../../utils/callLLM";
import { generalSystemPrompt } from "../../agents/general/prompt";
import { generalTools } from "../../agents/general/tools";
import { generalRegistry } from "../../agents/general/registry";

export async function generalAgent(state: AiGraphStateType) {
  if (state.answer) return {};
  if (!state.context) return { answer: "Contexto não carregado." };
  if (!state.history) return { answer: "Memória não carregada." };
  if (!state.toolsService) return { answer: "Tools não carregadas." };

  const answer = await callLLM({
    system: generalSystemPrompt,
    context: state.context,
    userMessage: state.message,
    history: state.history,
    userId: state.userId,
    toolsService: state.toolsService,

    tools: generalTools,
    registry: generalRegistry,
  });

  return { answer };
}