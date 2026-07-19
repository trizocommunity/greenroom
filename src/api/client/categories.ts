import { useQuery } from "@tanstack/react-query";
import type {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/api/contracts/categories";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import {
  createCreateMutation,
  createDeleteMutation,
  createUpdateMutation,
} from "./_mutation-factory";
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
    staleTime: 30 * 1000,
  });
}

export const useCreateCategory = createCreateMutation<
  Category,
  { festivalId: string; data: CreateCategoryInput }
>({
  getQueryKey: ({ festivalId }) => queryKeys.categories.all(festivalId),
  mutationFn: async ({ festivalId, data }) => {
    const response = await apiClient.post<ApiResponse<Category>>(
      `/categories?festivalId=${encodeURIComponent(festivalId)}`,
      { data },
    );
    return handleApiResponse(response.data);
  },
  createOptimisticItem: ({ festivalId, data }, tempId) => ({
    id: tempId,
    festivalId,
    name: data.name,
    description: data.description ?? null,
    type: data.type ?? "SINGLE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
});

export const useUpdateCategory = createUpdateMutation<
  Category,
  { festivalId: string; categoryId: string; data: UpdateCategoryInput }
>({
  getQueryKey: ({ festivalId }) => queryKeys.categories.all(festivalId),
  mutationFn: async ({ festivalId, categoryId, data }) => {
    const response = await apiClient.put<ApiResponse<Category>>(
      `/categories/${categoryId}?festivalId=${encodeURIComponent(festivalId)}`,
      { data },
    );
    return handleApiResponse(response.data);
  },
  updateOptimisticItem: (item, { data }) => ({
    ...item,
    ...data,
    updatedAt: new Date().toISOString(),
  }),
  getItemId: (item) => item.id,
});

export const useDeleteCategory = createDeleteMutation<
  Category,
  { festivalId: string; categoryId: string }
>({
  getQueryKey: ({ festivalId }) => queryKeys.categories.all(festivalId),
  mutationFn: async ({ festivalId, categoryId }) => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/categories/${categoryId}?festivalId=${encodeURIComponent(festivalId)}`,
    );
    return handleApiResponse(response.data);
  },
  getItemId: ({ categoryId }) => categoryId,
});
