import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FestivalSetupForm } from "@/components/festival-setup/FestivalSetupForm";
import { TIER_CONFIG } from "@/config/pricing";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { payment as paymentTable } from "@/server/db/schema";
import { eq } from "drizzle-orm";

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

  const payment = await db.query.payment.findFirst({
    where: eq(paymentTable.id, paymentId),
    columns: { tier: true, validUntil: true, createdAt: true },
  });

  if (!payment?.tier) {
    redirect("/profile");
  }

  const tierConfig = TIER_CONFIG[payment.tier as any];

  const expiresAtStr =
    payment.validUntil ??
    (() => {
      const base = payment.createdAt ? new Date(payment.createdAt) : new Date();
      const days = tierConfig.durationDays || 30;
      const d = new Date(base);
      d.setDate(d.getDate() + days);
      return d.toISOString();
    })();

  return (
    <FestivalSetupForm
      paymentId={paymentId}
      planExpiresAt={expiresAtStr}
      planValidFrom={payment.createdAt ?? undefined}
    />
  );
}
