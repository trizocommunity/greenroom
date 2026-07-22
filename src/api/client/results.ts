import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  PublishResultInput,
  Result,
  SaveResultInput,
} from "@/api/contracts/results";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import { STALE_TIME } from "@/lib/query-utils";
import { queryKeys } from "./_query-keys";

export function useResults(festivalId: string, programmeId?: string) {
  return useQuery<Result[]>({
    queryKey: queryKeys.results.all(festivalId, programmeId),
    queryFn: async () => {
      const params = new URLSearchParams({ festivalId });
      if (programmeId) params.set("programmeId", programmeId);
      const response = await apiClient.get<ApiResponse<Result[]>>(
        `/results?${params}`,
      );
      return handleApiResponse(response.data);
    },
    enabled: !!festivalId,
    staleTime: STALE_TIME.standard,
  });
}

export function useSaveResult() {
  const qc = useQueryClient();
  return useMutation<Result, Error, SaveResultInput>({
    mutationFn: async (data) => {
      const response = await apiClient.post<ApiResponse<Result>>("/results", {
        data,
      });
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId, programmeId }) => {
      qc.invalidateQueries({
        queryKey: queryKeys.results.all(festivalId, programmeId),
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function usePublishResults() {
  const qc = useQueryClient();
  return useMutation<void, Error, PublishResultInput>({
    mutationFn: async (data) => {
      const response = await apiClient.post<ApiResponse<void>>(
        "/results/publish",
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId, programmeId }) => {
      qc.invalidateQueries({
        queryKey: queryKeys.results.all(festivalId, programmeId),
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUnpublishResults() {
  const qc = useQueryClient();
  return useMutation<void, Error, PublishResultInput>({
    mutationFn: async (data) => {
      const response = await apiClient.post<ApiResponse<void>>(
        "/results/unpublish",
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId, programmeId }) => {
      qc.invalidateQueries({
        queryKey: queryKeys.results.all(festivalId, programmeId),
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
