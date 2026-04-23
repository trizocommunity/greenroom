import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FestivalSetupForm } from "@/components/festival-setup/FestivalSetupForm";
import { TIER_CONFIG } from "@/config/pricing";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Launch Festival | Greenroom",
  description: "Set up your festival details",
};

interface PageProps {
  searchParams: Promise<{ paymentId?: string }>;
}

export default async function FestivalSetupPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { paymentId } = await searchParams;

  if (!paymentId) {
    redirect("/profile");
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { tier: true, validUntil: true, createdAt: true },
  });

  if (!payment?.tier) {
    redirect("/profile");
  }

  const tierConfig = TIER_CONFIG[payment.tier];

  const expiresAt =
    payment.validUntil ??
    (() => {
      const base = payment.createdAt ?? new Date();
      const days = tierConfig.durationDays || 30;
      const d = new Date(base);
      d.setDate(d.getDate() + days);
      return d;
    })();

  return (
    <FestivalSetupForm
      paymentId={paymentId}
      planExpiresAt={expiresAt.toISOString()}
      planValidFrom={payment.createdAt?.toISOString()}
    />
  );
}
