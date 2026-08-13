import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AnnouncerOverview } from "@/components/dashboard/overview/AnnouncerOverview";
import { DashboardGreeting } from "@/components/dashboard/overview/DashboardGreeting";
import { MediaOverview } from "@/components/dashboard/overview/MediaOverview";
import { OverviewSkeleton } from "@/components/dashboard/overview/OverviewSkeleton";
import OverviewWidgets from "@/components/dashboard/overview/OverviewWidgets";
import { StageManagerOverview } from "@/components/dashboard/overview/StageManagerOverview";
import { VolunteerOverview } from "@/components/dashboard/overview/VolunteerOverview";
import { getSession } from "@/core/auth/session";
import { findFestivalBySlugOrId } from "@/features/festivals/repositories/festival.repository";
import { getFestivalContext } from "@/features/festivals/services/festival-context.service";
import { getActiveReportingSessions } from "@/features/announcement/services/announcer.service";
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

  const activeReportingSessions = await getActiveReportingSessions(festival.id);

  return (
    <div className="flex flex-col gap-5 pt-4 sm:pt-6 pb-12">
      <DashboardGreeting name={greetingName} timezone={festival.timezone} />

      {activeReportingSessions.length > 0 && (
        <div className="space-y-3">
          {activeReportingSessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center gap-4 bg-sky-50 dark:bg-sky-950/20 text-sky-800 dark:text-sky-200 p-4 rounded-xl border border-sky-200 dark:border-sky-800"
            >
              <div className="shrink-0">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                </span>
              </div>
              <div>
                <p className="font-semibold text-base">
                  Now Calling: {session.name}
                </p>
                <p className="text-sm opacity-90">
                  {session.categoryName ? `${session.categoryName} • ` : ""}
                  Please report to {session.stageName || "Green Room / Office"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
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
