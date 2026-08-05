import { notFound } from "next/navigation";
import { AnnouncerClient } from "@/components/dashboard/announcement/AnnouncerClient";
import { getSession } from "@/core/auth/session";
import type { Tier } from "@/core/types/app-enums";
import {
  getAnnouncerQueue,
  getNextResultNumber,
} from "@/features/announcement/services/announcer.service";
import { findFestivalBySlugOrId } from "@/features/festivals/repositories/festival.repository";
import { getFestivalContext } from "@/features/festivals/services/festival-context.service";
import { getEffectiveFeatureTagEnabled } from "@/features/plan-features/services/plan-features-tags.service";

export default async function AnnouncerPage({
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

  const [queue, nextNumber] = await Promise.all([
    getAnnouncerQueue(festival.id),
    getNextResultNumber(festival.id),
  ]);

  return (
    <div className="pt-4 sm:pt-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Announcer
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Assign result numbers and announce results to the public site.
        </p>
      </div>
      <AnnouncerClient
        festivalId={festival.id}
        festivalSlug={slug}
        queue={queue}
        nextResultNumber={nextNumber}
      />
    </div>
  );
}
