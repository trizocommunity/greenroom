import { and, asc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  category as categoryTable,
  festivalMember as memberTable,
  programme as programmeTable,
} from "@/core/database/schema";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import { getPublicFestivalBaseUrl } from "@/features/institutions/lib/custom-domain";
import { findInstitutionById } from "@/features/institutions/repositories/institution.repository";
import { getScoringPolicyAction } from "@/features/judgement/actions/judgement.actions";
import { isEnabled } from "@/features/plan-features/services/feature-gate";
import { isBasicTier } from "@/features/plan-features/services/tier";
import { SettingsTabs } from "./_components/SettingsTabs";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival) return notFound();

  if (!isEnabled(festival.tier, "festivalSettings")) {
    redirect(`/dashboard/${slug}?error=upgrade_required&feature=settings`);
  }

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

  const canManageScoring = true;
  const canManageFestivalLive = !isBasicTier(festival.tier as any);

  const [policy, categories, programmes, institution] = await Promise.all([
    canManageScoring
      ? getScoringPolicyAction(festival.id)
      : Promise.resolve(null),
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
    festival.institutionId
      ? findInstitutionById(festival.institutionId)
      : Promise.resolve(null),
  ]);

  const publicUrl = getPublicFestivalBaseUrl({
    slug: festival.slug,
    institution: institution
      ? {
          customDomain: institution.customDomain,
          verifiedAt: institution.verifiedAt,
        }
      : null,
  });

  const previewPath = `/${festival.slug}`;
  const isInstitutionOwner =
    !!institution && institution.ownerId === session.userId;

  return (
    <SettingsTabs
      festival={festival}
      policy={policy}
      categories={categories}
      programmes={programmes}
      publicUrl={publicUrl}
      previewPath={previewPath}
      customDomain={{
        institutionId: institution?.id ?? null,
        customDomain: institution?.customDomain ?? null,
        verifiedAt: institution?.verifiedAt ?? null,
        isOwner: isInstitutionOwner || isSuperAdmin,
        isPro: isEnabled(festival.tier, "customDomain"),
        isInstitutional: !!festival.institutionId,
      }}
      canManageScoring={canManageScoring}
      canManageFestivalLive={canManageFestivalLive}
    />
  );
}
