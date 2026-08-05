import { useMutation } from "@tanstack/react-query";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import { toast } from "@/lib/toast";

export function useLogout() {
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const response = await apiClient.post<ApiResponse<void>>(
        "/auth?action=logout",
      );
      return handleApiResponse(response.data);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
