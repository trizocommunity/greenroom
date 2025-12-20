import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import api from "@/lib/axios";

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
  return useQuery({
    queryKey: queryKeys.payments.all(),
    queryFn: async (): Promise<SuperAdminPayment[]> => {
      const { data } = await api.get<SuperAdminPayment[]>(
        "/super-admin/payments",
      );
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Export type alias for backward compatibility
export type Payment = SuperAdminPayment;
