import { notFound } from "next/navigation";
import { AnnouncementDeskClient } from "@/components/dashboard/announcement/AnnouncementDeskClient";
import { getSession } from "@/core/auth/session";
import type { Tier } from "@/core/types/app-enums";
import { getAnnouncementDeskQueue } from "@/features/announcement/services/announcement-desk.service";
import { findFestivalBySlugOrId } from "@/features/festivals/repositories/festival.repository";
import { getFestivalContext } from "@/features/festivals/services/festival-context.service";
import { getEffectiveFeatureTagEnabled } from "@/features/plan-features/services/plan-features-tags.service";

export default async function AnnouncementDeskPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSession();
  const context = await getFestivalContext({
    slugOrId: slug,
    userId: session?.userId ?? null,
    globalRole: session?.role ?? null,
  });

  if (
    !context ||
    !["ANNOUNCER", "ADMIN", "OWNER", "SUPER_ADMIN"].includes(context.role)
  ) {
    notFound();
  }

  const festival = await findFestivalBySlugOrId(slug);
  if (!festival) notFound();

  const tier = (festival.tier ?? "STANDARD") as Tier;
  const canUse = await getEffectiveFeatureTagEnabled(
    tier,
    "eventWorks.externalJudging",
  );
  if (!canUse) notFound();

  const { queue, recentlyAnnounced, block } = await getAnnouncementDeskQueue(
    festival.id,
  );

  return (
    <div className="pt-4 sm:pt-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Announcement
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Announce published results on the mic; they go live on the public site
          when programme-results mode is active.
        </p>
      </div>
      <AnnouncementDeskClient
        festivalId={festival.id}
        festivalSlug={slug}
        queue={queue}
        announced={recentlyAnnounced}
        block={block}
      />
    </div>
  );
}
