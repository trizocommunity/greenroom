"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TIER_CONFIG } from "@/config/pricing";
import {
  initiatePayment,
  verifyPayment,
} from "@/server/actions/billing.actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Helper to load Razorpay script
const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export function OverviewTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handlePay = async (tier: any) => {
    setLoading(true);
    try {
      const res = await loadRazorpay();
      if (!res) {
        toast({
          title: "Error",
          description: "Razorpay SDK failed to load",
          variant: "destructive",
        });
        return;
      }

      // 1. Initiate
      const result = await initiatePayment("NEW_EDITION", tier); // Hardcoded purpose for now per requirement
      if (!result.success || !result.data) {
        throw new Error(result.error);
      }

      const { data } = result;

      // 2. Open Razorpay
      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: "Greenroom v2",
        description: "New Edition Credit",
        order_id: data.orderId,
        handler: async function (response: any) {
          try {
            const verifyRes = await verifyPayment(
              data.paymentId,
              response.razorpay_payment_id,
              response.razorpay_signature,
            );
            if (verifyRes.success) {
              toast({
                title: "Success",
                description: "Payment successful! Credit added.",
              });
            } else {
              toast({
                title: "Verification Failed",
                description: verifyRes.error,
                variant: "destructive",
              });
            }
          } catch (err) {
            toast({
              title: "Error",
              description: "Verification error",
              variant: "destructive",
            });
          }
        },
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(TIER_CONFIG).map(([key, tier]: [string, any]) => (
          <Card key={key} className="flex flex-col">
            <CardHeader>
              <CardTitle>{tier.label}</CardTitle>
              <CardDescription>{tier.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="text-3xl font-bold">₹{tier.price}</div>
              <ul className="mt-4 space-y-2 text-sm text-neutral-400">
                <li>{tier.durationDays} Days Duration</li>
                <li>{tier.limits.participants} Participants</li>
                <li>{tier.limits.events} Events</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={() => handlePay(key)}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                ) : null}
                Buy Credit
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
