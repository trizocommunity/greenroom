import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { format, parseISO } from "date-fns";
import { getPublicFestivalData } from "@/server/loader/festivalPublic";
import { getScheduleEntriesPublic } from "@/server/actions/schedule.actions";
import { ProgrammesByDay } from "./ProgrammesByDay";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicFestivalData(slug);

  if (!data) return { title: "Programmes Not Found" };

  const { festival } = data;
  const title = `Programmes - ${festival.name}`;

  return {
    title: title,
    description: `Programme schedule for ${festival.name}.`,
    openGraph: {
      title: title,
      description: `Programme schedule for ${festival.name}.`,
    },
  };
}

export default async function ProgrammesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const data = await getPublicFestivalData(slug);

  if (!data) return notFound();
  const { festival } = data;

  const programmeEntries = await getScheduleEntriesPublic(
    festival.id,
    "PROGRAMME",
  );

  const groupedByDay = programmeEntries.reduce<
    Record<string, typeof programmeEntries>
  >((acc, entry) => {
    const key = format(new Date(entry.startTime), "yyyy-MM-dd");
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  const sortedDays = Object.keys(groupedByDay).sort();

  const days = sortedDays.map((dateKey, index) => {
    const dayDate = parseISO(dateKey);
    const entries = groupedByDay[dateKey].map((entry) => ({
      id: entry.id,
      startTime: new Date(entry.startTime).toISOString(),
      endTime: entry.endTime ? new Date(entry.endTime).toISOString() : null,
      programme: {
        id: entry.programme!.id,
        name: entry.programme!.name,
        category: entry.programme!.category
          ? { name: entry.programme!.category.name }
          : null,
      },
      stage: entry.stage
        ? { id: entry.stage.id, name: entry.stage.name }
        : null,
    }));
    return {
      dateKey,
      tabLabel: `Day ${index + 1}`,
      label: format(dayDate, "EEEE, MMM d, yyyy"),
      entries,
    };
  });

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
            Programmes
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Competition and performance programmes at {festival.name}. Switch
            days to see the schedule.
          </p>
        </header>

        {days.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 py-16 text-center">
            <p className="text-muted-foreground">
              No programme schedule published yet. Check back later.
            </p>
          </div>
        ) : (
          <ProgrammesByDay days={days} />
        )}
      </div>
    </div>
  );
}
