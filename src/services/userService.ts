import api from "@/lib/axios";
import { User } from "@/hooks/useUsers";

export const userService = {
  getAll: async (): Promise<User[]> => {
    const { data } = await api.get<User[]>('/super-admin/users');
    return data;
  },

  update: async (id: string, userData: Partial<User>) => {
    const { data } = await api.patch(`/super-admin/users/${id}`, userData);
    return data;
  },

  delete: async (id: string) => {
    await api.delete(`/super-admin/users/${id}`);
  }
};
