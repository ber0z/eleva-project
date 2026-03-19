import type { AiFunctionTool } from "../../tools/definitions";

const goalEnum = ["gain_muscle", "lose_fat", "recomposition", "maintain", "increase_strength", "improve_endurance", "improve_health", null] as const;
const sleepQualityEnum = ["excellent", "good", "average", "poor", "very_poor", null] as const;
const measureProps = {
  waist: { type: ["number", "null"] as const, description: "Cintura em cm. Null se nao informado." },
  hips: { type: ["number", "null"] as const, description: "Quadril em cm. Null se nao informado." },
  chest: { type: ["number", "null"] as const, description: "Peito em cm. Null se nao informado." },
  shoulder: { type: ["number", "null"] as const, description: "Ombros em cm. Null se nao informado." },
  rightBiceps: { type: ["number", "null"] as const, description: "Biceps direito em cm. Null se nao informado." },
  leftBiceps: { type: ["number", "null"] as const, description: "Biceps esquerdo em cm. Null se nao informado." },
  rightThigh: { type: ["number", "null"] as const, description: "Coxa direita em cm. Null se nao informado." },
  leftThigh: { type: ["number", "null"] as const, description: "Coxa esquerda em cm. Null se nao informado." },
  rightCalf: { type: ["number", "null"] as const, description: "Panturrilha direita em cm. Null se nao informado." },
  leftCalf: { type: ["number", "null"] as const, description: "Panturrilha esquerda em cm. Null se nao informado." },
  rightForearm: { type: ["number", "null"] as const, description: "Antebraco direito em cm. Null se nao informado." },
  leftForearm: { type: ["number", "null"] as const, description: "Antebraco esquerdo em cm. Null se nao informado." },
};
const measureKeys = ["waist", "hips", "chest", "shoulder", "rightBiceps", "leftBiceps", "rightThigh", "leftThigh", "rightCalf", "leftCalf", "rightForearm", "leftForearm"];

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

