import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createAssignmentAction,
  deleteAssignmentAction,
  getAssignmentsAction,
} from "@/server/actions/assignment.actions";

export function useAssignments(festivalId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["assignments", festivalId],
    queryFn: () => getAssignmentsAction(festivalId),
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      programmeId: string;
      studentId?: string;
      groupId?: string;
    }) => {
      const result = await createAssignmentAction(festivalId, data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments", festivalId] });
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
      queryClient.invalidateQueries({ queryKey: ["assignments", festivalId] });
      toast.success("Assignment deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete assignment");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { updateAssignmentAction } = await import(
        "@/server/actions/assignment.actions"
      );
      return updateAssignmentAction(festivalId, id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments", festivalId] });
      toast.success("Assignment updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update assignment");
    },
  });

  return {
    assignments: query.data || [],
    isLoading: query.isLoading,
    createAssignment: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateAssignment: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteAssignment: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    bulkCreateAssignment: useMutation({
      mutationFn: async (
        assignments: {
          programmeId: string;
          studentId: string;
          teamNumber?: number;
        }[],
      ) => {
        const { bulkCreateAssignmentAction } = await import(
          "@/server/actions/assignment.actions"
        );
        return bulkCreateAssignmentAction(festivalId, assignments);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["assignments", festivalId],
        });
        toast.success("Assignments created successfully");
      },
      onError: (error: any) => {
        toast.error(error.message || "Failed to create assignments");
      },
    }).mutateAsync,
  };
}
