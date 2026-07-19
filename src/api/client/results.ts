import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  PublishResultInput,
  Result,
  SaveResultInput,
} from "@/api/contracts/results";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import { createUpdateMutation } from "./_mutation-factory";
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
    staleTime: 30 * 1000,
  });
}

export const useSaveResult = createUpdateMutation<Result, SaveResultInput>({
  getQueryKey: (data) => queryKeys.results.all(data.festivalId),
  mutationFn: async (data) => {
    const response = await apiClient.post<ApiResponse<Result>>("/results", {
      data,
    });
    return handleApiResponse(response.data);
  },
  updateOptimisticItem: (item, data) =>
    ({
      ...item,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }) as Result,
  getItemId: (item) => item.id,
});

export function usePublishResults() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    PublishResultInput,
    { prev: Result[] | undefined }
  >({
    mutationFn: async (data) => {
      const response = await apiClient.post<ApiResponse<void>>(
        "/results/publish",
        { data },
      );
      return handleApiResponse(response.data);
    },
    onMutate: async ({ festivalId, programmeId }) => {
      await qc.cancelQueries({
        queryKey: queryKeys.results.all(festivalId, programmeId),
      });
      const prev = qc.getQueryData<Result[]>(
        queryKeys.results.all(festivalId, programmeId),
      );
      qc.setQueryData(
        queryKeys.results.all(festivalId, programmeId),
        (old: Result[] | undefined) =>
          old?.map((r) =>
            r.programmeId === programmeId ? { ...r, isPublished: true } : r,
          ),
      );
      return { prev };
    },
    onError: (error, { festivalId, programmeId }, ctx) => {
      toast.error(error.message);
      if (ctx?.prev) {
        qc.setQueryData(
          queryKeys.results.all(festivalId, programmeId),
          ctx.prev,
        );
      }
    },
    onSuccess: (_data, { festivalId, programmeId }) => {
      qc.setQueryData<Result[]>(
        queryKeys.results.all(festivalId, programmeId),
        (old) =>
          old?.map((r) =>
            r.programmeId === programmeId ? { ...r, isPublished: true } : r,
          ),
      );
      qc.invalidateQueries({
        queryKey: queryKeys.results.all(festivalId, programmeId),
      });
    },
  });
}

export function useUnpublishResults() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    PublishResultInput,
    { prev: Result[] | undefined }
  >({
    mutationFn: async (data) => {
      const response = await apiClient.post<ApiResponse<void>>(
        "/results/unpublish",
        { data },
      );
      return handleApiResponse(response.data);
    },
    onMutate: async ({ festivalId, programmeId }) => {
      await qc.cancelQueries({
        queryKey: queryKeys.results.all(festivalId, programmeId),
      });
      const prev = qc.getQueryData<Result[]>(
        queryKeys.results.all(festivalId, programmeId),
      );
      qc.setQueryData(
        queryKeys.results.all(festivalId, programmeId),
        (old: Result[] | undefined) =>
          old?.map((r) =>
            r.programmeId === programmeId ? { ...r, isPublished: false } : r,
          ),
      );
      return { prev };
    },
    onError: (error, { festivalId, programmeId }, ctx) => {
      toast.error(error.message);
      if (ctx?.prev) {
        qc.setQueryData(
          queryKeys.results.all(festivalId, programmeId),
          ctx.prev,
        );
      }
    },
    onSuccess: (_data, { festivalId, programmeId }) => {
      qc.setQueryData<Result[]>(
        queryKeys.results.all(festivalId, programmeId),
        (old) =>
          old?.map((r) =>
            r.programmeId === programmeId ? { ...r, isPublished: false } : r,
          ),
      );
      qc.invalidateQueries({
        queryKey: queryKeys.results.all(festivalId, programmeId),
      });
    },
  });
}
