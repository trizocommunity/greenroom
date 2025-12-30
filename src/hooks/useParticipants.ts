import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createParticipantWithServiceAction,
  deleteParticipantWithServiceAction,
  getParticipantsAction,
  updateParticipantAction,
} from "@/server/actions/participant.actions";

export function useParticipants(festivalId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["participants", festivalId],
    queryFn: () => getParticipantsAction(festivalId),
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return createParticipantWithServiceAction(festivalId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["participants", festivalId] });
      toast.success("Participant created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create participant");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return updateParticipantAction(festivalId, id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["participants", festivalId] });
      toast.success("Participant updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update participant");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return deleteParticipantWithServiceAction(festivalId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["participants", festivalId] });
      toast.success("Participant deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete participant");
    },
  });

  return {
    participants: query.data || [],
    isLoading: query.isLoading,
    createParticipant: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateParticipant: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteParticipant: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
