import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateFestivalInput,
  Festival,
  UpdateFestivalInput,
} from "@/api/contracts/festivals";

export type { Festival };

const API_BASE = "/api/v1";

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!json.success) throw new Error(json.error.message);
  return json.data;
}

export function useFestivals() {
  return useQuery<Festival[]>({
    queryKey: ["festivals"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/festivals`);
      return handleResponse<Festival[]>(res);
    },
    staleTime: 30 * 1000,
  });
}

export function useFestival(id: string) {
  return useQuery<Festival>({
    queryKey: ["festivals", id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/festivals/${id}`);
      return handleResponse<Festival>(res);
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useCreateFestival() {
  const qc = useQueryClient();
  return useMutation<Festival, Error, CreateFestivalInput>({
    mutationFn: async (data) => {
      const res = await fetch(`${API_BASE}/festivals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      return handleResponse<Festival>(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["festivals"] });
    },
  });
}

export function useUpdateFestival() {
  const qc = useQueryClient();
  return useMutation<Festival, Error, UpdateFestivalInput>({
    mutationFn: async (data) => {
      const res = await fetch(`${API_BASE}/festivals`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      return handleResponse<Festival>(res);
    },
    onSuccess: (_data, _vars, _ctx) => {
      qc.invalidateQueries({ queryKey: ["festivals"] });
    },
  });
}

export function useDeleteFestival() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await fetch(`${API_BASE}/festivals/${id}`, {
        method: "DELETE",
      });
      return handleResponse<void>(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["festivals"] });
    },
  });
}
