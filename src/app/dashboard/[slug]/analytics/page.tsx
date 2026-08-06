import { notFound, redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import {
  findFestivalBySlugOrId,
  getFestivalAnalyticsData,
} from "@/features/festivals/repositories/festival.repository";
import { getFestivalContext } from "@/features/festivals/services/festival-context.service";
import {
  loadFeatureOverrides,
} from "@/features/plan-features/services/plan-features.service";
import { getResolvedTier } from "@/features/plan-features/services/tier";
import { AnalyticsView } from "./_components/AnalyticsView";

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const { slug } = await params;
  const festival = await findFestivalBySlugOrId(slug);
  if (!festival) return notFound();

  const context = await getFestivalContext({
    slugOrId: slug,
    userId: session.userId,
    globalRole: session.role,
  });
  if (!context || context.role === "NONE") redirect("/");
  const features = await loadFeatureOverrides(
    getResolvedTier(festival.tier),
  );
  if (!features.advancedAnalytics) {
    redirect(`/dashboard/${slug}?error=upgrade_required&feature=analytics`);
  }

  const analytics = await getFestivalAnalyticsData(festival.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Analytics
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Festival metrics and usage overview.
        </p>
      </div>
      <AnalyticsView
        festivalName={festival.name}
        data={analytics}
        tierLabel={festival.tierLabel ?? "Standard"}
      />
    </div>
  );
}
