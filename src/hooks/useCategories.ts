import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCategoriesAction,
  createCategoryAction,
  deleteCategoryAction,
} from "@/server/actions/category.actions";
import { toast } from "sonner";

export function useCategories(festivalId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["categories", festivalId],
    queryFn: () => getCategoriesAction(festivalId),
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const result = await createCategoryAction(festivalId, data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", festivalId] });
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
      // Import this from actions if not imported yet?
      // I'll need to update imports at the top.
      const { updateCategoryAction } = await import(
        "@/server/actions/category.actions"
      );
      return updateCategoryAction(festivalId, id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", festivalId] });
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
      queryClient.invalidateQueries({ queryKey: ["categories", festivalId] });
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
