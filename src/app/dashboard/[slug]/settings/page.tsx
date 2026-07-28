import { and, asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  category as categoryTable,
  festivalMember as memberTable,
  programme as programmeTable,
} from "@/core/database/schema";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import { getScoringPolicyAction } from "@/features/judgment/actions/judgment.actions";
import {
  FeatureService,
  getTierForFeatureCheck,
} from "@/features/plan-features/services/features";
import { isBasicTier } from "@/features/plan-features/services/tier";
import { listPosterTemplatesAction } from "@/features/posters/actions/poster-template.actions";
import { canManageTemplates as checkCanManageTemplates } from "@/features/posters/auth/poster-access";
import { SettingsTabs } from "./_components/SettingsTabs";

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
  let userRole = isSuperAdmin ? "SUPER_ADMIN" : isOwner ? "OWNER" : "";

  if (!isOwner && !isSuperAdmin) {
    const member = await db.query.festivalMember.findFirst({
      where: and(
        eq(memberTable.festivalId, festival.id),
        eq(memberTable.userId, session.userId),
        eq(memberTable.role, "ADMIN"),
        eq(memberTable.isActive, true),
      ),
    });
    if (!member) {
      redirect(`/dashboard/${slug}?error=forbidden`);
    }
    userRole = "ADMIN";
  }

  // Permissions
  const canManageScoring = true; // Settings is only accessible to ADMIN/OWNER, who can manage scoring
  const canManageFestivalLive = !isBasicTier(festival.tier as any);
  const canManageTemplates = checkCanManageTemplates(userRole as any);

  // Fetch Data for Tabs
  const [policy, categories, programmes, listRes] = await Promise.all([
    canManageScoring ? getScoringPolicyAction(festival.id) : Promise.resolve(null),
    canManageScoring
      ? db.query.category.findMany({
          where: eq(categoryTable.festivalId, festival.id),
          columns: { id: true, name: true },
          orderBy: [asc(categoryTable.name)],
        })
      : Promise.resolve([]),
    canManageScoring
      ? db.query.programme.findMany({
          where: eq(programmeTable.festivalId, festival.id),
          columns: { id: true, name: true, categoryId: true },
          orderBy: [asc(programmeTable.name)],
        })
      : Promise.resolve([]),
    canManageTemplates ? listPosterTemplatesAction(festival.id) : Promise.resolve({ success: false, data: [] }),
  ]);

  const templates = listRes?.success ? listRes.data : [];

  // Public URL for Festival Live
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const protocol = headersList.get("x-forwarded-proto") || "http";
  const baseUrl = host ? `${protocol}://${host}` : process.env.NEXT_PUBLIC_APP_URL || "";
  const publicUrl = baseUrl ? `${baseUrl}/${festival.slug}` : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Settings
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage your festival configuration, scoring policy, and live site.
        </p>
      </div>
      <SettingsTabs
        festival={festival}
        policy={policy}
        categories={categories}
        programmes={programmes}
        publicUrl={publicUrl}
        templates={templates}
        canManageTemplates={canManageTemplates}
        canManageScoring={canManageScoring}
        canManageFestivalLive={canManageFestivalLive}
      />
    </div>
  );
}
