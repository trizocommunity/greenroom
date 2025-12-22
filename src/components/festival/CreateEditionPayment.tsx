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
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function CreateEditionPayment({ festivalId }: { festivalId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCreatePayment = async () => {
    setLoading(true);
    try {
      const res = await loadRazorpay();
      if (!res) {
        toast.error("Razorpay SDK failed to load. Are you online?");
        setLoading(false);
        return;
      }

      // 1. Initiate Payment
      const initiateRes = await fetch("/api/edition/payment/initiate", {
        method: "POST",
      });
      const orderData = await initiateRes.json();

      if (!initiateRes.ok) {
        throw new Error(orderData.error || "Failed to initiate payment");
      }

      // 2. Open Razorpay
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // Ensure this ENV is available to client
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Greenroom Festival",
        description: "Activate New Edition",
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            // 3. Verify & Create Edition
            const verifyRes = await fetch("/api/edition/payment/success", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(
                verifyData.error || "Payment verification failed",
              );
            }

            toast.success("Success! Edition created and festival unlocked.");

            router.refresh();

            if (verifyData.redirect) {
              router.push(verifyData.redirect);
            }
            // Fallback handled by refresh if staying on same list
          } catch (error: any) {
            toast.error(error.message || "Activation Failed");
          }
        },
        prefill: {
          // name: user.name, // If we had user details here
          // email: user.email,
        },
        theme: {
          color: "#000000", // Customize color
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-primary">Create New Edition</CardTitle>
        <CardDescription>
          Activate a new edition for ₹1500. Unlocks festival for 90 days.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground mb-4">
          <li>90 Days Execution Window</li>
          <li>Unlimited Participants & Events</li>
          <li>Results Publishing</li>
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleCreatePayment}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Pay ₹1500 & Create
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
