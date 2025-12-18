"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { usePaymentStatus } from "@/hooks/usePaymentStatus";

interface RazorpayOrder {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

async function createOrder(): Promise<RazorpayOrder> {
  const res = await fetch("/api/payments/create-order", { method: "POST" });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create order");
  }
  return res.json();
}

async function verifyPayment(payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<{ success: boolean }> {
  const res = await fetch("/api/payments/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Payment verification failed");
  return res.json();
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

import { Progress } from "@/components/ui/progress";

interface FestivalAccessCardProps {
  onCreateClick?: () => void;
  hasCreatedFestival?: boolean;
}

function BillingProgress({
  validFrom,
  validUntil,
}: {
  validFrom: Date;
  validUntil: Date;
}) {
  const total = validUntil.getTime() - validFrom.getTime();
  const elapsed = Date.now() - validFrom.getTime();
  const percentage = Math.min(100, Math.max(0, (elapsed / total) * 100));
  const daysLeft = Math.ceil(
    (validUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  return (
    <div className="space-y-2 mt-4">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{Math.round(percentage)}% of time elapsed</span>
        <span>{daysLeft > 0 ? `${daysLeft} days left` : "Expired"}</span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
}

export function FestivalAccessCard({
  onCreateClick,
  hasCreatedFestival,
}: FestivalAccessCardProps) {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: paymentStatus, isLoading } = usePaymentStatus();

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Failed to load payment gateway");
        return;
      }

      const order = await createOrder();
      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Greenroom",
        description: "Festival Pass - 30 Days",
        order_id: order.orderId,
        handler: async (response: any) => {
          try {
            await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.success(
              "Access Activated! You can now create your festival.",
            );
            queryClient.invalidateQueries({ queryKey: ["paymentStatus"] });
          } catch (error) {
            toast.error("Payment verification failed. Please contact support.");
          }
        },
        theme: { color: "#0F4C45" },
        modal: {
          ondismiss: () => setIsProcessing(false),
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", () => {
        toast.error("Payment failed. Please try again.");
        setIsProcessing(false);
      });
      razorpay.open();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment failed");
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const status = paymentStatus?.status || "NOT_PAID";
  const payment = paymentStatus?.payment;

  return (
    <Card className="border-l-4 border-l-primary/50 relative overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Festival Access Status
            </CardTitle>
            <CardDescription className="mt-1">
              {status === "NOT_PAID"
                ? "Purchase a pass to unlock festival creation."
                : status === "ACTIVE"
                  ? "You have active access to create/manage a festival."
                  : "Your festival access period has ended."}
            </CardDescription>
          </div>
          <StatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent>
        {status === "NOT_PAID" && (
          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-muted/40 rounded-lg border border-dashed">
            <div className="text-center sm:text-left flex-1">
              <div className="text-lg font-bold">₹1000 / 30 Days</div>
              <p className="text-sm text-muted-foreground">
                One-time payment. No auto-renewal.
              </p>
            </div>
            <Button onClick={handlePayment} disabled={isProcessing} size="lg">
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Activate Access
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}

        {status === "ACTIVE" && payment && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-green-50/50 dark:bg-green-950/20 border border-green-100 dark:border-green-900 rounded-md">
                <div className="text-xs text-muted-foreground uppercase font-semibold">
                  Valid From
                </div>
                <div className="text-sm font-medium mt-1">
                  {format(new Date(payment.validFrom), "MMM dd, yyyy")}
                </div>
              </div>
              <div className="p-3 bg-green-50/50 dark:bg-green-950/20 border border-green-100 dark:border-green-900 rounded-md">
                <div className="text-xs text-muted-foreground uppercase font-semibold">
                  Valid Until
                </div>
                <div className="text-sm font-medium mt-1 text-green-700 dark:text-green-400">
                  {format(new Date(payment.validUntil), "MMM dd, yyyy")}
                </div>
              </div>
            </div>

            {/* Visual Progress Section */}
            <BillingProgress
              validFrom={new Date(payment.validFrom)}
              validUntil={new Date(payment.validUntil)}
            />

            <div className="flex items-center gap-4 pt-2">
              <div className="flex-1">
                {hasCreatedFestival ? (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Status:</span>{" "}
                    You have used your festival creation pass. Manage your
                    festival in the dashboard below.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground mb-2">
                    <span className="font-medium text-foreground">
                      Next Step:
                    </span>{" "}
                    Create your festival. Your festival dates must fall within
                    this active period.
                  </p>
                )}
              </div>

              {/* Hide button if festival created */}
              {!hasCreatedFestival && onCreateClick && (
                <Button onClick={onCreateClick}>
                  Create Festival
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {status === "EXPIRED" && (
          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-red-50/50 dark:bg-red-950/20 rounded-lg border border-red-100 dark:border-red-900">
            <div className="text-center sm:text-left flex-1">
              <div className="text-lg font-bold text-red-600 dark:text-red-400">
                Access Expired
              </div>
              <p className="text-sm text-muted-foreground">
                Renew your pass to create new festivals.
              </p>
            </div>
            <Button
              onClick={handlePayment}
              disabled={isProcessing}
              variant="outline"
              className="border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900"
            >
              {isProcessing ? "Processing..." : "Renew Access (₹1000)"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200 px-3 py-1">
        <Check className="h-3 w-3 mr-1" />
        Active
      </Badge>
    );
  }
  if (status === "EXPIRED") {
    return (
      <Badge
        variant="outline"
        className="bg-red-50 text-red-800 border-red-200"
      >
        <AlertCircle className="h-3 w-3 mr-1" />
        Expired
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="bg-muted text-muted-foreground">
      Inactive
    </Badge>
  );
}
