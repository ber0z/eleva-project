import type { AiFunctionTool } from "../../tools/definitions";

const dateRangeProps = {
  dateFrom: {
    type: ["string", "null"],
    description: "Data inicial no formato YYYY-MM-DD. Null = 30 dias atras.",
  },
  dateTo: {
    type: ["string", "null"],
    description: "Data final no formato YYYY-MM-DD. Null = hoje.",
  },
} as const;

export const dietTools: AiFunctionTool[] = [
  {
    type: "function",
    name: "get_anamnesis",
    description: "Retorna o questionario de anamnese do usuario: historico de saude, lesoes, nivel de experiencia, preferencias alimentares, restricoes, alimentos que gosta/nao gosta, rotina e objetivos. Use antes de prescrever dietas personalizadas.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    strict: true,
  },

  {
    type: "function",
    name: "get_last_evolution",
    description: "Retorna a evolucao mais recente: peso, altura e objetivo. Essencial para personalizar orientacoes nutricionais.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    strict: true,
  },

  {
    type: "function",
    name: "get_diet_list",
    description: "Lista os planos alimentares do usuario com titulo e data.",
    parameters: {
      type: "object",
      properties: {
        limit: { type: ["number", "null"], description: "Quantidade maxima de planos. Null = 5." },
        ...dateRangeProps,
      },
      required: ["limit", "dateFrom", "dateTo"],
      additionalProperties: false,
    },
    strict: true,
  },

  {
    type: "function",
    name: "get_diet_by_id",
    description: "Retorna o detalhamento completo de um plano alimentar: todas as refeicoes, horarios e macros por refeicao.",
    parameters: {
      type: "object",
      properties: {
        dietId: { type: "number", description: "ID do plano alimentar." },
      },
      required: ["dietId"],
      additionalProperties: false,
    },
    strict: true,
  },

  {
    type: "function",
    name: "get_meal_logs",
    description: "Lista os diarios alimentares recentes: totais diarios de kcal, macros e aderencia.",
    parameters: {
      type: "object",
      properties: {
        limit: { type: ["number", "null"], description: "Quantidade de dias. Null = 7." },
        ...dateRangeProps,
      },
      required: ["limit", "dateFrom", "dateTo"],
      additionalProperties: false,
    },
    strict: true,
  },

  {
    type: "function",
    name: "get_meal_log_day",
    description: "Retorna o detalhamento completo de um dia do diario alimentar: cada refeicao registrada com macros.",
    parameters: {
      type: "object",
      properties: {
        dayId: { type: "number", description: "ID do dia do diario alimentar." },
      },
      required: ["dayId"],
      additionalProperties: false,
    },
    strict: true,
  },

  {
    type: "function",
    name: "get_recent_sleep",
    description: "Retorna os registros de sono recentes. Util para correlacao entre sono, recuperacao e alimentacao.",
    parameters: {
      type: "object",
      properties: {
        limit: { type: ["number", "null"], description: "Quantidade de registros. Null = 7." },
        ...dateRangeProps,
      },
      required: ["limit", "dateFrom", "dateTo"],
      additionalProperties: false,
    },
    strict: true,
  },

  // ── WRITE TOOLS ─────────────────────────────────────────────────────────────

  {
    type: "function",
    name: "create_diet",
    description: "Cria um plano alimentar completo com refeicoes para o usuario.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Titulo do plano alimentar." },
        date: { type: "string", description: "Data de referencia YYYY-MM-DD." },
        notes: { type: ["string", "null"], description: "Observacoes gerais. Null se nao informado." },
        protein: { type: ["number", "null"], description: "Total de proteina em gramas. Null = calculado das refeicoes." },
        carbs: { type: ["number", "null"], description: "Total de carboidratos em gramas. Null = calculado das refeicoes." },
        fat: { type: ["number", "null"], description: "Total de gordura em gramas. Null = calculado das refeicoes." },
        meals: {
          type: "array",
          description: "Refeicoes do plano.",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Nome da refeicao (ex.: Cafe da manha)." },
              meal: { type: "string", description: "Descricao dos alimentos." },
              time: { type: ["string", "null"], description: "Horario sugerido HH:mm. Null se nao informado." },
              notes: { type: ["string", "null"], description: "Observacoes. Null se nao informado." },
              protein: { type: ["number", "null"], description: "Proteina em gramas. Null = 0." },
              carbs: { type: ["number", "null"], description: "Carboidratos em gramas. Null = 0." },
              fat: { type: ["number", "null"], description: "Gordura em gramas. Null = 0." },
            },
            required: ["title", "meal", "time", "notes", "protein", "carbs", "fat"],
            additionalProperties: false,
          },
        },
      },
      required: ["title", "date", "notes", "protein", "carbs", "fat", "meals"],
      additionalProperties: false,
    },
    strict: true,
  },

  {
    type: "function",
    name: "update_diet",
    description: "Atualiza titulo, notas ou data de um plano alimentar existente.",
    parameters: {
      type: "object",
      properties: {
        dietId: { type: "number", description: "ID do plano alimentar (obtido via get_diet_list)." },
        title: { type: ["string", "null"], description: "Novo titulo. Null = sem alteracao." },
        notes: { type: ["string", "null"], description: "Novas observacoes. Null = sem alteracao." },
        date: { type: ["string", "null"], description: "Nova data YYYY-MM-DD. Null = sem alteracao." },
      },
      required: ["dietId", "title", "notes", "date"],
      additionalProperties: false,
    },
    strict: true,
  },

  {
    type: "function",
    name: "create_meal_log_day",
    description: "Cria o registro do diario alimentar de um dia.",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "Data do registro YYYY-MM-DD." },
        notes: { type: ["string", "null"], description: "Observacoes do dia. Null se nao informado." },
        adherence: { type: ["number", "null"], description: "Aderencia a dieta (0-100). Null se nao informado." },
        totalKcal: { type: ["number", "null"], description: "Total de calorias do dia. Null se nao informado." },
        protein: { type: ["number", "null"], description: "Proteina em gramas. Null se nao informado." },
        carbs: { type: ["number", "null"], description: "Carboidratos em gramas. Null se nao informado." },
        fat: { type: ["number", "null"], description: "Gordura em gramas. Null se nao informado." },
        waterMl: { type: ["number", "null"], description: "Agua consumida em ml. Null se nao informado." },
      },
      required: ["date", "notes", "adherence", "totalKcal", "protein", "carbs", "fat", "waterMl"],
      additionalProperties: false,
    },
    strict: true,
  },

  {
    type: "function",
    name: "update_meal_log_day",
    description: "Atualiza o diario alimentar de um dia: totais, aderencia, agua e/ou refeicoes registradas.",
    parameters: {
      type: "object",
      properties: {
        dayId: { type: "number", description: "ID do dia do diario (obtido via get_meal_logs)." },
        notes: { type: ["string", "null"], description: "Novas observacoes. Null = sem alteracao." },
        adherence: { type: ["number", "null"], description: "Nova aderencia (0-100). Null = sem alteracao." },
        totalKcal: { type: ["number", "null"], description: "Novo total de calorias. Null = sem alteracao." },
        protein: { type: ["number", "null"], description: "Nova proteina em gramas. Null = sem alteracao." },
        carbs: { type: ["number", "null"], description: "Novos carboidratos em gramas. Null = sem alteracao." },
        fat: { type: ["number", "null"], description: "Nova gordura em gramas. Null = sem alteracao." },
        waterMl: { type: ["number", "null"], description: "Nova agua em ml. Null = sem alteracao." },
        entries: {
          type: ["array", "null"],
          description: "Refeicoes do dia. Null = sem alteracao.",
          items: {
            type: "object",
            properties: {
              id: { type: ["number", "null"], description: "ID da entry (para editar existente). Null = nova entry." },
              title: { type: ["string", "null"], description: "Nome da refeicao." },
              time: { type: ["string", "null"], description: "Horario HH:mm." },
              description: { type: ["string", "null"], description: "Descricao dos alimentos." },
              kcal: { type: ["number", "null"], description: "Calorias." },
              protein: { type: ["number", "null"], description: "Proteina em gramas." },
              carbs: { type: ["number", "null"], description: "Carboidratos em gramas." },
              fat: { type: ["number", "null"], description: "Gordura em gramas." },
            },
            required: ["id", "title", "time", "description", "kcal", "protein", "carbs", "fat"],
            additionalProperties: false,
          },
        },
      },
      required: ["dayId", "notes", "adherence", "totalKcal", "protein", "carbs", "fat", "waterMl", "entries"],
      additionalProperties: false,
    },
    strict: true,
  },
];
