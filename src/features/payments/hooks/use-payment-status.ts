import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/core/http/query-keys";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { paymentApi } from "@/features/payments/api/payment.api";

export interface PaymentStatus {
  status: "NOT_PAID" | "ACTIVE" | "EXPIRED";
  payment?: {
    id: string;
    amount: number;
    validFrom: string;
    validUntil: string;
    createdAt: string;
  } | null;
  canCreateFestival: boolean;
}

export function usePaymentStatus() {
  const { data: user } = useCurrentUser();

  return useQuery({
    queryKey: queryKeys.payments.status(user?.id),
    queryFn: paymentApi.getStatus,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
    enabled: !!user?.id,
  });
}
