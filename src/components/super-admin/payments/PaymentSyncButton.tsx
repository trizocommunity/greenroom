"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface PaymentSyncButtonProps {
  paymentId: string;
  providerId: string;
  variant?: "outline" | "secondary" | "ghost" | "default";
  size?: "sm" | "default" | "icon";
  className?: string;
  showText?: boolean;
}

export function PaymentSyncButton({
  paymentId,
  providerId,
  variant = "outline",
  size = "sm",
  className,
  showText = true,
}: PaymentSyncButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!providerId) {
      toast.error("No Razorpay order ID found to sync.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading(
      `Checking Razorpay for order ${providerId}...`,
    );

    try {
      const res = await fetch(
        `/api/v1/super-admin/payments/${encodeURIComponent(paymentId)}/sync`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error?.message || "Failed to sync status");
      }

      const data = json.data;

      if (data.synced && data.status === "PAID") {
        toast.success(data.message || "Payment verified and updated to PAID!", {
          id: toastId,
        });
        router.refresh();
      } else {
        toast.info(data.message || "Payment status checked with Razorpay.", {
          id: toastId,
        });
        router.refresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sync failed";
      toast.error(msg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSync}
      disabled={loading}
      className={`min-h-[38px] sm:min-h-[32px] gap-1.5 touch-manipulation ${className || ""}`}
      title="Check payment status directly with Razorpay"
    >
      <RefreshCw
        className={`w-3.5 h-3.5 ${loading ? "animate-spin text-primary" : ""}`}
      />
      {showText && <span>{loading ? "Checking..." : "Sync Gateway"}</span>}
      <span className="sr-only">Sync payment with Razorpay</span>
    </Button>
  );
}
