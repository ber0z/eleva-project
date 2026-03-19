import type { AiFunctionTool } from "../../tools/definitions";

const sleepQualityEnum = ["excellent", "good", "average", "poor", "very_poor", null] as const;

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

export const trainingTools: AiFunctionTool[] = [
  {
    type: "function",
    name: "get_anamnesis",
    description: "Retorna o questionario de anamnese do usuario: historico de saude, lesoes, limitacoes fisicas, nivel de experiencia, equipamentos disponiveis, preferencias e objetivos. Use antes de prescrever treinos personalizados.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    strict: true,
  },

  {
    type: "function",
    name: "get_last_evolution",
    description: "Retorna a evolucao mais recente: peso, altura e objetivo. Util para personalizar recomendacoes de treino.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    strict: true,
  },

  {
    type: "function",
    name: "get_training_list",
    description: "Lista os planos de treino do usuario com seus dias da semana e contagem de exercicios.",
    parameters: {
      type: "object",
      properties: {
        limit: { type: ["number", "null"], description: "Quantidade maxima de treinos. Null = 5." },
      },
      required: ["limit"],
      additionalProperties: false,
    },
    strict: true,
  },

  {
    type: "function",
    name: "get_training_by_id",
    description: "Retorna os detalhes completos de um plano de treino: workouts, exercicios, series, repeticoes e cargas.",
    parameters: {
      type: "object",
      properties: {
        trainingId: { type: "number", description: "ID do plano de treino." },
      },
      required: ["trainingId"],
      additionalProperties: false,
    },
    strict: true,
  },

  {
    type: "function",
    name: "get_recent_activities",
    description: "Lista as atividades fisicas recentes registradas pelo usuario (corrida, musculacao, ciclismo, etc.).",
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

  {
    type: "function",
    name: "get_activity_stats",
    description: "Retorna estatisticas de performance: total de treinos, minutos, calorias, breakdown por tipo e sequencia atual.",
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
    name: "get_exercise_catalog",
    description: "Busca exercicios no catalogo do app pelo nome ou tipo. Util para sugerir ou identificar exercicios.",
    parameters: {
      type: "object",
      properties: {
        query: { type: ["string", "null"], description: "Termo de busca (nome ou tipo do exercicio). Null para listar os mais recentes." },
        limit: { type: ["number", "null"], description: "Quantidade de resultados. Null = 10." },
      },
      required: ["query", "limit"],
      additionalProperties: false,
    },
    strict: true,
  },

  {
    type: "function",
    name: "get_sleep_stats",
    description: "Retorna estatisticas de sono (horas medias, qualidade). Util para analise de recuperacao e desempenho.",
    parameters: {
      type: "object",
      properties: dateRangeProps,
      required: ["dateFrom", "dateTo"],
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
        sleepId: { type: "number", description: "ID do registro (obtido via get_recent_sleep)." },
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
        name: { type: "string", description: "Nome da atividade (ex.: Musculacao, Corrida)." },
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
    name: "create_training",
    description: "Cria um plano de treino completo com workouts e exercicios para o usuario.",
    parameters: {
      type: "object",
      properties: {
        title: { type: ["string", "null"], description: "Nome do plano. Null se nao informado." },
        notes: { type: ["string", "null"], description: "Observacoes gerais. Null se nao informado." },
        workouts: {
          type: "array",
          description: "Dias de treino do plano.",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Nome do dia (ex.: Peito e Triceps)." },
              dayOfWeek: {
                type: "string",
                enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
                description: "Dia da semana.",
              },
              notes: { type: ["string", "null"], description: "Observacoes do dia. Null se nao informado." },
              exercises: {
                type: "array",
                description: "Exercicios do dia.",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Nome do exercicio." },
                    sets: { type: "number", description: "Numero de series." },
                    reps: { type: ["number", "null"], description: "Numero de repeticoes. Null se nao informado." },
                    weight: { type: ["number", "null"], description: "Carga em kg. Null se nao informado." },
                    type: { type: ["string", "null"], description: "Tipo (ex.: strength, cardio). Null se nao informado." },
                    technique: { type: ["string", "null"], description: "Tecnica especial. Null se nao informado." },
                    restTime: { type: ["number", "null"], description: "Descanso em segundos. Null se nao informado." },
                    notes: { type: ["string", "null"], description: "Observacoes do exercicio. Null se nao informado." },
                  },
                  required: ["name", "sets", "reps", "weight", "type", "technique", "restTime", "notes"],
                  additionalProperties: false,
                },
              },
            },
            required: ["title", "dayOfWeek", "notes", "exercises"],
            additionalProperties: false,
          },
        },
      },
      required: ["title", "notes", "workouts"],
      additionalProperties: false,
    },
    strict: true,
  },

  {
    type: "function",
    name: "update_training",
    description: "Atualiza o titulo e/ou notas de um plano de treino. Para editar workouts e exercicios, oriente o usuario a fazer no app.",
    parameters: {
      type: "object",
      properties: {
        trainingId: { type: "number", description: "ID do treino (obtido via get_training_list)." },
        title: { type: ["string", "null"], description: "Novo titulo. Null = sem alteracao." },
        notes: { type: ["string", "null"], description: "Novas observacoes. Null = sem alteracao." },
      },
      required: ["trainingId", "title", "notes"],
      additionalProperties: false,
    },
    strict: true,
  },
];
