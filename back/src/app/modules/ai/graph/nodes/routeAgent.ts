// modules/ai/graph/nodes/routeAgent.ts
import type { AiGraphStateType } from "../state";
import type { AiMemoryMsg } from "../../services/ai-memory.service";

function looksLikeDiet(text: string): boolean {
  const t = text.toLowerCase();
  return (
    t.includes("dieta") ||
    t.includes("refei") ||
    t.includes("caloria") ||
    t.includes("kcal") ||
    t.includes("prote") ||
    t.includes("carbo") ||
    t.includes("gord") ||
    t.includes("macros") ||
    t.includes("comer") ||
    t.includes("alimenta") ||
    t.includes("café") ||
    t.includes("almoço") ||
    t.includes("jantar")
  );
}

function looksLikeTraining(text: string): boolean {
  const t = text.toLowerCase();
  return (
    t.includes("treino") ||
    t.includes("exerc") ||
    t.includes("série") ||
    t.includes("reps") ||
    t.includes("repet") ||
    t.includes("carga") ||
    t.includes("muscul") ||
    t.includes("academia")
  );
}

const confirmPatterns = [
  /^sim$/,
  /^sim[,!.\s]/,
  /^pode/,
  /^confirmo/,
  /^isso/,
  /^exato/,
  /^manda/,
  /^bora/,
  /^ok$/,
  /^ok[,!.\s]/,
  /^pode ser/,
  /^t[aá] bom/,
  /^perfeito/,
  /^cria/,
  /^salva/,
  /^registra/,
  /^faz isso/,
  /^vai l[aá]/,
  /^va em frente/,
  /^claro/,
  /^com certeza/,
  /^vamos/,
  /^vai$/,
  /^isso mesmo/,
  /^é isso/,
  /^e isso/,
];

function looksLikeConfirmation(text: string): boolean {
  const t = text.toLowerCase().trim();
  return confirmPatterns.some((p) => p.test(t));
}

function detectTopicFromHistory(
  history: AiMemoryMsg[]
): "diet" | "training" | null {
  const recentAssistant = history
    .filter((m) => m.role === "assistant")
    .slice(-3)
    .reverse();

  for (const msg of recentAssistant) {
    if (looksLikeTraining(msg.content)) return "training";
    if (looksLikeDiet(msg.content)) return "diet";
  }
  return null;
}

export async function routeAgent(state: AiGraphStateType) {
  if (state.answer) return {};

  const msg = state.message ?? "";
  const history = state.history ?? [];

  // 1. Se a mensagem tem keywords claros → roteia direto (lógica original)
  const isDiet = looksLikeDiet(msg);
  const isTraining = looksLikeTraining(msg);

  if (isDiet && !isTraining) return { route: "diet" as const };
  if (isTraining && !isDiet) return { route: "training" as const };

  // 2. Se a mensagem parece confirmação → usar contexto para determinar rota
  if (looksLikeConfirmation(msg)) {
    // Primeiro: rota persistida no Redis (mais confiável)
    if (state.lastRoute === "training" || state.lastRoute === "diet") {
      return { route: state.lastRoute };
    }

    // Segundo: escanear histórico recente do assistente
    const historyTopic = detectTopicFromHistory(history);
    if (historyTopic) return { route: historyTopic };
  }

  // 3. Para mensagens curtas/vagas sem keywords, manter continuidade
  if (
    state.lastRoute &&
    state.lastRoute !== "general" &&
    msg.length < 80
  ) {
    return { route: state.lastRoute };
  }

  // 4. Fallback
  return { route: "general" as const };
}
