import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/core/http/query-keys";
import {
  bulkCreateAssignmentAction,
  createAssignmentAction,
  deleteAssignmentAction,
  deleteTeamAssignmentAction,
  getAssignmentsAction,
  updateAssignmentAction,
} from "@/features/assignments/actions/assignment.actions";

const STALE_TIME_MS = 2 * 60 * 1000;
const GC_TIME_MS = 5 * 60 * 1000;

export function useAssignments(festivalId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.assignments.list(festivalId),
    queryFn: () => getAssignmentsAction(festivalId),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    enabled: !!festivalId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      programmeId: string;
      studentId?: string;
      groupId?: string;
      teamNumber?: number;
    }) => {
      const result = await createAssignmentAction(festivalId, data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignments.list(festivalId),
      });
      toast.success("Assignment created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create assignment");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteAssignmentAction(festivalId, id);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignments.list(festivalId),
      });
      toast.success("Assignment deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete assignment");
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async ({
      programmeId,
      groupId,
      teamNumber,
    }: {
      programmeId: string;
      groupId: string;
      teamNumber: number;
    }) => {
      return deleteTeamAssignmentAction(
        festivalId,
        programmeId,
        groupId,
        teamNumber,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignments.list(festivalId),
      });
      toast.success("Team removed from programme");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove team");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return updateAssignmentAction(festivalId, id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignments.list(festivalId),
      });
      toast.success("Assignment updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update assignment");
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async (
      assignments: {
        programmeId: string;
        studentId: string;
        teamNumber?: number;
      }[],
    ) => bulkCreateAssignmentAction(festivalId, assignments),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignments.list(festivalId),
      });
      toast.success("Assignments created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create assignments");
    },
  });

  return {
    assignments: query.data || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
    createAssignment: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateAssignment: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteAssignment: deleteMutation.mutateAsync,
    deleteTeamAssignment: deleteTeamMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    isDeletingTeam: deleteTeamMutation.isPending,
    bulkCreateAssignment: bulkCreateMutation.mutateAsync,
  };
}
