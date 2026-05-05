import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/core/http/query-keys";
import {
  createJudgeAction,
  deleteJudgeAction,
  getJudgesAction,
  updateJudgeAction,
} from "@/features/judges/actions/judge.actions";

export function useJudges(festivalId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.judges.list(festivalId),
    queryFn: () => getJudgesAction(festivalId),
    enabled: !!festivalId,
  });

  const createMutation = useMutation({
    mutationFn: (input: { name: string; description?: string | null }) =>
      createJudgeAction(festivalId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.judges.list(festivalId) });
      toast.success("Judge created.");
    },
    onError: (error: any) => toast.error(error?.message || "Failed to create judge."),
  });

  const updateMutation = useMutation({
    mutationFn: (input: {
      judgeId: string;
      name: string;
      description?: string | null;
    }) => updateJudgeAction(festivalId, input.judgeId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.judges.list(festivalId) });
      toast.success("Judge updated.");
    },
    onError: (error: any) => toast.error(error?.message || "Failed to update judge."),
  });

  const deleteMutation = useMutation({
    mutationFn: (judgeId: string) => deleteJudgeAction(festivalId, judgeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.judges.list(festivalId) });
      toast.success("Judge deleted.");
    },
    onError: (error: any) => toast.error(error?.message || "Failed to delete judge."),
  });

  return {
    judges: query.data ?? [],
    isLoading: query.isLoading,
    createJudge: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateJudge: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteJudge: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

