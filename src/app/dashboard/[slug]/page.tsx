import { notFound } from "next/navigation";
import { findFestivalBySlugOrId } from "@/server/models/festival.model";
import { Suspense } from "react";
import OverviewWidgets from "@/components/dashboard/overview/OverviewWidgets";
import { OverviewSkeleton } from "@/components/dashboard/overview/OverviewSkeleton";

export default async function FestivalDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Fetch Festival
  const festival = await findFestivalBySlugOrId(slug);

  if (!festival) notFound();

  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <OverviewWidgets festival={festival} />
    </Suspense>
  );
}
