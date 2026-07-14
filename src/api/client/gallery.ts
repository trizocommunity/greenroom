import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateGalleryImageInput,
  GalleryImage,
} from "@/api/contracts/gallery";

const API_BASE = "/api/v1";

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!json.success) throw new Error(json.error.message);
  return json.data;
}

export function useGallery(festivalId: string) {
  return useQuery<GalleryImage[]>({
    queryKey: ["gallery", festivalId],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/gallery?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleResponse<GalleryImage[]>(res);
    },
    enabled: !!festivalId,
    staleTime: 30 * 1000,
  });
}

export function useCreateGalleryItem() {
  const qc = useQueryClient();
  return useMutation<GalleryImage, Error, { festivalId: string; data: CreateGalleryImageInput }>({
    mutationFn: async ({ festivalId, data }) => {
      const res = await fetch(
        `${API_BASE}/gallery?festivalId=${encodeURIComponent(festivalId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        },
      );
      return handleResponse<GalleryImage>(res);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: ["gallery", festivalId] });
    },
  });
}

export function useDeleteGalleryItem() {
  const qc = useQueryClient();
  return useMutation<void, Error, { festivalId: string; imageId: string }>({
    mutationFn: async ({ festivalId, imageId }) => {
      const res = await fetch(
        `${API_BASE}/gallery?festivalId=${encodeURIComponent(festivalId)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageId }),
        },
      );
      return handleResponse<void>(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gallery"] });
    },
  });
}
