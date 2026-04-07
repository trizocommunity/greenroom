import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { OverviewSkeleton } from "@/components/dashboard/overview/OverviewSkeleton";
import OverviewWidgets from "@/components/dashboard/overview/OverviewWidgets";
import { getSession } from "@/lib/auth/session";
import { findFestivalBySlugOrId } from "@/server/models/festival.model";
import { getFestivalContext } from "@/server/services/festival-context.service";

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
  if (context?.role === "STAGE_MANAGER") {
    redirect(`/dashboard/${slug}/stage-manager`);
  }

  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <OverviewWidgets festival={festival} />
    </Suspense>
  );
}
