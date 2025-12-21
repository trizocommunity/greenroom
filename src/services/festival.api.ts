import type { CreateFestivalInput, Festival } from "@/hooks/useFestivals";
import api from "@/lib/axios";

export const festivalApi = {
  // Phase 1: Get My Festival
  getMyFestival: async (): Promise<Festival | null> => {
    // Returns { festival: Festival | null }
    const { data } = await api.get<{ festival: Festival | null }>(
      "/my-festival",
    );
    return data.festival;
  },

  getAll: async (): Promise<Festival[]> => {
    const { data } = await api.get<Festival[]>("/festivals");
    return data;
  },

  create: async (festivalData: CreateFestivalInput): Promise<Festival> => {
    const { data } = await api.post<Festival>("/festival", festivalData);
    return data;
  },

  update: async (id: string, festivalData: Partial<CreateFestivalInput>) => {
    const { data } = await api.patch(`/festivals/${id}`, festivalData); // Old endpoint? Need to check if I updated this.
    // I haven't implemented PATCH /festival/[id] or /festival yet for Phase 1.
    // Leaving purely as placeholder or should I remove?
    return data;
  },

  delete: async (id: string) => {
    await api.delete(`/festivals/${id}`);
  },
};
