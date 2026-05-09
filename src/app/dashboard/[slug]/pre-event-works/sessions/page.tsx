import { eachDayOfInterval, format, startOfDay } from "date-fns";
import { notFound, redirect } from "next/navigation";
import { SessionScheduleClient } from "@/components/festival/pre-event-works/schedule/SessionScheduleClient";
import { parseStoredInstant } from "@/core/utils/date-time";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import { getEffectiveFeatureEnabled } from "@/features/plan-features/services/plan-features.service";
import { getScheduleEntries } from "@/features/schedule/actions/schedule.actions";
import { getStages } from "@/features/stages/actions/stage.actions";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function getFestivalDateOptions(
  startISO: Date | null,
  endISO: Date | null,
): { value: string; label: string }[] {
  if (!startISO || !endISO) return [];
  const start = startOfDay(parseStoredInstant(startISO));
  const end = startOfDay(parseStoredInstant(endISO));
  if (start > end) return [];
  const days = eachDayOfInterval({ start, end });
  return days.map((d) => ({
    value: format(d, "yyyy-MM-dd"),
    label: format(d, "EEE, d MMM yyyy"),
  }));
}

export default async function SessionsPage({ params }: PageProps) {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);

  if (!festival) notFound();

  const canManage = await getEffectiveFeatureEnabled(festival.tier, "schedule");
  if (!canManage) {
    redirect(`/dashboard/${slug}?error=upgrade_required&feature=schedule`);
  }

  const [sessionEntries, stages] = await Promise.all([
    getScheduleEntries(festival.id, "SESSION"),
    getStages(festival.id),
  ]);

  const startDate = festival.startDate
    ? parseStoredInstant(festival.startDate)
    : null;
  const endDate = festival.endDate ? parseStoredInstant(festival.endDate) : null;

  const dateOptions = getFestivalDateOptions(startDate, endDate);

  return (
    <div className="container pt-4 sm:pt-6">
      <SessionScheduleClient
        festivalId={festival.id}
        initialEntries={sessionEntries}
        stages={stages.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description ?? null,
        }))}
        festivalStartDate={startDate?.toISOString() ?? null}
        festivalEndDate={endDate?.toISOString() ?? null}
      />
    </div>
  );
}
