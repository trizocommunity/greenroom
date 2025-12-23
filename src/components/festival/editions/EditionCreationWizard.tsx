"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { EditionTier } from "@prisma/client"; // Added type
import { TierSelection } from "@/components/festival/editions/TierSelection";
import {
  initiateEditionPayment,
  finalizeEditionPayment,
} from "@/server/actions/payment.actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { TIER_CONFIG } from "@/config/pricing";

interface EditionCreationWizardProps {
  festivalId: string;
  festivalSlug: string;
  userId: string;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function EditionCreationWizard({
  festivalId,
  festivalSlug,
  userId,
}: EditionCreationWizardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTier, setSelectedTier] = useState<EditionTier | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Preload Razorpay SDK
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleTierSelect = (tier: EditionTier) => {
    setSelectedTier(tier);
    setShowConfirmation(true);
  };

  const proceedToPayment = async () => {
    if (!selectedTier) return;
    setIsProcessing(true);
    const tier = selectedTier;
    try {
      if (!window.Razorpay) {
        throw new Error(
          "Razorpay SDK not loaded. Please check your internet connection.",
        );
      }

      // 1. Initiate Payment
      const result = await initiateEditionPayment(festivalId, tier, userId);

      if (!result.success) {
        throw new Error(result.error || "Failed to initiate payment");
      }

      if (!result.data) {
        throw new Error("No payment data received");
      }

      const { orderId, amount, currency, key, paymentId } = result.data;

      // 2. Open Razorpay Modal
      const options = {
        key: key,
        amount: amount,
        currency: currency,
        name: "Greenroom Festival",
        description: `Activate ${tier} Edition`,
        order_id: orderId,
        handler: async (response: any) => {
          // Arrow function
          try {
            toast.loading("Verifying payment and creating edition...");

            // 3. Finalize
            const finalizeResult = await finalizeEditionPayment(
              paymentId,
              response.razorpay_payment_id,
              response.razorpay_signature,
            );

            if (!finalizeResult.success) {
              throw new Error(
                finalizeResult.error || "Payment verification failed",
              );
            }

            toast.success("Edition created successfully! Redirecting...");
            router.push(`/festival/${festivalSlug}`);
          } catch (err: any) {
            console.error("Verification error:", err);
            toast.error(err.message || "Failed to verify payment");
          } finally {
            setIsProcessing(false);
            toast.dismiss();
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            toast.info("Payment cancelled");
          },
        },
        theme: {
          color: "#000000",
        },
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.on("payment.failed", (response: any) => {
        // Arrow function
        toast.error(response.error.description || "Payment failed");
        setIsProcessing(false);
      });
      rzp1.open();
    } catch (error: any) {
      console.error("Payment flow error:", error);
      toast.error(error.message || "An error occurred");
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full">
      <TierSelection
        festivalId={festivalId}
        onSelect={handleTierSelect}
        isProcessing={isProcessing}
      />

      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">
              Confirm Edition Details
            </DialogTitle>
            <DialogDescription className="text-center text-zinc-400">
              Please review your selection before proceeding to payment.
            </DialogDescription>
          </DialogHeader>

          {selectedTier && TIER_CONFIG[selectedTier] && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-900 border border-zinc-800">
                <span className="text-sm font-medium text-zinc-400">Tier</span>
                <span className="text-lg font-bold text-primary">
                  {TIER_CONFIG[selectedTier].label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
                  <div className="text-zinc-500 text-xs mb-1">Duration</div>
                  <div className="font-semibold">
                    {TIER_CONFIG[selectedTier].durationDays} Days
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
                  <div className="text-zinc-500 text-xs mb-1">Price</div>
                  <div className="font-semibold">
                    ₹{TIER_CONFIG[selectedTier].price}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-zinc-500 ml-1">
                  Limits included:
                </div>
                <ul className="grid grid-cols-2 gap-2 text-xs">
                  <li className="flex items-center gap-2 text-zinc-300">
                    <Check className="w-3 h-3 text-green-500" />
                    {TIER_CONFIG[selectedTier].limits.participants} Participants
                  </li>
                  <li className="flex items-center gap-2 text-zinc-300">
                    <Check className="w-3 h-3 text-green-500" />
                    {TIER_CONFIG[selectedTier].limits.events} Events
                  </li>
                  <li className="flex items-center gap-2 text-zinc-300">
                    <Check className="w-3 h-3 text-green-500" />
                    {TIER_CONFIG[selectedTier].limits.judges} Judges
                  </li>
                  <li className="flex items-center gap-2 text-zinc-300">
                    <Check className="w-3 h-3 text-green-500" />
                    {TIER_CONFIG[selectedTier].limits.storageMB < 1024
                      ? `${TIER_CONFIG[selectedTier].limits.storageMB} MB`
                      : `${TIER_CONFIG[selectedTier].limits.storageMB / 1024} GB`}{" "}
                    Storage
                  </li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowConfirmation(false)}
              disabled={isProcessing}
              className="w-full sm:w-auto border-zinc-700 hover:bg-zinc-800 text-zinc-300"
            >
              Cancel
            </Button>
            <Button
              onClick={proceedToPayment}
              disabled={isProcessing}
              className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm & Pay"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
