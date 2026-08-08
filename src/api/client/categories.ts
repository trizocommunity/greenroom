import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/api/contracts/categories";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import { STALE_TIME } from "@/lib/query-utils";
import { toast } from "@/lib/toast";
import { queryKeys } from "./_query-keys";

export function useCategories(festivalId: string) {
  return useQuery<Category[]>({
    queryKey: queryKeys.categories.all(festivalId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Category[]>>(
        `/categories?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleApiResponse(response.data);
    },
    enabled: !!festivalId,
    staleTime: STALE_TIME.standard,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation<
    Category,
    Error,
    { festivalId: string; data: CreateCategoryInput }
  >({
    mutationFn: async ({ festivalId, data }) => {
      const response = await apiClient.post<ApiResponse<Category>>(
        `/categories?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.categories.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation<
    Category,
    Error,
    { festivalId: string; categoryId: string; data: UpdateCategoryInput }
  >({
    mutationFn: async ({ festivalId, categoryId, data }) => {
      const response = await apiClient.put<ApiResponse<Category>>(
        `/categories/${categoryId}?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.categories.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation<void, Error, { festivalId: string; categoryId: string }>({
    mutationFn: async ({ festivalId, categoryId }) => {
      const response = await apiClient.delete<ApiResponse<void>>(
        `/categories/${categoryId}?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.categories.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
