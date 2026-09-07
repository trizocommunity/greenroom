import { useMutation } from "@tanstack/react-query";
import type {
  UploadFolder,
  UploadInput,
  UploadResponse,
} from "@/api/contracts/upload";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import { toast } from "@/lib/toast";

export function useCloudinaryUpload() {
  return useMutation<
    UploadResponse,
    Error,
    { file: File; folder: UploadFolder; festivalId: string }
  >({
    mutationFn: async ({ file, folder, festivalId }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);
      formData.append("festivalId", festivalId);

      const response = await apiClient.post<ApiResponse<UploadResponse>>(
        "/upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      return handleApiResponse(response.data);
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || "Upload failed");
    },
  });
}

export function useUploadFile() {
  return useMutation<UploadResponse, Error, UploadInput>({
    mutationFn: async (data) => {
      const response = await apiClient.post<ApiResponse<UploadResponse>>(
        "/upload",
        { data },
      );
      return handleApiResponse(response.data);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteFile() {
  return useMutation<void, Error, { publicId?: string; url?: string; festivalId: string }>({
    mutationFn: async ({ publicId, url, festivalId }) => {
      const response = await apiClient.delete<ApiResponse<void>>("/upload", {
        data: { publicId, url, festivalId },
      });
      return handleApiResponse(response.data);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
