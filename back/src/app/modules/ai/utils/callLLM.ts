import { openai } from "../lib/openaiClient";
import type { AiMemoryMsg } from "../services/ai-memory.service";
import type { AiToolsService } from "../services/ai-tools.service";
import type { ToolRegistry } from "../tools/types";
import type { AiFunctionTool } from "../tools/definitions";
import { runToolCalls } from "../tools/toolRunner";

export async function callLLM(input: {
  system: string;
  context: unknown;
  userMessage: string;
  history: AiMemoryMsg[];
  userId: number;
  toolsService: AiToolsService;

  tools: AiFunctionTool[];      // ✅ tools do agente
  registry: ToolRegistry;       // ✅ handlers do agente
}): Promise<string> {
  const model = process.env.OPENAI_MODEL;

  type InputItem =
    | { role: "user"; content: string }
    | { role: "assistant"; content: string }
    | { role: "developer"; content: string };

  const inputItems: InputItem[] = [];

  // Contexto do usuário como developer message
  inputItems.push({
    role: "developer",
    content: `Contexto do usuário (JSON):\n${JSON.stringify(input.context)}`,
  });

  // Histórico como mensagens role-tagged (multi-turn)
  for (const msg of input.history) {
    inputItems.push({
      role: msg.role,
      content: msg.content,
    });
  }

  // Mensagem atual do usuário
  inputItems.push({
    role: "user",
    content: input.userMessage,
  });

  let response = await openai.responses.create({
    model,
    instructions: input.system,
    tools: input.tools,
    tool_choice: "auto",
    input: inputItems,
  });

  for (let step = 0; step < 3; step++) {
    const { toolOutputs, hadCalls } = await runToolCalls({
      outputItems: response.output ?? [],
      userId: input.userId,
      toolsService: input.toolsService,
      registry: input.registry,           // ✅ aqui
    });

    if (!hadCalls) return response.output_text ?? "";

    // ✅ IMPORTANTE: reenviar function_call + outputs (como você já corrigiu)
    const carry = (response.output ?? []).filter((item) => {
      if (!item || typeof item !== "object") return false;
      const t = (item as { type?: unknown }).type;
      return t === "function_call" || t === "reasoning";
    });

    response = await openai.responses.create({
      model,
      instructions: input.system,
      tools: input.tools,
      input: [...carry, ...toolOutputs],
    });
  }

  return response.output_text ?? "";
}