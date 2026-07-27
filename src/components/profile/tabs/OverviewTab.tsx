"use client";

import { ArrowRight, Check, Loader2, Plus, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  useFestivalPayment,
  useJoinedFestivals,
  useMyFestivals,
  useUnusedCredit,
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
import { FestivalCardSkeleton } from "@/components/ui/Skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { PRICING_TIERS } from "@/config/pricing";
import type { Tier } from "@/core/types/app-enums";
import { cn } from "@/core/utils/cn";
import { parseStoredInstant } from "@/core/utils/date-time";
import { getDerivedFestivalStatus } from "@/features/festivals/services/festival-status.service";
import { FestivalCard } from "../FestivalCard";
import { JoinedFestivalCard } from "../JoinedFestivalCard";

interface OverviewTabProps {
  displayName: string;
  userId: string;
}

export function OverviewTab({
  displayName,
  userId: _userId,
}: OverviewTabProps) {
  const router = useRouter();
  const [confirmationTier, setConfirmationTier] = useState<Tier | null>(null);

  const { data: myFestivalData, isLoading: isFestivalLoading } =
    useMyFestivals();
  const festival = myFestivalData?.festival ?? null;
  const { data: joinedFestivals, isLoading: isJoinedLoading } =
    useJoinedFestivals();
  const { data: credit, isLoading: isCreditLoading } = useUnusedCredit();
  const { handlePay, loading: isPaymentProcessing } = useFestivalPayment();

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

  if (!proTier) return null;

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
      return <FestivalCardSkeleton />;
    }

    if (festival) {
      return <FestivalCard festival={festival} />;
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
        <h2 className="text-3xl font-semibold tracking-tight text-heading">
          Welcome back,{" "}
          <span className="font-display italic font-normal text-primary">
            {displayName}
          </span>
        </h2>
      </div>

      {!festival && renderJoinedSection()}

      {ownedContent}

      {showPlans && (
        <div className="space-y-8">
          {isCreditLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-48 mb-2" />
              <FestivalCardSkeleton />
            </div>
          ) : credit ? (
            <div className="space-y-4">
              <Card className="border-primary/20 bg-card relative overflow-hidden shadow-premium">
                <div className="absolute right-0 top-0 p-4 opacity-[0.06] pointer-events-none">
                  <Sparkles className="w-32 h-32 text-primary" />
                </div>
                <CardContent className="p-5 sm:p-6 md:p-8">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className="p-3 sm:p-4 bg-primary/8 rounded-2xl shrink-0">
                        <Check className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-lg sm:text-xl font-semibold tracking-tight text-heading flex flex-wrap items-center gap-2">
                          {credit.tier} plan credit
                          <Badge
                            variant="secondary"
                            className="bg-primary/10 text-primary hover:bg-primary/15 border-0 text-[10px] sm:text-xs px-1.5 py-0 sm:py-0.5"
                          >
                            Available
                          </Badge>
                        </h4>
                        <p className="text-xs sm:text-sm text-muted-foreground w-full">
                          Value: ₹{credit.amount}
                        </p>
                      </div>
                    </div>

                    <div className="w-full sm:w-auto shrink-0 z-10 pt-2 sm:pt-0">
                      <Button
                        size="lg"
                        onClick={() =>
                          router.push(`/festival-setup?paymentId=${credit.id}`)
                        }
                        className="w-full md:w-auto h-12 text-sm font-medium rounded-full shadow-primary-glow hover:opacity-90 transition-opacity"
                      >
                        <Plus className="mr-2 h-5 w-5" />
                        Launch festival now
                      </Button>
                    </div>
                  </div>

                  {/* Expiry Progress Section */}
                  <div className="mt-8 pt-6 border-t border-border">
                    {(() => {
                      const start = parseStoredInstant(
                        credit.validFrom as string | Date,
                      );
                      const end = credit.validUntil
                        ? parseStoredInstant(credit.validUntil as string | Date)
                        : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
                      const now = new Date();

                      const totalDuration = end.getTime() - start.getTime();
                      const elapsed = now.getTime() - start.getTime();
                      let progress = (elapsed / totalDuration) * 100;
                      progress = Math.min(100, Math.max(0, progress));

                      const daysLeft = Math.ceil(
                        (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
                      );
                      const isExpiringSoon = daysLeft <= 7;

                      return (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-muted-foreground flex items-center gap-1.5">
                              <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
                              Credit Validity
                            </span>
                            <span
                              className={cn(
                                "font-bold",
                                isExpiringSoon
                                  ? "text-destructive"
                                  : "text-foreground",
                              )}
                            >
                              {daysLeft > 0
                                ? `${daysLeft} days remaining`
                                : "Expires today"}
                            </span>
                          </div>
                          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-1000",
                                isExpiringSoon
                                  ? "bg-destructive"
                                  : "bg-primary",
                              )}
                              style={{ width: `${100 - progress}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Activate your festival before{" "}
                            {end.toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            to use this credit.
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* PRO PLAN - Highlighted */}
                {proTier && (
                  <Card className="flex flex-col hover:border-primary/30 transition-all duration-300 border-primary/20 bg-card relative overflow-hidden shadow-premium">
                    <div className="absolute top-0 right-0 p-2 opacity-[0.06]">
                      <Sparkles className="w-14 h-14 text-primary" />
                    </div>
                    <CardHeader className="pb-2">
                      <Badge className="w-fit mb-1.5 text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20 font-medium">
                        Recommended
                      </Badge>
                      <CardTitle className="text-xl font-semibold tracking-tight text-heading">
                        {proTier.name}
                      </CardTitle>
                      <CardDescription className="text-sm mt-0.5 line-clamp-2">
                        {proTier.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col flex-1 space-y-4 pt-0">
                      <div className="text-2xl font-semibold tracking-tight text-heading">
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
                        className="w-full font-medium mt-auto rounded-full shadow-primary-glow hover:opacity-90 transition-opacity"
                        onClick={() => handlePayClick(proTier.id)}
                        disabled={isPaymentProcessing}
                      >
                        {isPaymentProcessing &&
                        confirmationTier === proTier.id ? (
                          <Loader2 className="animate-spin mr-2 h-3.5 w-3.5" />
                        ) : null}
                        Pay to proceed
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
