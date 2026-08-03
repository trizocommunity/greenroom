import { notFound, redirect } from "next/navigation";
import { ScheduleClient } from "@/components/festival/pre-event-works/schedule/ScheduleClient";
import { getSession } from "@/core/auth/session";
import type { Tier } from "@/core/types/app-enums";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import { getFestivalContext } from "@/features/festivals/services/festival-context.service";
import { getEffectiveFeatureEnabled } from "@/features/plan-features/services/plan-features.service";
import {
  getSchedulableProgrammesAction,
  getScheduleEntriesEnriched,
} from "@/features/schedule/actions/schedule.actions";
import { getStages } from "@/features/stages/actions/stage.actions";
import { getStageFilterCookie } from "@/features/stages/stage-filter-cookie.server";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function SchedulePage({ params }: PageProps) {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);

  if (!festival) {
    notFound();
  }

  const canManageSchedule = await getEffectiveFeatureEnabled(
    festival.tier as Tier,
    "schedule",
  );
  if (!canManageSchedule) {
    redirect(`/dashboard/${slug}?error=upgrade_required&feature=schedule`);
  }

  const [entries, stages, programmes] = await Promise.all([
    getScheduleEntriesEnriched(festival.id),
    getStages(festival.id),
    getSchedulableProgrammesAction(festival.id),
  ]);

  const session = await getSession();
  const context = await getFestivalContext({
    slugOrId: slug,
    userId: session?.userId ?? null,
    globalRole: session?.role ?? null,
  });
  const isStageManager = context?.role === "STAGE_MANAGER";
  const initialStageId = isStageManager
    ? await getStageFilterCookie(
        festival.id,
        stages.map((s) => s.id),
      )
    : null;

  return (
    <div className="container pt-4 sm:pt-6">
      <ScheduleClient
        festivalId={festival.id}
        initialEntries={entries as any}
        programmes={programmes}
        stages={stages.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description ?? null,
        }))}
        festivalStartDate={festival.startDate}
        festivalEndDate={festival.endDate}
        initialStageId={initialStageId}
        hideStageFilter={isStageManager}
      />
    </div>
  );
}
