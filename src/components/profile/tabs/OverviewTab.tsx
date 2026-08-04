"use client";

import { ArrowRight, Check, Loader2, Plus, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  useFestivalPayment,
  useJoinedFestivals,
  useMyFestivals,
  useUnusedCredit,
} from "@/api/client";
import {
  AppPageHeader,
  AppPanel,
  AppSectionHeading,
  Meter,
  StatusPill,
} from "@/components/app/AppSection";
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
import { Button } from "@/components/ui/button";
import { FestivalCardSkeleton } from "@/components/ui/Skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { getFestivalDurationDays, PRICING_TIERS } from "@/config/pricing";
import { parseInstant } from "@/core/datetime";
import { MS } from "@/core/datetime/constants";
import type { Tier } from "@/core/types/app-enums";
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

  const handlePayClick = (tierId: Tier) => setConfirmationTier(tierId);

  const handleConfirmPayment = () => {
    if (confirmationTier) {
      handlePay(confirmationTier);
      setConfirmationTier(null);
    }
  };

  if (!proTier) return null;

  const ownedContent = isFestivalLoading ? (
    <FestivalCardSkeleton />
  ) : festival ? (
    <FestivalCard festival={festival} />
  ) : null;

  // Plans only appear once we know there is no active festival to show.
  const showPlans = !isFestivalLoading && !ownedContent;

  const isExpiredFestival =
    festival &&
    getDerivedFestivalStatus({
      status: festival.status,
      startDate: festival.startDate,
      endDate: festival.endDate,
      expiresAt: festival.expiresAt,
    }) === "EXPIRED";

  return (
    <div className="animate-in fade-in space-y-10 duration-500">
      <AppPageHeader
        eyebrow="Overview"
        title={
          <>
            Welcome back,{" "}
            <span className="font-display font-normal italic text-primary">
              {displayName}
            </span>
          </>
        }
      />

      {/* Memberships — only when the user has no festival of their own */}
      {!festival && (isJoinedLoading || joinedFestivals?.length) ? (
        <section>
          <AppSectionHeading title="Joined festivals" />
          {isJoinedLoading ? (
            <FestivalCardSkeleton />
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {joinedFestivals?.map((f: any) => (
                <JoinedFestivalCard key={f.id} festival={f} />
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {ownedContent}

      {showPlans && (
        <section className="space-y-6">
          {isCreditLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-40" />
              <FestivalCardSkeleton />
            </div>
          ) : credit ? (
            <CreditPanel
              credit={credit}
              onLaunch={() =>
                router.push(`/festival-setup?paymentId=${credit.id}`)
              }
            />
          ) : (
            <>
              {isExpiredFestival && festival && (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/[0.06] p-5">
                  <p className="text-[15px] font-medium text-destructive">
                    Your previous festival has expired.
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Relaunch with a fresh {getFestivalDurationDays()}-day plan,
                    or start a new festival below.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4 gap-2 rounded-full border-destructive/30 text-destructive hover:bg-destructive/10"
                    asChild
                  >
                    <Link
                      href={`/festivals/new?from=${encodeURIComponent(festival.slug ?? "")}`}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Relaunch festival
                    </Link>
                  </Button>
                </div>
              )}

              <AppSectionHeading
                title="Start a festival"
                description="One payment covers the whole festival for its full run."
              />

              <AppPanel tinted className="p-5 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
                  <div>
                    <StatusPill tone="ready" className="mb-3">
                      Recommended
                    </StatusPill>
                    <h3 className="text-xl font-semibold tracking-tight text-heading">
                      {proTier.name}
                    </h3>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                      {proTier.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-semibold tracking-tight text-heading">
                      ₹{proTier.price.toLocaleString("en-IN")}
                    </p>
                    <p className="text-xs text-muted-foreground">/ festival</p>
                  </div>
                </div>

                <ul className="mt-6 grid gap-x-8 border-t border-border pt-5 sm:grid-cols-2">
                  {proTier.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 py-1.5 text-sm text-muted-foreground"
                    >
                      <Check
                        className="mt-1 h-3 w-3 shrink-0 text-primary"
                        strokeWidth={3}
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="mt-6 h-11 w-full justify-center rounded-full text-sm font-medium shadow-primary-glow sm:w-auto sm:px-8"
                  onClick={() => handlePayClick(proTier.id)}
                  disabled={isPaymentProcessing}
                >
                  {isPaymentProcessing && confirmationTier === proTier.id && (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  )}
                  Pay to proceed
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Button>
              </AppPanel>

              <AlertDialog
                open={!!confirmationTier}
                onOpenChange={(open) => !open && setConfirmationTier(null)}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm payment</AlertDialogTitle>
                    <AlertDialogDescription>
                      Once the payment is completed it is{" "}
                      <span className="font-semibold text-destructive">
                        non-refundable
                      </span>
                      . Do you want to proceed?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmPayment}>
                      I understand, proceed
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </section>
      )}
    </div>
  );
}

/** An unredeemed payment, with how long is left to spend it. */
function CreditPanel({
  credit,
  onLaunch,
}: {
  credit: {
    id: string;
    /** Null when the payment predates per-tier credits. */
    tier: string | null;
    amount: number;
    validFrom: string | Date;
    validUntil?: string | Date | null;
  };
  onLaunch: () => void;
}) {
  const start = parseInstant(credit.validFrom);
  const startMs = start?.getTime() ?? Date.now();
  const end =
    (credit.validUntil ? parseInstant(credit.validUntil) : null) ??
    new Date(startMs + getFestivalDurationDays() * MS.day);

  const now = Date.now();
  const totalDuration = end.getTime() - startMs;
  const elapsed = now - startMs;
  const used =
    totalDuration > 0
      ? Math.min(100, Math.max(0, (elapsed / totalDuration) * 100))
      : 0;

  const daysLeft = Math.ceil((end.getTime() - now) / MS.day);
  const isExpiringSoon = daysLeft <= 7;

  return (
    <AppPanel tinted className="p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div>
          <StatusPill tone="ready" className="mb-3">
            Credit available
          </StatusPill>
          <h3 className="text-xl font-semibold tracking-tight text-heading">
            {credit.tier ? `${credit.tier} plan credit` : "Plan credit"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Worth ₹{credit.amount.toLocaleString("en-IN")} — already paid, not
            yet used.
          </p>
        </div>

        <Button
          onClick={onLaunch}
          className="h-11 w-full justify-center rounded-full text-sm font-medium shadow-primary-glow sm:w-auto sm:px-7"
        >
          <Plus className="mr-2 h-4 w-4" />
          Launch festival
        </Button>
      </div>

      <div className="mt-7 border-t border-border pt-5">
        <div className="mb-2.5 flex items-baseline justify-between gap-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Credit validity
          </span>
          <span
            className={
              isExpiringSoon
                ? "text-sm font-semibold tabular-nums text-destructive"
                : "text-sm font-semibold tabular-nums text-foreground"
            }
          >
            {daysLeft > 0 ? `${daysLeft} days remaining` : "Expires today"}
          </span>
        </div>
        <Meter value={used} tone={isExpiringSoon ? "danger" : "primary"} />
        <p className="mt-2.5 text-xs text-muted-foreground">
          Activate your festival before{" "}
          {end.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}{" "}
          to use this credit.
        </p>
      </div>
    </AppPanel>
  );
}
