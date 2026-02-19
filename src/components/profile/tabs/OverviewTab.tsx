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
import { CreateFestivalModal } from "../CreateFestivalModal";
import { EditFestivalModal } from "../EditFestivalModal";
import { FestivalCard } from "../FestivalCard";
import { JoinedFestivalCard } from "../JoinedFestivalCard";

interface OverviewTabProps {
  displayName: string;
  userId: string;
}

export function OverviewTab({ displayName, userId }: OverviewTabProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [confirmationTier, setConfirmationTier] = useState<string | null>(null);

  const { data: festival, isLoading: isFestivalLoading } = useMyFestival();
  const { data: joinedFestivals, isLoading: isJoinedLoading } =
    useJoinedFestivals(userId);
  const { data: credit, isLoading: isCreditLoading } = useUnusedCredit();
  const { handlePay, loading: isPaymentProcessing } = useFestivalPayment();

  const basicTier = PRICING_TIERS.find((t) => t.id === "BASIC");

  const handlePayClick = (tierId: string) => {
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
      const isExpired =
        festival.status === "EXPIRED" ||
        (festival.expiresAt && new Date(festival.expiresAt) < new Date());

      if (!isExpired) {
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold tracking-tight">
                My Festival
              </h3>
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
              />
            </>
          ) : (
            <>
              <div className="space-y-2">
                {festival &&
                  (festival.status === "EXPIRED" ||
                    (festival.expiresAt &&
                      new Date(festival.expiresAt) < new Date())) && (
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* BASIC PLAN - Centered / Highlighted */}
                <Card className="md:col-span-2 hover:border-primary/30 transition-all duration-300 border-primary/20 bg-linear-to-br from-primary/5 via-background to-background relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-50">
                    <Sparkles className="w-24 h-24 text-primary/10" />
                  </div>
                  <CardHeader>
                    <Badge className="w-fit mb-2 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 font-medium">
                      Recommended
                    </Badge>
                    <CardTitle className="text-2xl md:text-3xl font-black">
                      {basicTier.name} Plan
                    </CardTitle>
                    <CardDescription className="text-base mt-2 max-w-2xl">
                      {basicTier.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-3xl font-bold">
                      ₹{basicTier.price}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        /festival
                      </span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      {basicTier.features.map((feature, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <Check className="w-4 h-4 text-primary shrink-0" />
                          {feature}
                        </div>
                      ))}
                    </div>

                    <Button
                      size="lg"
                      className="w-full md:w-auto font-semibold shadow-lg shadow-primary/20"
                      onClick={() => handlePayClick(basicTier.id)}
                      disabled={isPaymentProcessing}
                    >
                      {isPaymentProcessing &&
                      confirmationTier === basicTier.id ? (
                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                      ) : null}
                      Pay to Proceed
                      <ArrowRight className="ml-2 w-4 h-4" />
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
