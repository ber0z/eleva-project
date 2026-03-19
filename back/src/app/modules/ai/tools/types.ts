import type { AiToolsService } from "../services/ai-tools.service";

export type ToolHandlerContext = {
  userId: number;
  tools: AiToolsService;
};

export type ToolHandler = (args: unknown, ctx: ToolHandlerContext) => Promise<unknown>;

export type ToolRegistry = Record<string, ToolHandler>;