import { api } from "@/lib/api";

export const clientRecordsApi = {
    getOverview: (userId: string) =>
        api.get(`/professional/clients/${userId}/records/overview`),

    // Activities
    listActivities: (userId: string, params: Record<string, unknown>) =>
        api.get(`/professional/clients/${userId}/records/activities`, { params }),

    getActivityStats: (userId: string, params: Record<string, unknown>) =>
        api.get(`/professional/clients/${userId}/records/activities/stats`, { params }),

    // Sleep
    listSleep: (userId: string, params: Record<string, unknown>) =>
        api.get(`/professional/clients/${userId}/records/sleep`, { params }),

    getSleepStats: (userId: string, params: Record<string, unknown>) =>
        api.get(`/professional/clients/${userId}/records/sleep/stats`, { params }),

    // Meals
    listMealDays: (userId: string, params: Record<string, unknown>) =>
        api.get(`/professional/clients/${userId}/records/meals`, { params }),

    getMealDay: (userId: string, dayId: number) =>
        api.get(`/professional/clients/${userId}/records/meals/${dayId}`),

    // Evolutions
    listEvolutions: (userId: string, params: Record<string, unknown>) =>
        api.get(`/professional/clients/${userId}/records/evolutions`, { params }),

    getEvolution: (userId: string, evoId: number) =>
        api.get(`/professional/clients/${userId}/records/evolutions/${evoId}`),
};
