import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProgrammesAction,
  createProgrammeAction,
  deleteProgrammeAction,
} from "@/server/actions/programme.actions";
import { toast } from "sonner";

export function useProgrammes(festivalId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["programmes", festivalId],
    queryFn: () => getProgrammesAction(festivalId),
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      categoryId: string;
      type?: string;
      stageType?: string;
      maxEntries?: number;
    }) => {
      const result = await createProgrammeAction(festivalId, data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programmes", festivalId] });
      toast.success("Programme created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create programme");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteProgrammeAction(festivalId, id);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programmes", festivalId] });
      toast.success("Programme deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete programme");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { updateProgrammeAction } = await import(
        "@/server/actions/programme.actions"
      );
      return updateProgrammeAction(festivalId, id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programmes", festivalId] });
      toast.success("Programme updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update programme");
    },
  });

  return {
    programmes: query.data || [],
    isLoading: query.isLoading,
    createProgramme: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateProgramme: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteProgramme: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
