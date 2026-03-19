export async function callChatModel(params: {
  system: string;
  context: unknown;
  userMessage: string;
}) {
  // Aqui você pluga OpenAI/SDK/etc.
  // Por enquanto, vou deixar o formato das mensagens pronto.
  const messages = [
    { role: "system", content: params.system },
    { role: "system", content: `Contexto do usuário (JSON): ${JSON.stringify(params.context)}` },
    { role: "user", content: params.userMessage },
  ];

  // TODO: chamar o modelo e retornar texto
  return {
    answer: "TODO: integrar provedor de IA",
    messages,
  };
}
