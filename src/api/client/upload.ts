import { useMutation } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import type { UploadInput, UploadResponse } from "@/api/contracts/upload";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function useCloudinaryUpload() {
  return useMutation<UploadResponse, Error, { file: File; folder: string }>({
    mutationFn: async ({ file, folder }) => {
      const base64Data = await fileToBase64(file);
      const response = await apiClient.post<ApiResponse<UploadResponse>>(
        "/upload",
        {
          data: { file: base64Data, folder },
        },
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
  return useMutation<void, Error, { publicId: string }>({
    mutationFn: async ({ publicId }) => {
      const response = await apiClient.delete<ApiResponse<void>>("/upload", {
        data: { publicId },
      });
      return handleApiResponse(response.data);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
