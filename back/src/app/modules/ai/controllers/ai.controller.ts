import { FastifyReply, FastifyRequest } from "fastify";
// import { ZodError } from "zod";
import { AiService } from "../services/ai-chat.service";
import { aiChatSchema, macroEstimateSchema } from "../schemas/ai-chat.schema";
import { openai } from "../lib/openaiClient";
import { randomUUID } from "crypto";

export class AiController {
    private aiChatService = new AiService();

    async chat(req: FastifyRequest, reply: FastifyReply) {
        const requestId = (req.headers["x-request-id"] as string) || randomUUID();

        try {
            if (!req.auth || req.auth.subjectType !== "user") {
                return reply.code(403).send({ error: "Apenas usuário pode acessar" });
            }

            const { message } = aiChatSchema.parse(req.body);

            const answer = await this.aiChatService.chat({
                userId: req.auth.subjectId,
                message,
            });

            return reply.code(200).send({ answer });
        } catch (error: unknown) {
            const err = error instanceof Error ? error : new Error(String(error));

            console.error(`[ai/chat] requestId=${requestId}`, err.stack || err.message);

            if (hasCause(err) && err.cause) {
                console.error(`[ai/chat] cause requestId=${requestId}`, err.cause);
            }

            return reply.code(500).send({
                error: "Erro no chat de IA",
                requestId,
            });
        }
    }

    async estimateMacros(req: FastifyRequest, reply: FastifyReply) {
        try {
            const { description } = macroEstimateSchema.parse(req.body);

            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                response_format: { type: "json_object" },
                messages: [
                    {
                        role: "system",
                        content: `Você é um nutricionista preciso que usa a tabela TACO (Tabela Brasileira de Composição de Alimentos) como referência.
Dado a descrição de uma refeição, calcule o total de macronutrientes usando porções padrão brasileiras realistas.

Valores de referência (por unidade/100g):
- 1 ovo médio (50g): 77 kcal, 6g proteína, 0g carbo, 5g gordura
- 1 fatia de pão de forma (25g): 66 kcal, 2g proteína, 13g carbo, 1g gordura
- mamão (100g): 39 kcal, 0,5g proteína, 10g carbo, 0,1g gordura
- arroz branco cozido (100g): 128 kcal, 2,5g proteína, 28g carbo, 0,2g gordura
- frango grelhado (100g): 159 kcal, 32g proteína, 0g carbo, 3g gordura
- leite integral (200ml): 122 kcal, 6g proteína, 10g carbo, 6g gordura

Use essas referências para ancoragem. Seja conservador — não superestime.
Some os macros de cada item e retorne o total.
Responda APENAS com JSON válido usando EXATAMENTE estas chaves em inglês: kcal, protein, carbs, fat.
Todos os valores devem ser números inteiros positivos. Sem explicações.

Exemplo de resposta para "2 ovos + 1 fatia de pão":
{"kcal": 220, "protein": 14, "carbs": 13, "fat": 11}`,
                    },
                    { role: "user", content: description },
                ],
            });

            const raw = completion.choices[0]?.message?.content ?? "{}";
            console.log("[ai/macros] raw response:", raw);
            const parsed = JSON.parse(raw);

            const kcal = parsed.kcal ?? parsed.calorias ?? parsed.calories ?? 0;
            const protein = parsed.protein ?? parsed.proteina ?? parsed.proteína ?? 0;
            const carbs = parsed.carbs ?? parsed.carboidratos ?? parsed.carbo ?? parsed.carboidrato ?? 0;
            const fat = parsed.fat ?? parsed.gordura ?? parsed.gorduras ?? 0;

            return reply.code(200).send({
                kcal: Math.round(kcal),
                protein: Math.round(protein),
                carbs: Math.round(carbs),
                fat: Math.round(fat),
            });
        } catch (error: unknown) {
            const err = error instanceof Error ? error : new Error(String(error));
            console.error("[ai/macros]", err.message);
            return reply.code(500).send({ error: "Falha ao estimar macros" });
        }
    }
}

function hasCause(e: unknown): e is { cause: unknown } {
    return typeof e === "object" && e !== null && "cause" in e;
}