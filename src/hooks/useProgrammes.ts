import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import {
  createProgrammeAction,
  deleteProgrammeAction,
  getProgrammeDetailsAction,
  getProgrammesAction,
  updateProgrammeAction,
} from "@/server/actions/programme.actions";

const STALE_TIME_MS = 2 * 60 * 1000;
const GC_TIME_MS = 5 * 60 * 1000;

export function useProgrammes(festivalId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.programmes.list(festivalId),
    queryFn: () => getProgrammesAction(festivalId),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    enabled: !!festivalId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      categoryId: string;
      type?: string;
      stageType?: string;
      maxParticipantsPerGroup?: number;
      maxTeamsPerGroup?: number;
      maxStudentsPerTeam?: number;
    }) => {
      const result = await createProgrammeAction(festivalId, data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.programmes.list(festivalId) });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.programmes.list(festivalId) });
      toast.success("Programme deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete programme");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return updateProgrammeAction(festivalId, id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.programmes.list(festivalId) });
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

export function useProgrammeDetails(festivalId: string, programmeId?: string) {
  const query = useQuery({
    queryKey: programmeId
      ? queryKeys.programmes.detail(festivalId, programmeId)
      : ["programme", festivalId, programmeId],
    queryFn: async () => {
      if (!programmeId) return null;
      return getProgrammeDetailsAction(festivalId, programmeId);
    },
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    enabled: !!festivalId && !!programmeId,
  });

  return {
    programme: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}
