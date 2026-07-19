import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  InitiatePaymentInput,
  InitiatePaymentResponse,
  PaymentHistoryItem,
  UserStatus,
  VerifyPaymentInput,
  VerifyPaymentResponse,
} from "@/api/contracts/payments";
import { loadRazorpay } from "@/core/integrations/razorpay";
import type { Tier } from "@/core/types/app-enums";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import { queryKeys } from "./_query-keys";

export function usePaymentStatus() {
  return useQuery<{ status: UserStatus; history: PaymentHistoryItem[] }>({
    queryKey: queryKeys.payments.status,
    queryFn: async () => {
      const response =
        await apiClient.get<
          ApiResponse<{
            status: UserStatus;
            history: PaymentHistoryItem[];
          }>
        >("/payments");
      return handleApiResponse(response.data);
    },
    staleTime: 30 * 1000,
  });
}

export function useInitiatePayment() {
  return useMutation<InitiatePaymentResponse, Error, InitiatePaymentInput>({
    mutationFn: async (data) => {
      const response = await apiClient.post<
        ApiResponse<InitiatePaymentResponse>
      >("/payments", { data });
      return handleApiResponse(response.data);
    },
  });
}

export function useVerifyPayment() {
  return useMutation<VerifyPaymentResponse, Error, VerifyPaymentInput>({
    mutationFn: async (data) => {
      const response = await apiClient.post<ApiResponse<VerifyPaymentResponse>>(
        "/payments/verify",
        { data },
      );
      return handleApiResponse(response.data);
    },
  });
}

export function usePaymentHistory() {
  return useQuery<{ status: UserStatus; history: PaymentHistoryItem[] }>({
    queryKey: queryKeys.payments.history,
    queryFn: async () => {
      const response =
        await apiClient.get<
          ApiResponse<{
            status: UserStatus;
            history: PaymentHistoryItem[];
          }>
        >("/payments");
      return handleApiResponse(response.data);
    },
    staleTime: 30 * 1000,
  });
}

export function useFestivalPayment() {
  const initiateMutation = useInitiatePayment();
  const verifyMutation = useVerifyPayment();

  const handlePay = async (tier: Tier) => {
    const loaded = await loadRazorpay();
    if (!loaded) {
      throw new Error("Failed to load Razorpay SDK");
    }

    const orderRes = await initiateMutation.mutateAsync({ tier });
    const razorpayKeyId = (window as any).rzp_key_id as string | undefined;

    return new Promise<void>((resolve, reject) => {
      const options = {
        key: razorpayKeyId,
        amount: orderRes.amount,
        currency: orderRes.currency,
        name: "Greenroom",
        description: `${tier} Festival`,
        order_id: orderRes.orderId,
        modal: {
          ondismiss: () => reject(new Error("Payment cancelled")),
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await verifyMutation.mutateAsync({
              razorpayOrderId: orderRes.orderId,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            resolve();
          } catch {
            reject(new Error("Payment verification failed"));
          }
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", () => {
        reject(new Error("Payment failed"));
      });
      rzp.open();
    });
  };

  return {
    handlePay,
    loading: initiateMutation.isPending || verifyMutation.isPending,
  };
}
