import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  CreateGalleryImageInput,
  GalleryImage,
} from "@/api/contracts/gallery";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import { STALE_TIME } from "@/lib/query-utils";
import { queryKeys } from "./_query-keys";

export function useGallery(festivalId: string) {
  return useQuery<GalleryImage[]>({
    queryKey: queryKeys.gallery.all(festivalId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<GalleryImage[]>>(
        `/gallery?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleApiResponse(response.data);
    },
    enabled: !!festivalId,
    staleTime: STALE_TIME.standard,
  });
}

export function useCreateGalleryItem() {
  const qc = useQueryClient();
  return useMutation<
    GalleryImage,
    Error,
    { festivalId: string; data: CreateGalleryImageInput }
  >({
    mutationFn: async ({ festivalId, data }) => {
      const response = await apiClient.post<ApiResponse<GalleryImage>>(
        `/gallery?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.gallery.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteGalleryItem() {
  const qc = useQueryClient();
  return useMutation<void, Error, { festivalId: string; imageId: string }>({
    mutationFn: async ({ festivalId, imageId }) => {
      const response = await apiClient.delete<ApiResponse<void>>(
        `/gallery?festivalId=${encodeURIComponent(festivalId)}`,
        { data: { imageId } },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.gallery.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