export const generalTools: AiFunctionTool[] = [
  {
    type: "function",
    name: "get_anamnesis",
    description: "Retorna o questionario de anamnese do usuario: historico de saude, lesoes, experiencia fitness, preferencias alimentares e estilo de vida. Use para personalizar qualquer recomendacao de saude e bem-estar.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    strict: true,
  },

  {
    type: "function",
    name: "get_last_evolution",
    description: "Retorna a evolucao mais recente do usuario: peso, altura, medidas corporais e objetivo.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    strict: true,
  },

  {
    type: "function",
    name: "get_evolution_list",
    description: "Lista as evolucoes do usuario (data e peso) em ordem decrescente.",
    parameters: {
      type: "object",
      properties: {
        limit: { type: ["number", "null"], description: "Quantidade maxima de evolucoes. Null = 5." },
      },
      required: ["limit"],
      additionalProperties: false,
    },
    strict: true,
  },

  {
    type: "function",
    name: "get_sleep_stats",
    description: "Retorna estatisticas agregadas de sono: media de horas e distribuicao de qualidade.",
    parameters: {
      type: "object",
      properties: dateRangeProps,
      required: ["dateFrom", "dateTo"],
      additionalProperties: false,
    },
    strict: true,
  },

  {
    type: "function",
    name: "get_recent_sleep",
    description: "Retorna os registros de sono mais recentes do usuario.",
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

  {
    type: "function",
    name: "get_activity_stats",
    description: "Retorna estatisticas de atividades fisicas: totais (tempo, calorias), breakdown por tipo e insights.",
    parameters: {
      type: "object",
      properties: dateRangeProps,
      required: ["dateFrom", "dateTo"],
      additionalProperties: false,
    },
    strict: true,
  },

  {
    type: "function",
    name: "get_recent_activities",
    description: "Retorna as atividades fisicas mais recentes do usuario.",
    parameters: {
      type: "object",
      properties: {
        limit: { type: ["number", "null"], description: "Quantidade de atividades. Null = 5." },
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
    name: "create_sleep",
    description: "Cria um registro de sono para o usuario.",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "Data no formato YYYY-MM-DD." },
        startTime: { type: "string", description: "Horario de inicio no formato HH:mm." },
        endTime: { type: "string", description: "Horario de fim no formato HH:mm." },
        sleepQuality: { type: ["string", "null"], enum: sleepQualityEnum, description: "Qualidade do sono. Null se nao informada." },
        notes: { type: ["string", "null"], description: "Observacoes opcionais." },
      },
      required: ["date", "startTime", "endTime", "sleepQuality", "notes"],
      additionalProperties: false,
    },
    strict: true,
  },

  {
    type: "function",
    name: "update_sleep",
    description: "Atualiza um registro de sono existente do usuario.",
    parameters: {
      type: "object",
      properties: {
        sleepId: { type: "number", description: "ID do registro de sono (obtido via get_recent_sleep)." },
        date: { type: ["string", "null"], description: "Nova data YYYY-MM-DD. Null = sem alteracao." },
        startTime: { type: ["string", "null"], description: "Novo horario de inicio HH:mm. Null = sem alteracao." },
        endTime: { type: ["string", "null"], description: "Novo horario de fim HH:mm. Null = sem alteracao." },
        sleepQuality: { type: ["string", "null"], enum: sleepQualityEnum, description: "Nova qualidade. Null = sem alteracao." },
        notes: { type: ["string", "null"], description: "Novas observacoes. Null = sem alteracao." },
      },
      required: ["sleepId", "date", "startTime", "endTime", "sleepQuality", "notes"],
      additionalProperties: false,
    },
    strict: true,
  },

  {
    type: "function",
    name: "create_physical_activity",
    description: "Registra uma atividade fisica para o usuario.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nome da atividade (ex.: Corrida, Natacao)." },
        type: { type: ["string", "null"], description: "Tipo/categoria da atividade. Null se nao informado." },
        duration: { type: "number", description: "Duracao em minutos." },
        date: { type: "string", description: "Data no formato YYYY-MM-DD." },
        calories: { type: ["number", "null"], description: "Calorias estimadas. Null se nao informado." },
        observations: { type: ["string", "null"], description: "Observacoes opcionais." },
      },
      required: ["name", "type", "duration", "date", "calories", "observations"],
      additionalProperties: false,
    },
    strict: true,
  },

  {
    type: "function",
    name: "update_physical_activity",
    description: "Atualiza uma atividade fisica existente do usuario.",
    parameters: {
      type: "object",
      properties: {
        activityId: { type: "number", description: "ID da atividade (obtido via get_recent_activities)." },
        name: { type: ["string", "null"], description: "Novo nome. Null = sem alteracao." },
        type: { type: ["string", "null"], description: "Novo tipo. Null = sem alteracao." },
        duration: { type: ["number", "null"], description: "Nova duracao em minutos. Null = sem alteracao." },
        date: { type: ["string", "null"], description: "Nova data YYYY-MM-DD. Null = sem alteracao." },
        calories: { type: ["number", "null"], description: "Novas calorias. Null = sem alteracao." },
        observations: { type: ["string", "null"], description: "Novas observacoes. Null = sem alteracao." },
      },
      required: ["activityId", "name", "type", "duration", "date", "calories", "observations"],
      additionalProperties: false,
    },
    strict: true,
  },

  {
    type: "function",
    name: "create_evolution",
    description: "Cria um registro de evolucao corporal (peso, altura, medidas) para o usuario.",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "Data da medicao no formato YYYY-MM-DD." },
        weight: { type: "number", description: "Peso em kg." },
        height: { type: "number", description: "Altura em cm." },
        goal: { type: ["string", "null"], enum: goalEnum, description: "Objetivo atual. Null = usa padrao (gain_muscle)." },
        message: { type: ["string", "null"], description: "Anotacao opcional." },
        ...measureProps,
      },
      required: ["date", "weight", "height", "goal", "message", ...measureKeys],
      additionalProperties: false,
    },
    strict: true,
  },

  {
    type: "function",
    name: "update_evolution",
    description: "Atualiza um registro de evolucao corporal existente.",
    parameters: {
      type: "object",
      properties: {
        evolutionId: { type: "number", description: "ID da evolucao (obtido via get_evolution_list)." },
        date: { type: ["string", "null"], description: "Nova data YYYY-MM-DD. Null = sem alteracao." },
        weight: { type: ["number", "null"], description: "Novo peso em kg. Null = sem alteracao." },
        height: { type: ["number", "null"], description: "Nova altura em cm. Null = sem alteracao." },
        goal: { type: ["string", "null"], enum: goalEnum, description: "Novo objetivo. Null = sem alteracao." },
        message: { type: ["string", "null"], description: "Nova anotacao. Null = sem alteracao." },
        ...measureProps,
      },
      required: ["evolutionId", "date", "weight", "height", "goal", "message", ...measureKeys],
      additionalProperties: false,
    },
    strict: true,
  },
];
