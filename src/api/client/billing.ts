import { useQuery } from "@tanstack/react-query";
import type { UnusedCredit } from "@/api/contracts/billing";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import { STALE_TIME } from "@/lib/query-utils";
import { queryKeys } from "./_query-keys";

export function useUnusedCredit() {
  return useQuery<UnusedCredit | null>({
    queryKey: queryKeys.billing.unusedCredit,
    queryFn: async () => {
      const response =
        await apiClient.get<ApiResponse<UnusedCredit | null>>("/billing");
      return handleApiResponse(response.data);
    },
    staleTime: STALE_TIME.standard,
  });
}
