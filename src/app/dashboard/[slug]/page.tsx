import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AnnouncerOverview } from "@/components/dashboard/overview/AnnouncerOverview";
import { MediaOverview } from "@/components/dashboard/overview/MediaOverview";
import { OverviewSkeleton } from "@/components/dashboard/overview/OverviewSkeleton";
import { VolunteerOverview } from "@/components/dashboard/overview/VolunteerOverview";
import { DashboardGreeting } from "@/components/dashboard/overview/DashboardGreeting";
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

  const greetingName = session?.name || "there";

  return (
    <div className="flex flex-col gap-5 pt-4 sm:pt-6 pb-12">
      <DashboardGreeting name={greetingName} />
      {effectiveRole === "STAGE_MANAGER" ? (
        <Suspense fallback={<OverviewSkeleton />}>
          <StageManagerOverview
            festivalSlug={slug}
            userId={session?.userId ?? ""}
          />
        </Suspense>
      ) : effectiveRole === "ANNOUNCER" ? (
        <Suspense fallback={<OverviewSkeleton />}>
          <AnnouncerOverview festivalSlug={slug} />
        </Suspense>
      ) : effectiveRole === "MEDIA" ? (
        <Suspense fallback={<OverviewSkeleton />}>
          <MediaOverview festivalSlug={slug} />
        </Suspense>
      ) : effectiveRole === "VOLUNTEER" ? (
        <Suspense fallback={<OverviewSkeleton />}>
          <VolunteerOverview festivalSlug={slug} />
        </Suspense>
      ) : (
        <Suspense fallback={<OverviewSkeleton />}>
          <OverviewWidgets festival={festival} effectiveRole={effectiveRole} />
        </Suspense>
      )}
    </div>
  );
}
