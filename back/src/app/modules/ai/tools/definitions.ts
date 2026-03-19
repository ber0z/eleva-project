export type AiFunctionTool = {
  type: "function";
  name: string;
  description?: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    additionalProperties?: boolean;
    required?: string[];
  };
  strict: boolean;
};

export const aiToolDefinitions: AiFunctionTool[] = [
  {
    type: "function",
    name: "get_last_evolution",
    description: "Retorna a última evolução registrada do usuário, peso, altura, medidas.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    strict: true,
  },
];

export type AiToolName = (typeof aiToolDefinitions)[number]["name"];
