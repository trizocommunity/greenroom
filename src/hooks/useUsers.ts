import { useQuery } from "@tanstack/react-query";

export type User = {
  id: string;
  email: string;
  fullName: string | null;
  globalRole: "USER" | "SUPER_ADMIN";
  isActive: boolean;
  createdAt: string;
};

export const useUsers = () => {
  return useQuery({
    queryKey: ["users"],
    queryFn: async (): Promise<User[]> => {
      const response = await fetch("/api/super-admin/users");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      return response.json();
    },
  });
};

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const useUpdateUser = () => {
    const queryClient = useQueryClient();
  
    return useMutation({
      mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
        const response = await fetch(`/api/super-admin/users/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
  
        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || "Failed to update user");
        }
      },
      onSuccess: () => {
        toast.success("User updated successfully");
        queryClient.invalidateQueries({ queryKey: ["users"] });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };
  
  export const useDeleteUser = () => {
    const queryClient = useQueryClient();
  
    return useMutation({
      mutationFn: async (id: string) => {
        const response = await fetch(`/api/super-admin/users/${id}`, {
          method: "DELETE",
        });
  
        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || "Failed to delete user");
        }
      },
      onSuccess: () => {
        toast.success("User deleted successfully");
        queryClient.invalidateQueries({ queryKey: ["users"] });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };
