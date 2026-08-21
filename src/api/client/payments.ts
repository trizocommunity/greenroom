import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  InitiatePaymentInput,
  InitiatePaymentResponse,
  InitiatePaymentSuccess,
  PaymentHistoryItem,
  PendingOrderExists,
  UserStatus,
  VerifyPaymentInput,
  VerifyPaymentResponse,
} from "@/api/contracts/payments";
import { loadRazorpay } from "@/core/integrations/razorpay";
import type { Tier } from "@/core/types/app-enums";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import { STALE_TIME } from "@/lib/query-utils";
import { queryKeys } from "./_query-keys";

/**
 * Thrown by `useInitiatePayment.mutateAsync` when the server rejects with
 * HTTP 409 + `PENDING_ORDER_EXISTS` — i.e. the user already has an
 * in-flight order for a different tier. Carries the existing order's
 * paymentId/orderId/tier so the UI can resume the existing checkout
 * instead of forcing the user to start over.
 */
export class PendingOrderExistsError extends Error {
  readonly code = "PENDING_ORDER_EXISTS" as const;
  constructor(readonly details: PendingOrderExists) {
    super(
      `You already have a pending ${details.tier} order. Complete or cancel it before starting a new one.`,
    );
    this.name = "PendingOrderExistsError";
  }
}

function isPendingOrderExists(
  value: InitiatePaymentResponse,
): value is PendingOrderExists {
  return "outcome" in value && value.outcome === "pendingExists";
}

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
    staleTime: STALE_TIME.standard,
  });
}

export function useInitiatePayment() {
  return useMutation<InitiatePaymentSuccess, Error, InitiatePaymentInput>({
    mutationFn: async (data): Promise<InitiatePaymentSuccess> => {
      try {
        const response = await apiClient.post<
          ApiResponse<InitiatePaymentResponse>
        >("/payments", { data });
        const result = await handleApiResponse(response.data);
        if (isPendingOrderExists(result)) {
          throw new PendingOrderExistsError(result);
        }
        return result;
      } catch (err) {
        // Axios rejects on non-2xx. The route returns HTTP 409 with
        // success:false for PENDING_ORDER_EXISTS — re-throw as typed
        // error so callers can branch on `.code` and resume the existing
        // order instead of showing a generic failure toast.
        const body = (err as { response?: { data?: unknown } } | null)?.response
          ?.data;
        if (
          body &&
          typeof body === "object" &&
          (body as { error?: { code?: string; details?: unknown } }).error
            ?.code === "PENDING_ORDER_EXISTS"
        ) {
          const details = (
            body as {
              error?: { details?: PendingOrderExists };
            }
          ).error?.details;
          if (details && isPendingOrderExists(details)) {
            throw new PendingOrderExistsError(details);
          }
        }
        throw err;
      }
    },
  });
}

export function useVerifyPayment() {
  const queryClient = useQueryClient();

  return useMutation<VerifyPaymentResponse, Error, VerifyPaymentInput>({
    mutationFn: async (data) => {
      const response = await apiClient.post<ApiResponse<VerifyPaymentResponse>>(
        "/payments/verify",
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.billing.unusedCredit,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.status });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.history });
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
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
    staleTime: STALE_TIME.standard,
  });
}

export function useFestivalPayment() {
  const initiateMutation = useInitiatePayment();
  const verifyMutation = useVerifyPayment();

  const openRazorpay = (params: {
    orderId: string;
    amount: number;
    currency: string;
    description: string;
  }): Promise<void> => {
    const razorpayKeyId = (window as any).rzp_key_id as string | undefined;
    return new Promise<void>((resolve, reject) => {
      const options = {
        key: razorpayKeyId,
        amount: params.amount,
        currency: params.currency,
        name: "Greenroom",
        description: params.description,
        order_id: params.orderId,
        modal: {
          ondismiss: () => reject(new Error("Payment cancelled")),
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await verifyMutation.mutateAsync({
              razorpayOrderId: params.orderId,
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

  const handlePay = async (tier: Tier) => {
    const loaded = await loadRazorpay();
    if (!loaded) {
      throw new Error("Failed to load Razorpay SDK");
    }

    let orderId: string;
    let amount: number;
    let currency: string;

    try {
      const orderRes = await initiateMutation.mutateAsync({ tier });
      orderId = orderRes.orderId;
      amount = orderRes.amount;
      currency = orderRes.currency;
    } catch (err) {
      // User already has a pending order for a different tier. Resume it
      // instead of forcing them to start over — the Razorpay checkout
      // works identically against an existing order_id.
      if (
        err instanceof PendingOrderExistsError &&
        err.details.orderId.length > 0
      ) {
        const resumeTier = err.details.tier;
        // We don't have amount/currency for the resume path without
        // re-fetching. Round-trip through the server by re-initiating for
        // the *existing* tier; that returns the same pending row via the
        // reuse branch with full amount/currency.
        const orderRes = await initiateMutation.mutateAsync({
          tier: resumeTier,
        });
        orderId = orderRes.orderId;
        amount = orderRes.amount;
        currency = orderRes.currency;
        return openRazorpay({
          orderId,
          amount,
          currency,
          description: `${resumeTier} Festival`,
        });
      }
      throw err;
    }

    return openRazorpay({
      orderId,
      amount,
      currency,
      description: `${tier} Festival`,
    });
  };

  return {
    handlePay,
    loading: initiateMutation.isPending || verifyMutation.isPending,
  };
}
