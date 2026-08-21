import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AnnouncerConsoleClient } from "@/components/dashboard/announcement/AnnouncerConsoleClient";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { festival as festivalTable } from "@/core/database/schema";
import type { TeamStandingRow } from "@/features/announcement/services/announcer.service";
import { getCallListProgrammes } from "@/features/announcement/services/announcer.service";
import { getFestivalContext } from "@/features/festivals/services/festival-context.service";

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
      standingsPublishedAtResultNumber: true,
    },
  });
  if (!festival) notFound();

  const queuedStandings =
    (festival.queuedTeamStandings as TeamStandingRow[] | null) ?? [];

  const callList = await getCallListProgrammes(festival.id);

  return (
    <div className="pt-4 sm:pt-6 h-full">
      <AnnouncerConsoleClient
        festivalId={festival.id}
        queuedStandings={queuedStandings}
        afterCount={festival.standingsPublishedAtResultNumber}
        callList={callList}
        userName={session?.name ?? undefined}
      />
    </div>
  );
}
