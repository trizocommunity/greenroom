import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  CreateMediaImageInput,
  CreateMediaVideoInput,
  MediaImage,
  MediaVideo,
} from "@/api/contracts/media";
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

export function useMediaVideos(festivalId: string) {
  return useQuery<MediaVideo[]>({
    queryKey: queryKeys.media.videos(festivalId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<MediaVideo[]>>(
        `/media/videos?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleApiResponse(response.data);
    },
    enabled: !!festivalId,
    staleTime: STALE_TIME.standard,
  });
}

export function useCreateMediaVideo() {
  const qc = useQueryClient();
  return useMutation<
    MediaVideo,
    Error,
    { festivalId: string; data: CreateMediaVideoInput }
  >({
    mutationFn: async ({ festivalId, data }) => {
      const response = await apiClient.post<ApiResponse<MediaVideo>>(
        `/media/videos?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.media.videos(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteMediaVideo() {
  const qc = useQueryClient();
  return useMutation<void, Error, { festivalId: string; videoId: string }>({
    mutationFn: async ({ festivalId, videoId }) => {
      const response = await apiClient.delete<ApiResponse<void>>(
        `/media/videos?festivalId=${encodeURIComponent(festivalId)}&videoId=${encodeURIComponent(videoId)}`,
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.media.videos(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
