import { EventsClient } from "@/components/festival/pre-works/events/EventsClient";
import { findFestivalBySlug } from "@/server/models/festival.model";
import { getEvents } from "@/server/actions/event.actions";
import { getStages } from "@/server/actions/stage.actions";
import { notFound, redirect } from "next/navigation";
import { getEffectiveFeatureEnabled } from "@/server/services/plan-features.service";
import { format, eachDayOfInterval, startOfDay } from "date-fns";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function getFestivalDateOptions(
  startISO: Date | null,
  endISO: Date | null,
): { value: string; label: string }[] {
  if (!startISO || !endISO) return [];
  const start = startOfDay(new Date(startISO));
  const end = startOfDay(new Date(endISO));
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
    redirect(
      `/dashboard/${slug}?error=upgrade_required&feature=schedule`,
    );
  }

  const [events, stages] = await Promise.all([
    getEvents(festival.id),
    getStages(festival.id),
  ]);

  const dateOptions = getFestivalDateOptions(
    festival.startDate,
    festival.endDate,
  );

  return (
    <div className="container pt-4 sm:pt-6">
      <EventsClient
        festivalId={festival.id}
        initialEvents={events}
        stages={stages.map((s) => ({ id: s.id, name: s.name, description: s.description }))}
        dateOptions={dateOptions}
      />
    </div>
  );
}
