import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import {
  createCategoryAction,
  deleteCategoryAction,
  getCategoriesAction,
} from "@/server/actions/category.actions";

const STALE_TIME_MS = 2 * 60 * 1000;
const GC_TIME_MS = 5 * 60 * 1000;

export function useCategories(festivalId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.categories.list(festivalId),
    queryFn: () => getCategoriesAction(festivalId),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    enabled: !!festivalId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const result = await createCategoryAction(festivalId, data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.categories.list(festivalId),
      });
      toast.success("Category created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create category");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { name: string; description?: string };
    }) => {
      const { updateCategoryAction } = await import(
        "@/server/actions/category.actions"
      );
      return updateCategoryAction(festivalId, id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.categories.list(festivalId),
      });
      toast.success("Category updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update category");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteCategoryAction(festivalId, id);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.categories.list(festivalId),
      });
      toast.success("Category deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete category");
    },
  });

  return {
    categories: query.data || [],
    isLoading: query.isLoading,
    createCategory: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateCategory: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteCategory: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
