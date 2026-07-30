import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CreateMediaImageInput, MediaImage } from "@/api/contracts/media";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import { STALE_TIME } from "@/lib/query-utils";
import { queryKeys } from "./_query-keys";

export function useMedia(festivalId: string) {
  return useQuery<MediaImage[]>({
    queryKey: queryKeys.media.all(festivalId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<MediaImage[]>>(
        `/media?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleApiResponse(response.data);
    },
    enabled: !!festivalId,
    staleTime: STALE_TIME.standard,
  });
}

export function useCreateMediaItem() {
  const qc = useQueryClient();
  return useMutation<
    MediaImage,
    Error,
    { festivalId: string; data: CreateMediaImageInput }
  >({
    mutationFn: async ({ festivalId, data }) => {
      const response = await apiClient.post<ApiResponse<MediaImage>>(
        `/media?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.media.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteMediaItem() {
  const qc = useQueryClient();
  return useMutation<void, Error, { festivalId: string; imageId: string }>({
    mutationFn: async ({ festivalId, imageId }) => {
      const response = await apiClient.delete<ApiResponse<void>>(
        `/media?festivalId=${encodeURIComponent(festivalId)}`,
        { data: { imageId } },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.media.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
