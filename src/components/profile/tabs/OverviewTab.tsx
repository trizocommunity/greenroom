"use client";

import { ArrowRight, Check, Loader2, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
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
import { FestivalCardSkeleton } from "@/components/ui/Skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { PRICING_TIERS } from "@/config/pricing";
import { useFestivalPayment } from "@/hooks/useFestivalPayment";
import { useMyFestival } from "@/hooks/useFestivals";
import { useJoinedFestivals } from "@/hooks/useJoinedFestivals";
import { useUnusedCredit } from "@/hooks/useUnusedCredit";
import { getDerivedFestivalStatus } from "@/lib/festival-status";
import type { Tier } from "@/lib/prisma-enums";
import { CreateFestivalModal } from "../CreateFestivalModal";
import { FestivalCard } from "../FestivalCard";
import { JoinedFestivalCard } from "../JoinedFestivalCard";

interface OverviewTabProps {
  displayName: string;
  userId: string;
}

export function OverviewTab({ displayName, userId }: OverviewTabProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [confirmationTier, setConfirmationTier] = useState<Tier | null>(null);

  const { data: festival, isLoading: isFestivalLoading } = useMyFestival();
  const { data: joinedFestivals, isLoading: isJoinedLoading } =
    useJoinedFestivals(userId);
  const { data: credit, isLoading: isCreditLoading } = useUnusedCredit();
  const { handlePay, loading: isPaymentProcessing } = useFestivalPayment();

  const basicTier = PRICING_TIERS.find((t) => t.id === "BASIC");
  const standardTier = PRICING_TIERS.find((t) => t.id === "STANDARD");
  const proTier = PRICING_TIERS.find((t) => t.id === "PRO");

  const handlePayClick = (tierId: Tier) => {
    setConfirmationTier(tierId);
  };

  const handleConfirmPayment = () => {
    if (confirmationTier) {
      handlePay(confirmationTier);
      setConfirmationTier(null);
    }
  };

  if (!basicTier) return null;

  // Render Joined Festivals Section (Loading or Data)
  const renderJoinedSection = () => {
    if (isJoinedLoading) {
      return (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold tracking-tight">
            Joined Festivals
          </h3>
          <div className="grid gap-6">
            <FestivalCardSkeleton />
          </div>
        </div>
      );
    }

    const filteredFestivals = joinedFestivals?.filter(
      (f: any) => f.memberRole !== "ADMIN",
    );

    if (filteredFestivals && filteredFestivals.length > 0) {
      return (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold tracking-tight">
            Joined Festivals
          </h3>
          <div className="grid gap-6">
            {filteredFestivals.map((f: any) => (
              <JoinedFestivalCard key={f.id} festival={f} />
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // Render Owned Festival (Loading or Data)
  const renderOwnedSection = () => {
    if (isFestivalLoading) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold tracking-tight">
              My Festival
            </h3>
          </div>
          <FestivalCardSkeleton />
        </div>
      );
    }

    if (festival) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold tracking-tight">
              My Festival
            </h3>
          </div>
          <FestivalCard festival={festival} />
        </div>
      );
    }
    return null; // Fall through to Credit/Plans if no active festival
  };

  const ownedContent = renderOwnedSection();
  // Check if we should show plans: If NOT loading festival, and NO owned content (or expired).
  // Note: renderOwnedSection returns null if expired or no festival.
  // Exception: If isLoading, it returns skeleton.

  // We need to know if we effectively have an owned festival (active) to decide whether to show plans.
  // If isFestivalLoading is true, we showed skeleton, so we don't show plans yet.
  const showPlans = !isFestivalLoading && !ownedContent;

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="space-y-2">
        <h2 className="text-3xl uppercase tracking-tighter text-foreground">
          <span className="font-medium">Welcome Back, </span>
          <span className="text-primary font-black">{displayName}</span>
        </h2>
      </div>

      {renderJoinedSection()}

      {ownedContent}

      {showPlans && (
        <div className="space-y-8">
          {isCreditLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-48 mb-2" />
              <FestivalCardSkeleton />
            </div>
          ) : credit ? (
            <>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold tracking-tight">
                  Start Your Festival
                </h3>
                <p className="text-muted-foreground">
                  You have a valid credit available.
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
                tier={credit.tier || undefined}
                planValidFrom={credit.validFrom as any}
                planValidUntil={credit.validUntil as any}
              />
            </>
          ) : (
            <>
              <div className="space-y-2">
                {festival &&
                  getDerivedFestivalStatus({
                    status: festival.status,
                    startDate: festival.startDate,
                    endDate: festival.endDate,
                    expiresAt: festival.expiresAt,
                  }) === "EXPIRED" && (
                    <div className="p-4 bg-destructive/10 text-destructive rounded-md mb-4 border border-destructive/20">
                      <p className="font-semibold">
                        Your previous festival has expired.
                      </p>
                      <p className="text-sm opacity-80">
                        To assign a new festival, please purchase a plan below.
                      </p>
                    </div>
                  )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* BASIC PLAN */}
                <Card className="flex flex-col hover:border-primary/20 transition-all duration-300 border-border/50 overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl font-bold">
                      {basicTier.name}
                    </CardTitle>
                    <CardDescription className="text-sm mt-0.5 line-clamp-2">
                      {basicTier.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col flex-1 space-y-4 pt-0">
                    <div className="text-2xl font-bold">
                      ₹{basicTier.price}
                      <span className="text-xs font-normal text-muted-foreground ml-1">
                        /festival
                      </span>
                    </div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted-foreground flex-1 min-h-0">
                      {basicTier.features.map((feature, i) => (
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
                      className="w-full font-medium mt-auto"
                      variant="outline"
                      onClick={() => handlePayClick(basicTier.id)}
                      disabled={isPaymentProcessing}
                    >
                      {isPaymentProcessing &&
                      confirmationTier === basicTier.id ? (
                        <Loader2 className="animate-spin mr-2 h-3.5 w-3.5" />
                      ) : null}
                      Pay to Proceed
                      <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                    </Button>
                  </CardContent>
                </Card>

                {/* STANDARD PLAN - Highlighted */}
                {standardTier && (
                  <Card className="flex flex-col hover:border-primary/30 transition-all duration-300 border-primary/20 bg-linear-to-br from-primary/5 via-background to-background relative overflow-hidden md:ring-2 md:ring-primary/20 md:-mt-1 md:mb-1 md:scale-[1.02]">
                    <div className="absolute top-0 right-0 p-2 opacity-40">
                      <Sparkles className="w-14 h-14 text-primary/10" />
                    </div>
                    <CardHeader className="pb-2">
                      <Badge className="w-fit mb-1.5 text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20 font-medium">
                        Recommended
                      </Badge>
                      <CardTitle className="text-xl font-bold">
                        {standardTier.name}
                      </CardTitle>
                      <CardDescription className="text-sm mt-0.5 line-clamp-2">
                        {standardTier.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col flex-1 space-y-4 pt-0">
                      <div className="text-2xl font-bold">
                        ₹{standardTier.price}
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                          /festival
                        </span>
                      </div>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted-foreground flex-1 min-h-0">
                        {standardTier.features.map((feature, i) => (
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
                        className="w-full font-medium mt-auto shadow-md shadow-primary/20"
                        onClick={() => handlePayClick(standardTier.id)}
                        disabled={isPaymentProcessing}
                      >
                        {isPaymentProcessing &&
                        confirmationTier === standardTier.id ? (
                          <Loader2 className="animate-spin mr-2 h-3.5 w-3.5" />
                        ) : null}
                        Pay to Proceed
                        <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* PRO PLAN */}
                {proTier && (
                  <Card className="flex flex-col hover:border-primary/20 transition-all duration-300 border-border/50 overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xl font-bold">
                        {proTier.name}
                      </CardTitle>
                      <CardDescription className="text-sm mt-0.5 line-clamp-2">
                        {proTier.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col flex-1 space-y-4 pt-0">
                      <div className="text-2xl font-bold">
                        ₹{proTier.price}
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                          /festival
                        </span>
                      </div>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted-foreground flex-1 min-h-0">
                        {proTier.features.map((feature, i) => (
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
                        className="w-full font-medium mt-auto"
                        variant="outline"
                        onClick={() => handlePayClick(proTier.id)}
                        disabled={isPaymentProcessing}
                      >
                        {isPaymentProcessing &&
                        confirmationTier === proTier.id ? (
                          <Loader2 className="animate-spin mr-2 h-3.5 w-3.5" />
                        ) : null}
                        Pay to Proceed
                        <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                      </Button>
                    </CardContent>
                  </Card>
                )}
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
                      <span className="font-bold text-destructive">
                        non-refundable
                      </span>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
