import { useQuery } from "@tanstack/react-query";
import { paymentApi } from "@/services/payment.api";

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
  return useQuery({
    queryKey: ["paymentStatus"],
    queryFn: paymentApi.getStatus,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
