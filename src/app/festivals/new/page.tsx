"use client";

import { ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import {
  PendingOrderExistsError,
  useInitiatePayment,
  useVerifyPayment,
} from "@/api/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PUBLIC_PRICING_TIERS } from "@/config/pricing";
import { loadRazorpay } from "@/core/integrations/razorpay";
import type { Tier } from "@/core/types/app-enums";
import { toast } from "@/lib/toast";

/**
 * Tier selection + payment page used by the Relaunch flow (SPEC §1.11).
 * Owners with an EXPIRED festival land here from the expired-detail page
 * or the expiry banner CTA, pick a tier, pay, and get redirected to
 * `/festival-setup?paymentId=...&from=<expiredSlug>` to set up the new
 * festival in context of their previous one.
 */
export default function NewFestivalPage() {
  return (
    <Suspense
      fallback={
        <div className="container max-w-4xl py-12 flex items-center justify-center text-muted-foreground">
          <Loader2 className="animate-spin mr-2 h-4 w-4" /> Loading...
        </div>
      }
    >
      <NewFestivalContent />
    </Suspense>
  );
}

function NewFestivalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromExpiredSlug = searchParams.get("from") ?? null;

  const initiateMutation = useInitiatePayment();
  const verifyMutation = useVerifyPayment();
  const [confirmationTier, setConfirmationTier] = useState<Tier | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  const handleConfirmPayment = async () => {
    if (!confirmationTier) return;
    setIsPaying(true);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error("Failed to load Razorpay SDK");

      let paymentId: string;
      let orderId: string;
      let amount: number;
      let currency: string;

      try {
        const orderRes = await initiateMutation.mutateAsync({
          tier: confirmationTier,
        });
        paymentId = orderRes.paymentId;
        orderId = orderRes.orderId;
        amount = orderRes.amount;
        currency = orderRes.currency;
      } catch (err) {
        // Resume the user's existing pending order for a different tier.
        if (err instanceof PendingOrderExistsError) {
          const resumeRes = await initiateMutation.mutateAsync({
            tier: err.details.tier,
          });
          paymentId = resumeRes.paymentId;
          orderId = resumeRes.orderId;
          amount = resumeRes.amount;
          currency = resumeRes.currency;
        } else {
          throw err;
        }
      }

      const razorpayKeyId = (window as any).rzp_key_id as string | undefined;

      await new Promise<void>((resolve, reject) => {
        const options = {
          key: razorpayKeyId,
          amount,
          currency,
          name: "Greenroom",
          description: `${confirmationTier} Festival`,
          order_id: orderId,
          modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
          handler: async (response: {
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              await verifyMutation.mutateAsync({
                razorpayOrderId: orderId,
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
        rzp.on("payment.failed", () => reject(new Error("Payment failed")));
        rzp.open();
      });

      const setupUrl = new URL("/festival-setup", window.location.origin);
      setupUrl.searchParams.set("paymentId", paymentId);
      if (fromExpiredSlug) {
        setupUrl.searchParams.set("from", fromExpiredSlug);
      }
      router.push(`${setupUrl.pathname}${setupUrl.search}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment failed";
      toast.error(message);
    } finally {
      setIsPaying(false);
      setConfirmationTier(null);
    }
  };

  return (
    <div className="container max-w-4xl py-12 space-y-8">
      <div className="space-y-2">
        <Badge
          variant="secondary"
          className="bg-primary/10 text-primary border-primary/20"
        >
          <Sparkles className="w-3 h-3 mr-1" /> Relaunch
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-heading">
          Launch your next festival
        </h1>
        <p className="text-muted-foreground">
          Your previous festival has expired. Pick a tier to launch a fresh
          festival with a new 90-day active duration. Operational data from your
          expired festival stays available for Manual Book download.
        </p>
        {fromExpiredSlug && (
          <p className="text-xs text-muted-foreground">
            Continuing from previous festival{" "}
            <Link
              href={`/profile/festivals/${fromExpiredSlug}/expired`}
              className="underline"
            >
              /{fromExpiredSlug}
            </Link>
            .
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {PUBLIC_PRICING_TIERS.map((tier) => (
          <Card
            key={tier.id}
            className={
              tier.isPopular
                ? "border-primary/30 shadow-premium relative overflow-hidden"
                : ""
            }
          >
            <CardHeader className="pb-2">
              {tier.isPopular && (
                <Badge className="w-fit mb-1.5 text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20 font-medium">
                  Recommended
                </Badge>
              )}
              <CardTitle className="text-xl font-semibold tracking-tight text-heading">
                {tier.name}
              </CardTitle>
              <CardDescription className="text-sm mt-0.5 line-clamp-2">
                {tier.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 space-y-4 pt-0">
              <div className="text-2xl font-semibold tracking-tight text-heading">
                ₹{tier.price}
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  /festival
                </span>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted-foreground flex-1 min-h-0">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate" title={feature}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
              <Button
                size="sm"
                className="w-full font-medium mt-auto rounded-full shadow-primary-glow hover:opacity-90 transition-opacity"
                onClick={() => setConfirmationTier(tier.id as Tier)}
                disabled={isPaying}
              >
                {isPaying && confirmationTier === tier.id ? (
                  <Loader2 className="animate-spin mr-2 h-3.5 w-3.5" />
                ) : null}
                Pay &amp; Continue
                <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog
        open={!!confirmationTier}
        onOpenChange={(open) => !open && setConfirmationTier(null)}
      >
        <AlertDialogContent className="left-[50%] top-[50%] -translate-x-1/2 -translate-y-1/2 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg rounded-xl border border-border/80 bg-background shadow-2xl data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Please note that once the payment is completed, it is{" "}
              <span className="font-bold text-destructive">non-refundable</span>
              . Do you wish to proceed with the transaction?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPayment}>
              I Understand, Proceed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
