import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { festival as festivalTable } from "@/core/database/schema";
import { eq } from "drizzle-orm";
import { getFestivalContext } from "@/features/festivals/services/festival-context.service";
import { AnnouncerConsoleClient } from "@/components/dashboard/announcement/AnnouncerConsoleClient";
import type { TeamStandingRow } from "@/features/announcement/services/announcer.service";

export const metadata: Metadata = {
  title: "Announcer",
  description: "Announce standings to public",
};

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

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.slug, slug),
    columns: { 
      id: true, 
      queuedTeamStandings: true, 
      standingsPublishedAtResultNumber: true 
    },
  });
  if (!festival) notFound();

  const queuedStandings = (festival.queuedTeamStandings as TeamStandingRow[] | null) ?? [];

  return (
    <div className="pt-4 sm:pt-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Announcer Console
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Review staged standings and announce them publicly.
        </p>
      </div>
      <AnnouncerConsoleClient
        festivalId={festival.id}
        queuedStandings={queuedStandings}
        afterCount={festival.standingsPublishedAtResultNumber}
      />
    </div>
  );
}
