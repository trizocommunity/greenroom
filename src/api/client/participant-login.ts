import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import type {
  ParticipantLogoutResponse,
  RequestAccessInput,
  RequestAccessResponse,
  VerifyOtpInput,
  VerifyOtpResponse,
} from "@/api/contracts/participant-login";

export function useRequestAccess() {
  return useMutation<RequestAccessResponse, Error, RequestAccessInput>({
    mutationFn: async (data) => {
      const res = await apiClient.post<ApiResponse<RequestAccessResponse>>(
        "/participant-login/request-access",
        { data },
      );
      return handleApiResponse(res.data);
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useVerifyOtp() {
  return useMutation<VerifyOtpResponse, Error, VerifyOtpInput>({
    mutationFn: async (data) => {
      const res = await apiClient.post<ApiResponse<VerifyOtpResponse>>(
        "/participant-login/verify-otp",
        { data },
      );
      return handleApiResponse(res.data);
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useParticipantLogout() {
  return useMutation<ParticipantLogoutResponse, Error, void>({
    mutationFn: async () => {
      const res = await apiClient.post<ApiResponse<ParticipantLogoutResponse>>(
        "/participant-login/logout",
      );
      return handleApiResponse(res.data);
    },
    onError: (error) => toast.error(error.message),
  });
}
