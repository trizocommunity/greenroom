import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createGroupAction,
  deleteGroupAction,
  getGroupsAction,
} from "@/server/actions/group.actions";

export function useGroups(festivalId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["groups", festivalId],
    queryFn: () => getGroupsAction(festivalId),
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      seriesStart?: number;
      color?: string;
    }) => {
      const result = await createGroupAction(festivalId, data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", festivalId] });
      toast.success("Group created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create group");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteGroupAction(festivalId, id);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", festivalId] });
      toast.success("Group deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete group");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        name: string;
        seriesStart?: number;
        color?: string;
        teamLeaderIds?: string[];
      };
    }) => {
      const { updateGroupAction } = await import(
        "@/server/actions/group.actions"
      );
      return updateGroupAction(festivalId, id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", festivalId] });
      toast.success("Group updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update group");
    },
  });

  return {
    groups: query.data || [],
    isLoading: query.isLoading,
    createGroup: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateGroup: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteGroup: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
