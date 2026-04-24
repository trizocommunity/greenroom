import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import { db } from "@/core/database/client";
import { festivalMember as memberTable } from "@/core/database/schema";
import {
  FeatureService,
  getTierForFeatureCheck,
} from "@/features/plan-features/services/features";
import { SettingsForm } from "./_components/SettingsForm";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getSession();
  if (!session?.userId) redirect("/auth/login");

  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival) return notFound();

  // Feature Access Check
  if (
    !FeatureService.isFeatureEnabled(
      getTierForFeatureCheck(festival.tier),
      "festivalSettings",
    )
  ) {
    redirect(`/dashboard/${slug}?error=upgrade_required&feature=settings`);
  }

  // Access check: Owner or ADMIN member
  const isOwner = festival.ownerId === session.userId;
  const isSuperAdmin = session.role === "SUPER_ADMIN";
  
  if (!isOwner && !isSuperAdmin) {
    const member = await db.query.festivalMember.findFirst({
      where: and(
        eq(memberTable.festivalId, festival.id),
        eq(memberTable.userId, session.userId),
        eq(memberTable.role, "ADMIN"),
        eq(memberTable.isActive, true)
      ),
    });
    if (!member) {
      redirect(`/dashboard/${slug}?error=forbidden`);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Settings
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage your festival configuration and deadlines.
        </p>
      </div>
      <SettingsForm festival={festival} />
    </div>
  );
}
