import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AnnouncerOverview } from "@/components/dashboard/overview/AnnouncerOverview";
import { MediaOverview } from "@/components/dashboard/overview/MediaOverview";
import { OverviewSkeleton } from "@/components/dashboard/overview/OverviewSkeleton";
import OverviewWidgets from "@/components/dashboard/overview/OverviewWidgets";
import { StageManagerOverview } from "@/components/dashboard/overview/StageManagerOverview";
import { getSession } from "@/core/auth/session";
import { findFestivalBySlugOrId } from "@/features/festivals/repositories/festival.repository";
import { getFestivalContext } from "@/features/festivals/services/festival-context.service";
import {
  ALL_FESTIVAL_ROLES,
  PRIVILEGED_ROLES,
} from "@/features/role-switch/constants";
import { getActiveRoleCookie } from "@/features/role-switch/role-switch-cookie.server";

export default async function FestivalDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const festival = await findFestivalBySlugOrId(slug);
  if (!festival) notFound();

  const session = await getSession();
  const context = await getFestivalContext({
    slugOrId: slug,
    userId: session?.userId ?? null,
    globalRole: session?.role ?? null,
  });
  if (!context) notFound();

  const isPrivileged = PRIVILEGED_ROLES.includes(context.role as any);
  const activeRoleCookie = await getActiveRoleCookie(
    festival.id,
    isPrivileged ? [...ALL_FESTIVAL_ROLES] : context.memberRoles,
  );
  const effectiveRole = activeRoleCookie ?? context.role;

  if (effectiveRole === "STAGE_MANAGER") {
    return (
      <Suspense fallback={<OverviewSkeleton />}>
        <StageManagerOverview
          festivalSlug={slug}
          userId={session?.userId ?? ""}
        />
      </Suspense>
    );
  }

  if (effectiveRole === "ANNOUNCER") {
    return (
      <Suspense fallback={<OverviewSkeleton />}>
        <AnnouncerOverview festivalSlug={slug} />
      </Suspense>
    );
  }

  if (effectiveRole === "MEDIA") {
    return (
      <Suspense fallback={<OverviewSkeleton />}>
        <MediaOverview festivalSlug={slug} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <OverviewWidgets festival={festival} />
    </Suspense>
  );
}
