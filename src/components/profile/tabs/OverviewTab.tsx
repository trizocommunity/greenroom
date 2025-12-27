"use client";

import { ArrowRight, Check, Loader2, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { PRICING_TIERS } from "@/config/pricing";
import { useFestivalPayment } from "@/hooks/useFestivalPayment";
import { useMyFestival } from "@/hooks/useFestivals";
import { useUnusedCredit } from "@/hooks/useUnusedCredit";
import { FestivalCard } from "../FestivalCard";
import { CreateFestivalModal } from "../CreateFestivalModal";
import { EditFestivalModal } from "../EditFestivalModal";
import { Skeleton } from "@/components/ui/skeleton";
import { FestivalCardSkeleton } from "@/components/ui/Skeletons";

interface OverviewTabProps {
  displayName: string;
}

export function OverviewTab({ displayName }: OverviewTabProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [confirmationTier, setConfirmationTier] = useState<string | null>(null);

  const { data: festival, isLoading: isFestivalLoading } = useMyFestival();
  const { data: credit, isLoading: isCreditLoading } = useUnusedCredit();
  const { handlePay, loading: isPaymentProcessing } = useFestivalPayment();

  const isInitialLoading = isFestivalLoading || isCreditLoading;

  const standardTier = PRICING_TIERS.find((t) => t.id === "STANDARD");
  const basicTier = PRICING_TIERS.find((t) => t.id === "BASIC");
  const proTier = PRICING_TIERS.find((t) => t.id === "PRO");

  const handlePayClick = (tierId: string) => {
    setConfirmationTier(tierId);
  };

  const handleConfirmPayment = () => {
    if (confirmationTier) {
      handlePay(confirmationTier);
      setConfirmationTier(null);
    }
  };

  if (!standardTier || !basicTier || !proTier) return null;

  if (isInitialLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
        </div>
        <FestivalCardSkeleton />
      </div>
    );
  }

  // 1. Active or Expired Festival State
  if (festival) {
    const isExpired =
      festival.status === "EXPIRED" ||
      (festival.expiresAt && new Date(festival.expiresAt) < new Date());

    if (!isExpired) {
      // ACTIVE FESTIVAL
      return (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="space-y-2">
            <h2 className="text-3xl uppercase tracking-tighter text-foreground">
              <span className="font-medium">Welcome Back, </span>
              <span className="text-primary font-black">{displayName}</span>
            </h2>
          </div>

          <FestivalCard
            festival={festival}
            onEdit={() => setIsEditModalOpen(true)}
          />

          <EditFestivalModal
            open={isEditModalOpen}
            festival={festival}
            onOpenChange={setIsEditModalOpen}
          />
        </div>
      );
    }
    // Fallthrough: If expired, we show credit/payment screens below (with alert)
  }

  // 2. Unused Credit State
  if (credit) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="space-y-2">
          <h2 className="text-3xl uppercase tracking-tighter text-foreground">
            <span className="font-medium">You're All Set, </span>
            <span className="text-primary font-black">{displayName}</span>
            <span className="font-medium">!</span>
          </h2>
          <p className="text-muted-foreground">
            You have a valid credit available. You can now create your festival.
          </p>
        </div>

        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/20 rounded-full">
                <Check className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle>Credit Available</CardTitle>
                <CardDescription>
                  {credit.tier} Plan Credit &bull; {credit.amount} INR
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              size="lg"
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Festival Now
            </Button>
          </CardContent>
        </Card>

        <CreateFestivalModal
          open={isCreateModalOpen}
          paymentId={credit.id}
          onOpenChange={setIsCreateModalOpen}
        />
      </div>
    );
  }

  // 3. No Festival OR Expired Festival -> Show Payment Plans
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-2">
        <h2 className="text-3xl uppercase tracking-tighter text-foreground">
          <span className="font-medium">Welcome, </span>
          <span className="text-primary font-black">{displayName}</span>
          <span className="font-medium">!</span>
        </h2>

        {festival && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-md mb-4 border border-destructive/20">
            <p className="font-semibold">Your previous festival has expired.</p>
            <p className="text-sm opacity-80">
              To assign a new festival, please purchase a plan below.
            </p>
          </div>
        )}

        <p className="text-muted-foreground">
          Ready to launch your next big event? Choose a plan below to get
          started.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* STANDARD PLAN - Full Width */}
        <Card className="md:col-span-2 border-primary/20 bg-linear-to-br from-primary/5 via-background to-background relative overflow-hidden group hover:border-primary/40 transition-all duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-50">
            <Sparkles className="w-24 h-24 text-primary/10" />
          </div>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <Badge className="mb-2 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 font-medium">
                  Most Popular
                </Badge>
                <CardTitle className="text-2xl md:text-3xl font-black">
                  {standardTier.name} Plan
                </CardTitle>
                <CardDescription className="text-base mt-2 max-w-2xl">
                  {standardTier.description}
                </CardDescription>
              </div>
              <div className="hidden md:block text-right">
                <span className="text-3xl font-bold">
                  ₹{standardTier.price}
                </span>
                <span className="text-muted-foreground">/festival</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-6">
            <div className="col-span-2 grid grid-cols-2 gap-x-6 gap-y-2">
              {standardTier.features.map((feature, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  {feature}
                </div>
              ))}
            </div>
            <div className="flex items-end justify-end">
              <Button
                size="lg"
                className="w-full md:w-auto font-semibold shadow-lg shadow-primary/20"
                onClick={() => handlePayClick(standardTier.id)}
                disabled={isPaymentProcessing}
              >
                {isPaymentProcessing && confirmationTier === standardTier.id ? (
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                ) : null}
                Pay to Proceed
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* BASIC PLAN */}
        <Card className="hover:border-primary/30 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-xl">{basicTier.name} Plan</CardTitle>
            <CardDescription>{basicTier.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-2xl font-bold">
              ₹{basicTier.price}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                /festival
              </span>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {basicTier.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-muted-foreground/70 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handlePayClick(basicTier.id)}
              disabled={isPaymentProcessing}
            >
              {isPaymentProcessing && confirmationTier === basicTier.id ? (
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
              ) : null}
              Pay to Proceed
            </Button>
          </CardContent>
        </Card>

        {/* PRO PLAN */}
        <Card className="hover:border-primary/30 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-xl">{proTier.name} Plan</CardTitle>
            <CardDescription>{proTier.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-2xl font-bold">
              ₹{proTier.price}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                /festival
              </span>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {proTier.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handlePayClick(proTier.id)}
              disabled={isPaymentProcessing}
            >
              {isPaymentProcessing && confirmationTier === proTier.id ? (
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
              ) : null}
              Pay to Proceed
            </Button>
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={!!confirmationTier}
        onOpenChange={(open) => !open && setConfirmationTier(null)}
      >
        <AlertDialogContent>
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
