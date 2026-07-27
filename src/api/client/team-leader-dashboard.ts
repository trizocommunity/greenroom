import { useQuery } from "@tanstack/react-query";
import {
  type ApiResponse,
  apiClient,
  handleApiResponse,
} from "@/lib/api-client";
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
