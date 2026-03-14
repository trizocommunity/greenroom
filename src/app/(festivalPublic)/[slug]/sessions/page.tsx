import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicFestivalData } from "@/server/loader/festivalPublic";
import { getSessionsPublic } from "@/server/actions/event.actions";
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

  const sessions = await getSessionsPublic(festival.id);

  const serialized = sessions.map((s) => ({
    id: s.id,
    startTime: s.startTime ? new Date(s.startTime).toISOString() : null,
    endTime: s.endTime ? new Date(s.endTime).toISOString() : null,
    event: {
      id: s.id,
      name: s.name,
      type: s.type,
      description: s.description ?? null,
      speakers: s.speakers ?? null,
    },
    stage: s.stage ? { id: s.stage.id, name: s.stage.name } : null,
  }));

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
            Sessions
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Sessions, talks, and ceremonies at {festival.name}. Select a session to
            see more.
          </p>
        </header>

        {serialized.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 py-16 text-center">
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
