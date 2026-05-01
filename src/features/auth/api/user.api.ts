import api from "@/core/http/api-client";
import type { User } from "@/features/auth/hooks/use-users";

export const userApi = {
  getAll: async (): Promise<User[]> => {
    const { data } = await api.get<User[]>("/super-admin/users");
    return data;
  },

  update: async (id: string, userData: Partial<User>) => {
    const { data } = await api.patch(`/super-admin/users/${id}`, userData);
    return data;
  },

  delete: async (id: string) => {
    await api.delete(`/super-admin/users/${id}`);
  },
};
