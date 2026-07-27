import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicFestivalData } from "@/features/festivals/loaders/festival-public.loader";
import { getScheduleEntriesPublic } from "@/features/schedule/actions/schedule.actions";
import { parseStoredScheduleInstant } from "@/features/schedule/utils/schedule-datetime";
import { PublicSessionCards } from "./PublicSessionCards";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicFestivalData(slug);

  if (!data) return { title: "Sessions Not Found" };

  const { festival } = data;
  const title = `Sessions - ${festival.name}`;

  return {
    title: title,
    description: `Sessions for ${festival.name}.`,
    openGraph: {
      title: title,
      description: `Sessions for ${festival.name}.`,
    },
  };
}

export default async function SessionsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const data = await getPublicFestivalData(slug);

  if (!data) return notFound();
  const { festival } = data;

  const sessionEntries = await getScheduleEntriesPublic(festival.id, "SESSION");

  const serialized = sessionEntries.map((e) => ({
    id: e.id,
    startTime: parseStoredScheduleInstant(e.startTime).toISOString(),
    endTime: e.endTime
      ? parseStoredScheduleInstant(e.endTime).toISOString()
      : null,
    session: {
      id: e.id,
      name: e.title || "Session",
      type: e.sessionType ?? "GENERAL",
      description: e.description ?? null,
      speakers: e.speakers ?? null,
    },
    stage: e.stage ? { id: e.stage.id, name: e.stage.name } : null,
  }));

  return (
    <div className="min-h-screen py-16 md:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <p className="text-eyebrow mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Schedule
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-heading mb-2">
            Sessions
          </h1>
          <p className="text-muted-foreground text-base max-w-2xl leading-relaxed">
            Sessions, talks, and ceremonies at {festival.name}. Select a session
            to see more.
          </p>
        </header>

        {serialized.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 py-16 text-center">
            <p className="text-muted-foreground">
              No sessions published yet. Check back later.
            </p>
          </div>
        ) : (
          <PublicSessionCards entries={serialized} />
        )}
      </div>
    </div>
  );
}
