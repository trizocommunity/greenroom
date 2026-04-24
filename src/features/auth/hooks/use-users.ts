import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/core/http/query-keys";
import { userApi } from "@/features/auth/api/user.api";

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
    queryKey: queryKeys.users.all(),
    queryFn: userApi.getAll,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) =>
      userApi.update(id, data),
    onSuccess: () => {
      toast.success("User updated successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userApi.delete,
    onSuccess: () => {
      toast.success("User deleted successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};
