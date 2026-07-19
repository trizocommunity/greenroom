import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  CreateGalleryImageInput,
  GalleryImage,
} from "@/api/contracts/gallery";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
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
    staleTime: 30 * 1000,
  });
}

export function useCreateGalleryItem() {
  const qc = useQueryClient();
  return useMutation<
    GalleryImage,
    Error,
    { festivalId: string; data: CreateGalleryImageInput },
    { prev: GalleryImage[] | undefined }
  >({
    mutationFn: async ({ festivalId, data }) => {
      const response = await apiClient.post<ApiResponse<GalleryImage>>(
        `/gallery?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onMutate: async ({ festivalId, data }) => {
      await qc.cancelQueries({ queryKey: queryKeys.gallery.all(festivalId) });
      const prev = qc.getQueryData<GalleryImage[]>(
        queryKeys.gallery.all(festivalId),
      );
      const tempImage: GalleryImage = {
        id: `temp-${Date.now()}`,
        ...data,
        festivalId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as GalleryImage;
      qc.setQueryData<GalleryImage[]>(
        queryKeys.gallery.all(festivalId),
        (old) => [...(old || []), tempImage],
      );
      return { prev };
    },
    onError: (_err, { festivalId }, ctx) => {
      toast.error(_err.message);
      if (ctx?.prev) {
        qc.setQueryData(queryKeys.gallery.all(festivalId), ctx.prev);
      }
    },
    onSuccess: (_data, { festivalId }) => {
      return qc.invalidateQueries({
        queryKey: queryKeys.gallery.all(festivalId),
      });
    },
  });
}

export function useDeleteGalleryItem() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { festivalId: string; imageId: string },
    { prev: GalleryImage[] | undefined }
  >({
    mutationFn: async ({ festivalId, imageId }) => {
      const response = await apiClient.delete<ApiResponse<void>>(
        `/gallery?festivalId=${encodeURIComponent(festivalId)}`,
        { data: { imageId } },
      );
      return handleApiResponse(response.data);
    },
    onMutate: async ({ festivalId, imageId }) => {
      await qc.cancelQueries({ queryKey: queryKeys.gallery.all(festivalId) });
      const prev = qc.getQueryData<GalleryImage[]>(
        queryKeys.gallery.all(festivalId),
      );
      qc.setQueryData<GalleryImage[]>(
        queryKeys.gallery.all(festivalId),
        (old) => (old || []).filter((i) => i.id !== imageId),
      );
      return { prev };
    },
    onError: (_err, { festivalId }, ctx) => {
      toast.error(_err.message);
      if (ctx?.prev) {
        qc.setQueryData(queryKeys.gallery.all(festivalId), ctx.prev);
      }
    },
    onSuccess: (_data, { festivalId }) => {
      return qc.invalidateQueries({
        queryKey: queryKeys.gallery.all(festivalId),
      });
    },
  });
}
