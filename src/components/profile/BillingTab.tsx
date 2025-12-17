"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Check,
  Clock,
  CreditCard,
  RefreshCw,
  Shield,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
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

interface PaymentStatus {
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

async function fetchPaymentStatus(): Promise<PaymentStatus> {
  const res = await fetch("/api/payments/status");
  if (!res.ok) throw new Error("Failed to fetch payment status");
  return res.json();
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

import { type Festival, useFestivals } from "@/hooks/useFestivals";

export function BillingTab() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: paymentStatus } = useQuery({
    queryKey: ["paymentStatus"],
    queryFn: fetchPaymentStatus,
  });

  const { data: festivals = [] } = useFestivals();

  const handlePayment = async () => {
    setIsProcessing(true);

    try {
      // Load Razorpay script
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Failed to load payment gateway");
        return;
      }

      // Create order
      const order = await createOrder();

      // Open Razorpay checkout
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

            toast.success("Payment successful! You can now create a festival.");
            queryClient.invalidateQueries({ queryKey: ["paymentStatus"] });
          } catch (error) {
            toast.error("Payment verification failed. Please contact support.");
          }
        },
        prefill: {},
        theme: { color: "#0F4C45" },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", (response: any) => {
        toast.error("Payment failed. Please try again.");
        setIsProcessing(false);
      });
      razorpay.open();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Payment failed";
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const status = paymentStatus?.status || "NOT_PAID";
  const payment = paymentStatus?.payment;

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Status
              </CardTitle>
              <CardDescription>
                Manage your festival creation access
              </CardDescription>
            </div>
            <StatusBadge status={status} />
          </div>
        </CardHeader>
        <CardContent>
          {status === "NOT_PAID" && (
            <NotPaidState onPay={handlePayment} isPending={isProcessing} />
          )}
          {status === "ACTIVE" && payment && (
            <ActiveState payment={payment} festivals={festivals} />
          )}
          {status === "EXPIRED" && (
            <ExpiredState onRenew={handlePayment} isPending={isProcessing} />
          )}
        </CardContent>
      </Card>

      {/* Trust Section */}
      <Card className="bg-muted/30">
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span>Secure Payment</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span>Powered by Razorpay</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span>30-Day Validity</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "NOT_PAID") {
    return (
      <Badge
        variant="secondary"
        className="bg-amber-100 text-amber-800 border-amber-200"
      >
        <Clock className="h-3 w-3 mr-1" />
        Payment Required
      </Badge>
    );
  }
  if (status === "ACTIVE") {
    return (
      <Badge
        variant="secondary"
        className="bg-green-100 text-green-800 border-green-200"
      >
        <Check className="h-3 w-3 mr-1" />
        Active
      </Badge>
    );
  }
  if (status === "EXPIRED") {
    return (
      <Badge
        variant="secondary"
        className="bg-red-100 text-red-800 border-red-200"
      >
        <AlertCircle className="h-3 w-3 mr-1" />
        Expired
      </Badge>
    );
  }
  return null;
}

function NotPaidState({
  onPay,
  isPending,
}: {
  onPay: () => void;
  isPending: boolean;
}) {
  return (
    <div className="text-center py-6">
      <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
        <CreditCard className="h-8 w-8 text-amber-600" />
      </div>
      <h3 className="text-lg font-semibold mb-2">
        Complete Payment to Create a Festival
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Pay once to unlock full festival management capabilities for 30 days.
      </p>

      {/* Price Display */}
      <div className="bg-muted/50 rounded-lg p-4 mb-6 max-w-xs mx-auto">
        <div className="text-3xl font-bold text-foreground">₹1000</div>
        <div className="text-sm text-muted-foreground">
          One-time payment · 30 days validity
        </div>
      </div>

      <Button
        onClick={onPay}
        disabled={isPending}
        size="lg"
        className="h-12 px-8"
      >
        {isPending ? (
          <>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            Pay ₹1000
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}

function ActiveState({
  payment,
  festivals,
}: {
  payment: { validFrom: string; validUntil: string; createdAt: string };
  festivals: Festival[];
}) {
  const validFrom = new Date(payment.validFrom);
  const validUntil = new Date(payment.validUntil);
  const createdFestival = festivals.length > 0 ? festivals[0] : null;

  if (createdFestival) {
    return (
      <div className="text-center py-6">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Active Festival Plan</h3>
        <p className="text-muted-foreground mb-6">
          You have an active plan for <strong>{createdFestival.name}</strong>.
        </p>

        {/* Festival & Validity Info */}
        <div className="bg-muted/50 rounded-lg p-6 max-w-md mx-auto space-y-4">
          {/* Festival Details */}
          <div className="flex items-center justify-between pb-4 border-b border-border/50">
            <div className="text-left">
              <div className="text-sm text-muted-foreground">Festival Name</div>
              <div className="font-medium text-lg">{createdFestival.name}</div>
            </div>
            <Badge variant="outline" className="uppercase">
              {createdFestival.status}
            </Badge>
          </div>

          {/* Validity Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm pt-2">
            <div className="text-left">
              <div className="text-muted-foreground">Plan Started</div>
              <div className="font-medium">
                {format(validFrom, "dd MMM yyyy")}
              </div>
            </div>
            <div className="text-right">
              <div className="text-muted-foreground">Plan Expires</div>
              <div className="font-medium text-green-600">
                {format(validUntil, "dd MMM yyyy")}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 text-sm text-muted-foreground">
          <p>
            Need to organize another festival? Only one active festival is
            allowed per plan.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-6">
      <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
        <Sparkles className="h-8 w-8 text-blue-600" />
      </div>
      <h3 className="text-lg font-semibold mb-2">You Can Create a Festival!</h3>
      <p className="text-muted-foreground mb-6">
        Your payment was successful. You are now eligible to create and host
        your festival.
      </p>

      {/* Validity Info */}
      <div className="bg-muted/50 rounded-lg p-4 max-w-sm mx-auto mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Payment Date</div>
            <div className="font-medium">
              {format(validFrom, "dd MMM yyyy")}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Valid Until</div>
            <div className="font-medium text-green-600">
              {format(validUntil, "dd MMM yyyy")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExpiredState({
  onRenew,
  isPending,
}: {
  onRenew: () => void;
  isPending: boolean;
}) {
  return (
    <div className="text-center py-6">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="h-8 w-8 text-red-600" />
      </div>
      <h3 className="text-lg font-semibold mb-2">
        Your Festival Pass Has Expired
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Renew your pass to create new festivals. Your existing festivals remain
        accessible in read-only mode.
      </p>

      {/* Price Display */}
      <div className="bg-muted/50 rounded-lg p-4 mb-6 max-w-xs mx-auto">
        <div className="text-3xl font-bold text-foreground">₹1000</div>
        <div className="text-sm text-muted-foreground">
          Renew for another 30 days
        </div>
      </div>

      <Button
        onClick={onRenew}
        disabled={isPending}
        size="lg"
        className="h-12 px-8"
      >
        {isPending ? (
          <>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            Renew Pass
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}
