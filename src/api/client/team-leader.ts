import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  RequestOtpInput,
  RequestOtpResponse,
  TeamLeaderLogoutResponse,
  VerifyOtpInput,
  VerifyOtpResponse,
} from "@/api/contracts/team-leader";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import { STALE_TIME } from "@/lib/query-utils";
import { queryKeys } from "./_query-keys";

export function useTeamLeaderFestivals() {
  return useQuery<unknown>({
    queryKey: queryKeys.teamLeader.festivals,
    queryFn: async () => {
      const response =
        await apiClient.get<ApiResponse<unknown>>("/team-leader");
      return handleApiResponse(response.data);
    },
    staleTime: STALE_TIME.standard,
  });
}

export function useTeamLeaderDashboard() {
  return useQuery<unknown>({
    queryKey: queryKeys.teamLeader.dashboard,
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<unknown>>(
        "/team-leader/dashboard",
      );
      return handleApiResponse(response.data);
    },
    staleTime: STALE_TIME.standard,
  });
}

export function useTeamLeaderStudents() {
  return useQuery<unknown>({
    queryKey: queryKeys.teamLeader.students,
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<unknown>>(
        "/team-leader/students",
      );
      return handleApiResponse(response.data);
    },
    staleTime: STALE_TIME.standard,
  });
}

export function useRequestOtp() {
  return useMutation<RequestOtpResponse, Error, RequestOtpInput>({
    mutationFn: async (data) => {
      const response = await apiClient.post<ApiResponse<RequestOtpResponse>>(
        "/team-leader/request-otp",
        { data },
      );
      return handleApiResponse(response.data);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useVerifyOtp() {
  return useMutation<VerifyOtpResponse, Error, VerifyOtpInput>({
    mutationFn: async (data) => {
      const response = await apiClient.post<ApiResponse<VerifyOtpResponse>>(
        "/team-leader/verify-otp",
        { data },
      );
      return handleApiResponse(response.data);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useTeamLeaderLogout() {
  return useMutation<TeamLeaderLogoutResponse, Error, void>({
    mutationFn: async () => {
      const response = await apiClient.post<
        ApiResponse<TeamLeaderLogoutResponse>
      >("/team-leader/logout");
      return handleApiResponse(response.data);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
