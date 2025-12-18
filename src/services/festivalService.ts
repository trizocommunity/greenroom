import type { CreateFestivalInput, Festival } from "@/hooks/useFestivals";
import api from "@/lib/axios";

export const festivalService = {
  getAll: async (): Promise<Festival[]> => {
    const { data } = await api.get<Festival[]>("/festivals");
    return data;
  },

  create: async (festivalData: CreateFestivalInput) => {
    const { data } = await api.post("/festivals", festivalData);
    return data;
  },

  update: async (id: string, festivalData: Partial<CreateFestivalInput>) => {
    const { data } = await api.patch(`/festivals/${id}`, festivalData);
    return data;
  },

  delete: async (id: string) => {
    await api.delete(`/festivals/${id}`);
  },
};
