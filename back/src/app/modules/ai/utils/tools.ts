
export const tools = [
  {
    type: "function",
    function: {
      name: "get_last_evolution",
      description: "Retorna a última evolução registrada do usuário autenticado (medidas, peso, data e observação).",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
] as const;
