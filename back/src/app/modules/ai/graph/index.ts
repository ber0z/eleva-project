import { StateGraph } from "@langchain/langgraph";
import { AiGraphState } from "./state";

import { loadContext } from "./nodes/loadContext";
import { loadMemory } from "./nodes/loadMemory";
import { routeAgent } from "./nodes/routeAgent";
import { runTools } from "./nodes/runTools";
import { trainingAgent } from "./nodes/trainingAgent";
import { dietAgent } from "./nodes/dietAgent";
import { generalAgent } from "./nodes/generalAgent";
import { saveMemory } from "./nodes/saveMemory";

export const aiGraph = new StateGraph(AiGraphState)
  .addNode("loadContext", loadContext)
  .addNode("loadMemory", loadMemory)
  .addNode("routeAgent", routeAgent)
  .addNode("runTools", runTools)
  .addNode("dietAgent", dietAgent)
  .addNode("trainingAgent", trainingAgent)
  .addNode("generalAgent", generalAgent) 
  .addNode("saveMemory", saveMemory) 

  .addEdge("__start__", "loadContext")
  .addEdge("loadContext", "loadMemory")
  .addEdge("loadMemory", "routeAgent")
  .addEdge("routeAgent", "runTools")

  // ✅ aqui decide qual agente chamar
  .addConditionalEdges("runTools", (state) => {
    if (state.route === "diet") return "dietAgent";
    if (state.route === "training") return "trainingAgent";
    return "generalAgent"; // fallback (ou "trainingAgent" / "general")
  })

  .addEdge("dietAgent", "saveMemory")
  .addEdge("trainingAgent", "saveMemory") 
  .addEdge("generalAgent", "saveMemory")
  
  // (opcional, pra deixar explícito)
  .addEdge("saveMemory", "__end__")

  .compile();