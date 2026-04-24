import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/core/http/query-keys";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { paymentApi } from "@/features/payments/api/payment.api";

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "EXPIRED";
  razorpayOrderId: string | null;
  razorpayId: string | null;
  createdAt: string;
  validFrom: string;
  validUntil: string;
  festival?: {
    name: string;
  };
}

export function usePaymentHistory() {
  const { data: user } = useCurrentUser();

  return useQuery({
    queryKey: queryKeys.payments.history(user?.id),
    queryFn: paymentApi.getHistory,
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!user?.id,
  });
}
