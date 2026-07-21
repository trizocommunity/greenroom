import { useQuery } from "@tanstack/react-query";
import type { AnalyticsData } from "@/components/super-admin/AnalyticsCharts";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import { queryKeys } from "./_query-keys";
import { STALE_TIME } from "@/lib/query-utils";

export function useSuperAdminAnalytics(initialData?: AnalyticsData) {
  return useQuery<AnalyticsData>({
    queryKey: queryKeys.superAdmin.analytics,
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<AnalyticsData>>(
        "/super-admin/analytics",
      );
      return handleApiResponse(response.data);
    },
    initialData,
    staleTime: STALE_TIME.standard,
  });
}

export interface SuperAdminPayment {
  id: string;
  amount: number;
  status: "PENDING" | "COMPLETED" | "FAILED" | "EXPIRED";
  razorpayOrderId: string | null;
  createdAt: string;
  user: {
    fullName: string | null;
    email: string;
  };
  festival: {
    name: string;
  } | null;
}

export function useSuperAdminPayments() {
  return useQuery<SuperAdminPayment[]>({
    queryKey: queryKeys.superAdmin.payments,
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<SuperAdminPayment[]>>(
        "/super-admin/payments",
      );
      return handleApiResponse(response.data);
    },
    staleTime: STALE_TIME.stable,
  });
}
