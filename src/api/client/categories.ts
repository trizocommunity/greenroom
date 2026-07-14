import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/api/contracts/categories";

const API_BASE = "/api/v1";

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!json.success) throw new Error(json.error.message);
  return json.data;
}

export function useCategories(festivalId: string) {
  return useQuery<Category[]>({
    queryKey: ["categories", festivalId],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/categories?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleResponse<Category[]>(res);
    },
    enabled: !!festivalId,
    staleTime: 30 * 1000,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation<Category, Error, { festivalId: string; data: CreateCategoryInput }>({
    mutationFn: async ({ festivalId, data }) => {
      const res = await fetch(
        `${API_BASE}/categories?festivalId=${encodeURIComponent(festivalId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        },
      );
      return handleResponse<Category>(res);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: ["categories", festivalId] });
    },
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation<Category, Error, { festivalId: string; categoryId: string; data: UpdateCategoryInput }>({
    mutationFn: async ({ festivalId, categoryId, data }) => {
      const res = await fetch(
        `${API_BASE}/categories/${categoryId}?festivalId=${encodeURIComponent(festivalId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        },
      );
      return handleResponse<Category>(res);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: ["categories", festivalId] });
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { festivalId: string; categoryId: string },
    { prev: Category[] | undefined }
  >({
    mutationFn: async ({ festivalId, categoryId }) => {
      const res = await fetch(
        `${API_BASE}/categories/${categoryId}?festivalId=${encodeURIComponent(festivalId)}`,
        { method: "DELETE" },
      );
      return handleResponse<void>(res);
    },
    onMutate: async ({ festivalId, categoryId }) => {
      await qc.cancelQueries({ queryKey: ["categories", festivalId] });
      const prev = qc.getQueryData<Category[]>(["categories", festivalId]);
      qc.setQueryData(
        ["categories", festivalId],
        (old: Category[] | undefined) =>
          old?.filter((c) => c.id !== categoryId),
      );
      return { prev };
    },
    onError: (_err, { festivalId }, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(["categories", festivalId], ctx.prev);
      }
    },
    onSettled: (_data, _err, { festivalId }) => {
      qc.invalidateQueries({ queryKey: ["categories", festivalId] });
    },
  });
}
