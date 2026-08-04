import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FestivalSetupForm } from "@/components/festival-setup/FestivalSetupForm";
import { getCurrentUser } from "@/core/auth/current-user";
import { db } from "@/core/database/client";
import {
  festival as festivalTable,
  payment as paymentTable,
  user as userTable,
} from "@/core/database/schema";

export const metadata: Metadata = {
  title: "Launch Festival | Greenroom",
  description: "Set up your festival details",
};

interface PageProps {
  searchParams: Promise<{ paymentId?: string; from?: string }>;
}

export default async function FestivalSetupPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { paymentId, from } = await searchParams;

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

  const userAccount = await db.query.user.findFirst({
    where: eq(userTable.id, user!.id),
    columns: { accountType: true },
  });

  // If we got here from a Relaunch CTA (`/festivals/new?from=<slug>`), look up
  // the expired festival's name to display as a contextual breadcrumb on the
  // setup form. Returns null when the slug doesn't resolve — the form then
  // treats this as a fresh creation.
  let relaunchContext: { slug: string; name: string } | null = null;
  if (from) {
    const prev = await db.query.festival.findFirst({
      where: eq(festivalTable.slug, from),
      columns: { slug: true, name: true },
    });
    if (prev?.slug) {
      relaunchContext = { slug: prev.slug, name: prev.name };
    }
  }

  return (
    <FestivalSetupForm
      paymentId={paymentId}
      planValidFrom={payment.createdAt ?? undefined}
      accountType={userAccount?.accountType ?? "PERSONAL"}
      relaunchContext={relaunchContext}
    />
  );
}
