import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  findFestivalBySlugOrId,
  getFestivalAnalyticsData,
} from "@/server/models/festival.model";
import { getFestivalContext } from "@/server/services/festival-context.service";
import { getEffectiveTierFeatures } from "@/server/services/plan-features.service";
import { getResolvedTier } from "@/lib/tier";
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
  if (!context || context.role === "NONE")
    redirect("/");
  const features = await getEffectiveTierFeatures(
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
