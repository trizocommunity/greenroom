import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { UploadInput, UploadResponse } from "@/api/contracts/upload";

const API_BASE = "/api/v1";

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!json.success) throw new Error(json.error.message);
  return json.data;
}

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
      const res = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { file: base64Data, folder } }),
      });
      return handleResponse<UploadResponse>(res);
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || "Upload failed");
    },
  });
}

export function useUploadFile() {
  return useMutation<UploadResponse, Error, UploadInput>({
    mutationFn: async (data) => {
      const res = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      return handleResponse<UploadResponse>(res);
    },
  });
}

export function useDeleteFile() {
  return useMutation<void, Error, { publicId: string }>({
    mutationFn: async ({ publicId }) => {
      const res = await fetch(`${API_BASE}/upload`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId }),
      });
      return handleResponse<void>(res);
    },
  });
}
