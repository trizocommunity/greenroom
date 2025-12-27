"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { loadRazorpay } from "@/lib/razorpay";
import { queryKeys } from "@/lib/query-keys";
import {
  initiateFestivalPayment,
  verifyFestivalPayment,
} from "@/server/actions/payment.actions";
import { checkUnusedCredit } from "@/server/actions/billing.actions";

export function useFestivalPayment() {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handlePay = async (tier: any, onSuccess?: (credit: any) => void) => {
    setLoading(true);
    try {
      const isLoaded = await loadRazorpay();
      if (!isLoaded) {
        toast.error("Error", { description: "Razorpay SDK failed to load" });
        return;
      }

      // 1. Initiate Payment
      const result = await initiateFestivalPayment(tier);
      if (!result.success) {
        throw new Error(result.error || "Failed to initiate payment");
      }

      const { data } = result;

      // 2. Open Razorpay Modal
      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: "Greenroom v3",
        description: `${tier} Plan Festival Creation`,
        order_id: data.orderId,
        handler: async (response: any) => {
          try {
            const verifyRes = await verifyFestivalPayment(
              data.paymentId,
              response.razorpay_payment_id,
              response.razorpay_signature,
            );

            if (verifyRes.success) {
              toast.success(
                "Payment successful! You can now create your festival.",
              );

              // Invalidate queries to refresh data
              queryClient.invalidateQueries({
                queryKey: queryKeys.payments.all(),
              });
              queryClient.invalidateQueries({
                queryKey: queryKeys.festivals.all(),
              });

              onSuccess?.(null); // Keep for compatibility if needed, pass null as we query separately
            } else {
              toast.error("Verification Failed", {
                description: verifyRes.error || "Failed to verify payment",
              });
            }
          } catch (err) {
            console.error("Verification handler error:", err);
            toast.error("Error", {
              description: "An error occurred during verification",
            });
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
        prefill: {
          name: "",
          email: "",
        },
        theme: {
          color: "#0f172a", // Match theme
        },
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
    } catch (error: any) {
      console.error("handlePay error:", error);
      toast.error("Error", {
        description: error.message || "Something went wrong",
      });
      setLoading(false);
    } finally {
      // Note: loading state is also handled in ondismiss and handlePay catch
    }
  };

  return {
    handlePay,
    loading,
  };
}
