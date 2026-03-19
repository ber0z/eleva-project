import { aiGraph } from "../graph";

export class AiService {
  async chat(input: { userId: number; message: string }) {
    const finalState = await aiGraph.invoke({
      userId: input.userId,
      message: input.message,
    });

    return finalState.answer ?? "Sem resposta.";
  }
}