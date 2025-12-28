import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getGroupsAction,
  createGroupAction,
  deleteGroupAction,
} from "@/server/actions/group.actions";
import { toast } from "sonner";

export function useGroups(festivalId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["groups", festivalId],
    queryFn: () => getGroupsAction(festivalId),
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; type: string }) => {
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
      data: { name: string; type?: string };
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

  const assignTeamLeaderMutation = useMutation({
    mutationFn: async ({
      groupId,
      data,
    }: {
      groupId: string;
      data: { fullName: string; email: string; password: string };
    }) => {
      const { createTeamLeaderAction } = await import(
        "@/server/actions/member.actions"
      );
      return createTeamLeaderAction(festivalId, groupId, data);
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["groups", festivalId] });
        toast.success("Team Leader assigned successfully");
      } else {
        toast.error(result.error || "Failed to assign Team Leader");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to assign Team Leader");
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
    assignTeamLeader: assignTeamLeaderMutation.mutateAsync,
    isAssigningTeamLeader: assignTeamLeaderMutation.isPending,
  };
}
