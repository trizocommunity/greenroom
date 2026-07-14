import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const API_BASE = "/api/v1";

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!json.success) throw new Error(json.error.message);
  return json.data;
}

export interface User {
  id: string;
  email: string;
  fullName: string | null;
  globalRole: string;
  isActive: boolean;
}

export function useUsers() {
  return useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/users`);
      return handleResponse<User[]>(res);
    },
    staleTime: 30 * 1000,
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation<
    User,
    Error,
    { id: string; fullName?: string }
  >({
    mutationFn: async ({ id, fullName }) => {
      const res = await fetch(`${API_BASE}/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { fullName } }),
      });
      return handleResponse<User>(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      const res = await fetch(`${API_BASE}/users/${id}`, {
        method: "DELETE",
      });
      return handleResponse<void>(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
