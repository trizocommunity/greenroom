import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import {
  createGroupAction,
  deleteGroupAction,
  getGroupsAction,
  updateGroupAction,
} from "@/server/actions/group.actions";

const STALE_TIME_MS = 30 * 1000;
const GC_TIME_MS = 5 * 60 * 1000;

export function useGroups(festivalId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.groups.list(festivalId),
    queryFn: () => getGroupsAction(festivalId),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    enabled: !!festivalId,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
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
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.list(festivalId) });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.list(festivalId) });
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
    }) => updateGroupAction(festivalId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.list(festivalId) });
      // Team leader assignment toggles Student.isTeamLeader, so refresh students cache too.
      queryClient.invalidateQueries({ queryKey: queryKeys.students.list(festivalId) });
      toast.success("Group updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update group");
    },
  });

  return {
    groups: query.data || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
    createGroup: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateGroup: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteGroup: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
