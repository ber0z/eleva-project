// modules/ai/graph/state.ts
import { Annotation } from "@langchain/langgraph";
import type { AiMemoryMsg } from "../services/ai-memory.service";
import type { AiToolsService } from "../services/ai-tools.service";

export const AiGraphState = Annotation.Root({
    userId: Annotation<number>(),
    message: Annotation<string>(),

    context: Annotation<unknown | undefined>(),
    history: Annotation<AiMemoryMsg[] | undefined>(),

    toolsService: Annotation<AiToolsService | undefined>(),

    route: Annotation<"diet" | "training" | "general" | undefined>(),
    lastRoute: Annotation<"diet" | "training" | "general" | undefined>(),

    answer: Annotation<string | undefined>(),
});

export type AiGraphStateType = typeof AiGraphState.State;