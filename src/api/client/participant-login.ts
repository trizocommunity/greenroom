import { useMutation } from "@tanstack/react-query";
import type {
  ParticipantLogoutResponse,
  RequestAccessInput,
  RequestAccessResponse,
  VerifyOtpInput,
  VerifyOtpResponse,
} from "@/api/contracts/participant-login";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import { useInlineErrorMutation } from "./useInlineErrorMutation";

export function useRequestAccess() {
  return useInlineErrorMutation<
    RequestAccessResponse,
    Error,
    RequestAccessInput
  >({
    mutationFn: async (data) => {
      const res = await apiClient.post<ApiResponse<RequestAccessResponse>>(
        "/participant-login/request-access",
        { data },
      );
      return handleApiResponse(res.data);
    },
    meta: { requireInlineError: true, errorScope: "participant-login" },
  });
}

export function useVerifyOtp() {
  return useInlineErrorMutation<VerifyOtpResponse, Error, VerifyOtpInput>({
    mutationFn: async (data) => {
      const res = await apiClient.post<ApiResponse<VerifyOtpResponse>>(
        "/participant-login/verify-otp",
        { data },
      );
      return handleApiResponse(res.data);
    },
    meta: { requireInlineError: true, errorScope: "participant-login" },
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
  });
}
