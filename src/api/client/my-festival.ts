import { useQuery } from "@tanstack/react-query";
import type {
  JoinedFestival,
  MyFestivalResponse,
} from "@/api/contracts/my-festival";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import { STALE_TIME } from "@/lib/query-utils";
import { queryKeys } from "./_query-keys";

export function useMyFestivals() {
  return useQuery<MyFestivalResponse>({
    queryKey: queryKeys.myFestival.all,
    queryFn: async () => {
      const response =
        await apiClient.get<ApiResponse<MyFestivalResponse>>("/my-festival");
      return handleApiResponse(response.data);
    },
    staleTime: STALE_TIME.standard,
  });
}

export function useJoinedFestivals() {
  return useQuery<JoinedFestival[]>({
    queryKey: queryKeys.myFestival.joined,
    queryFn: async () => {
      const response =
        await apiClient.get<ApiResponse<MyFestivalResponse>>("/my-festival");
      const data = await handleApiResponse(response.data);
      if (!data.festival) return [];
      return [
        {
          ...data.festival,
          memberRole: "OWNER" as const,
          memberSince: data.festival.createdAt,
        },
      ];
    },
    staleTime: STALE_TIME.standard,
  });
}
