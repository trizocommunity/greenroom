import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateDownloadInput,
  DeleteDownloadInput,
  Download,
  UpdateDownloadInput,
} from "@/api/contracts/downloads";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import { STALE_TIME } from "@/lib/query-utils";
import { toast } from "@/lib/toast";
import { queryKeys } from "./_query-keys";

export function useDownloads(festivalId: string) {
  return useQuery<Download[]>({
    queryKey: queryKeys.downloads.all(festivalId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Download[]>>(
        `/downloads?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleApiResponse(response.data);
    },
    enabled: !!festivalId,
    staleTime: STALE_TIME.standard,
  });
}

export function useCreateDownload() {
  const qc = useQueryClient();
  return useMutation<
    Download,
    Error,
    { festivalId: string; data: CreateDownloadInput }
  >({
    mutationFn: async ({ festivalId, data }) => {
      const response = await apiClient.post<ApiResponse<Download>>(
        `/downloads?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.downloads.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateDownload() {
  const qc = useQueryClient();
  return useMutation<
    Download,
    Error,
    { festivalId: string; downloadId: string; data: UpdateDownloadInput }
  >({
    mutationFn: async ({ festivalId, downloadId, data }) => {
      const response = await apiClient.put<ApiResponse<Download>>(
        `/downloads?festivalId=${encodeURIComponent(festivalId)}&downloadId=${encodeURIComponent(downloadId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.downloads.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteDownload() {
  const qc = useQueryClient();
  return useMutation<void, Error, DeleteDownloadInput>({
    mutationFn: async (data) => {
      const response = await apiClient.delete<ApiResponse<void>>(
        `/downloads?festivalId=${encodeURIComponent(data.festivalId)}&downloadId=${encodeURIComponent(data.downloadId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.downloads.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
