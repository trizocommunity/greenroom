import { useMutation, useQuery } from "@tanstack/react-query";
import type { Tier } from "@/core/types/app-enums";
import { loadRazorpay } from "@/core/integrations/razorpay";
import type {
  InitiatePaymentInput,
  InitiatePaymentResponse,
  PaymentHistoryItem,
  UserStatus,
  VerifyPaymentInput,
  VerifyPaymentResponse,
} from "@/api/contracts/payments";

const API_BASE = "/api/v1";

interface InitiatePaymentResult {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  key: string | undefined;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!json.success) throw new Error(json.error.message);
  return json.data;
}

export function usePaymentStatus() {
  return useQuery<{ status: UserStatus; history: PaymentHistoryItem[] }>({
    queryKey: ["payments", "status"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/payments`);
      return handleResponse<{ status: UserStatus; history: PaymentHistoryItem[] }>(res);
    },
    staleTime: 30 * 1000,
  });
}

export function useInitiatePayment() {
  return useMutation<InitiatePaymentResponse, Error, InitiatePaymentInput>({
    mutationFn: async (data) => {
      const res = await fetch(`${API_BASE}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      return handleResponse<InitiatePaymentResponse>(res);
    },
  });
}

export function useVerifyPayment() {
  return useMutation<VerifyPaymentResponse, Error, VerifyPaymentInput>({
    mutationFn: async (data) => {
      const res = await fetch(`${API_BASE}/payments/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      return handleResponse<VerifyPaymentResponse>(res);
    },
  });
}

export function usePaymentHistory() {
  return useQuery<PaymentHistoryItem[]>({
    queryKey: ["payments", "history"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/payments`);
      return handleResponse<PaymentHistoryItem[]>(res);
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
