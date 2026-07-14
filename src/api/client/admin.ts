import { useQuery } from "@tanstack/react-query";
import type { AnalyticsData } from "@/components/super-admin/AnalyticsCharts";

const API_BASE = "/api/v1";

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!json.success) throw new Error(json.error.message);
  return json.data;
}

export function useSuperAdminAnalytics(initialData?: AnalyticsData) {
  return useQuery<AnalyticsData>({
    queryKey: ["super-admin", "analytics"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/super-admin/analytics`);
      return handleResponse<AnalyticsData>(res);
    },
    initialData,
    staleTime: 30 * 1000,
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
    queryKey: ["super-admin", "payments"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/super-admin/payments`);
      return handleResponse<SuperAdminPayment[]>(res);
    },
    staleTime: 2 * 60 * 1000,
  });
}
