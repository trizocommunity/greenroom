import { format, parseISO } from "date-fns";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  EmptyState,
  PublicSection,
  SectionHeader,
} from "@/components/festival/public/PublicSection";
import { getPublicFestivalData } from "@/features/festivals/loaders/festival-public.loader";
import { getScheduleEntriesPublic } from "@/features/schedule/actions/schedule.actions";
import { parseStoredScheduleInstant } from "@/features/schedule/utils/schedule-datetime";
import { ScheduleByDay, type ScheduleEntry } from "./ScheduleByDay";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicFestivalData(slug);

  if (!data) return { title: "Schedule Not Found" };

  const { festival } = data;
  const title = `Schedule - ${festival.name}`;

  return {
    title: title,
    description: `Full schedule for ${festival.name}.`,
    openGraph: {
      title: title,
      description: `Full schedule for ${festival.name}.`,
    },
  };
}

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const data = await getPublicFestivalData(slug);

  if (!data) return notFound();
  const { festival } = data;

  const rawEntries = await getScheduleEntriesPublic(festival.id);

  const entries: ScheduleEntry[] = rawEntries.map((entry) => ({
    id: entry.id,
    type: entry.type,
    startTime: parseStoredScheduleInstant(entry.startTime).toISOString(),
    endTime: entry.endTime
      ? parseStoredScheduleInstant(entry.endTime).toISOString()
      : null,
    title:
      entry.type === "PROGRAMME"
        ? (entry.programme?.name ?? "Programme")
        : entry.title?.trim() || "Session",
    category:
      entry.type === "PROGRAMME"
        ? (entry.programme?.category?.name ?? null)
        : null,
    sessionType: entry.type === "SESSION" ? (entry.sessionType ?? null) : null,
    description: entry.type === "SESSION" ? entry.description : null,
    speakers: entry.type === "SESSION" ? entry.speakers : null,
    stage: entry.stage ? { id: entry.stage.id, name: entry.stage.name } : null,
  }));

  const groupedByDay = entries.reduce<Record<string, ScheduleEntry[]>>(
    (acc, entry) => {
      const key = format(new Date(entry.startTime), "yyyy-MM-dd");
      if (!acc[key]) acc[key] = [];
      acc[key].push(entry);
      return acc;
    },
    {},
  );

  const sortedDays = Object.keys(groupedByDay).sort();

  const days = sortedDays.map((dateKey, index) => ({
    dateKey,
    tabLabel: `Day ${index + 1}`,
    label: format(parseISO(dateKey), "EEEE, MMM d, yyyy"),
    entries: groupedByDay[dateKey],
  }));

  const accentColor =
    festival.branding &&
    typeof festival.branding === "object" &&
    "colors" in festival.branding
      ? (festival.branding as any).colors?.primary || "var(--primary)"
      : "var(--primary)";

  return (
    <PublicSection>
      <SectionHeader
        as="h1"
        eyebrow="Schedule"
        title="Schedule"
        subtitle={`Every programme and session at ${festival.name}, day by day.`}
        className="mb-10"
      />

      {days.length === 0 ? (
        <EmptyState>No schedule published yet. Check back later.</EmptyState>
      ) : (
        <ScheduleByDay days={days} accentColor={accentColor} />
      )}
    </PublicSection>
  );
}
