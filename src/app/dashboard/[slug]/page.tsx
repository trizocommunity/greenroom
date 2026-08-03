import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { OverviewSkeleton } from "@/components/dashboard/overview/OverviewSkeleton";
import OverviewWidgets from "@/components/dashboard/overview/OverviewWidgets";
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
    redirect(`/dashboard/${slug}/stage-manager`);
  }
  if (effectiveRole === "ANNOUNCER") {
    redirect(`/dashboard/${slug}/announcer`);
  }

  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <OverviewWidgets festival={festival} />
    </Suspense>
  );
}
