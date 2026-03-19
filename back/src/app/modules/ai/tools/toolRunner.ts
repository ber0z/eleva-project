import type { AiToolsService } from "../services/ai-tools.service";
import type { ToolRegistry, ToolHandlerContext } from "../tools/types";

type FunctionCallItem = {
  type: "function_call";
  name: string;
  call_id: string;
  arguments?: string;
};

export type FunctionCallOutputItem = {
  type: "function_call_output";
  call_id: string;
  output: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isFunctionCallItem(v: unknown): v is FunctionCallItem {
  if (!isRecord(v)) return false;
  return (
    v.type === "function_call" &&
    typeof v.name === "string" &&
    typeof v.call_id === "string" &&
    (v.arguments === undefined || typeof v.arguments === "string")
  );
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { _raw: text };
  }
}

export async function runToolCalls(params: {
  outputItems: unknown[];
  userId: number;
  toolsService: AiToolsService;
  registry: ToolRegistry;               // ✅ novo
}): Promise<{ toolOutputs: FunctionCallOutputItem[]; hadCalls: boolean }> {
  const calls = params.outputItems.filter(isFunctionCallItem);
  if (calls.length === 0) return { toolOutputs: [], hadCalls: false };

  const ctx: ToolHandlerContext = { userId: params.userId, tools: params.toolsService };
  const toolOutputs: FunctionCallOutputItem[] = [];

  for (const call of calls) {
    const handler = params.registry[call.name];
    const args: unknown = call.arguments ? safeJsonParse(call.arguments) : {};

    const result = handler
      ? await handler(args, ctx)
      : { error: `Tool desconhecida: ${call.name}` };

    toolOutputs.push({
      type: "function_call_output",
      call_id: call.call_id,
      output: JSON.stringify(result),
    });
  }

  return { toolOutputs, hadCalls: true };
}