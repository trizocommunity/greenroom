import { format } from "date-fns";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { MapPin, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { QrViewButton } from "@/components/common/QrViewButton";
import { ParticipantLogoutButton } from "@/components/festival/public/ParticipantLogoutButton";
import { ReportingEndsInCountdown } from "@/components/programme/ReportingEndsInCountdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_URL } from "@/config/routes";
import { requireParticipantAuth } from "@/core/auth/participant-guard";
import { db } from "@/core/database/client";
import {
  programmeAssignment as assignmentTable,
  participant as participantTable,
  result as resultTable,
  programmeReportingSession as sessionTable,
} from "@/core/database/schema";
import { getTeamLeaderMyParticipants } from "@/features/participants/services/my-team";
import {
  getParticipantProfileUrl,
  getQrCodeContent,
} from "@/features/participants/services/participant-profile-url";

export default async function TeamLeaderDashboardPage({
  params,
}: {
  params: Promise<{ slug: string; participantSlug: string }>;
}) {
  const { slug, participantSlug } = await params;
  const { festival, participant } = await requireParticipantAuth(
    slug,
    participantSlug,
    true,
  );
  const base = `/${slug}/${participantSlug}`;

  const startDate = festival.startDate ?? festival.createdAt;
  const endDate =
    festival.endDate ??
    festival.expiresAt ??
    new Date(
      new Date(festival.createdAt).getTime() + 40 * 24 * 60 * 60 * 1000,
    ).toISOString();
  const venue = festival.location ?? festival.orgLocation ?? "—";

  const { myParticipants } = await getTeamLeaderMyParticipants(
    festival.id,
    participant.id,
  );
  const myParticipantIds = myParticipants.map((s) => s.id);

  let publishedResultsCount = 0;
  if (myParticipantIds.length > 0) {
    const results = await db
      .select({ count: sql`count(*)` })
      .from(resultTable)
      .innerJoin(
        assignmentTable,
        eq(resultTable.assignmentId, assignmentTable.id),
      )
      .where(
        and(
          eq(resultTable.festivalId, festival.id),
          eq(resultTable.isPublished, true),
          inArray(assignmentTable.participantId, myParticipantIds),
        ),
      );
    publishedResultsCount = Number(results[0]?.count ?? 0);
  }

  const teamLeadersInGroup = await db.query.participant.findMany({
    where: and(
      eq(participantTable.festivalId, festival.id),
      eq(participantTable.groupId, participant.groupId!),
      eq(participantTable.isTeamLeader, true),
    ),
    columns: { id: true, name: true },
  });

  const profileUrl = getParticipantProfileUrl(
    APP_URL.replace(/\/$/, ""),
    festival.slug,
    participant as any,
  );

  const groupProgrammeIdsRows = await db
    .select({ programmeId: assignmentTable.programmeId })
    .from(assignmentTable)
    .where(
      and(
        eq(assignmentTable.festivalId, festival.id),
        eq(assignmentTable.groupId, participant.groupId!),
      ),
    );
  const groupProgrammeIds = groupProgrammeIdsRows.map((r) => r.programmeId);

  const ongoingSessions =
    groupProgrammeIds.length > 0
      ? await db.query.programmeReportingSession.findMany({
          where: and(
            inArray(sessionTable.programmeId, groupProgrammeIds),
            inArray(sessionTable.status, ["IN_PROGRESS", "CLOSED"]),
          ),
          with: {
            programme: { columns: { name: true } },
            stage: { columns: { name: true } },
          },
          orderBy: [desc(sessionTable.updatedAt)],
          limit: 5,
        })
      : [];

  const isSessionTimedOut = (session: any) =>
    session.status === "IN_PROGRESS" &&
    Boolean(
      session.windowEndsAt &&
        new Date(session.windowEndsAt).getTime() <= Date.now(),
    );

  const liveSessions = ongoingSessions.filter(
    (s) => s.status === "IN_PROGRESS" && !isSessionTimedOut(s),
  );
  const topLiveSession = liveSessions[0];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
      {liveSessions.length > 1 ? (
        <div className="w-full rounded-xl border border-emerald-600/30 bg-emerald-500/10 p-3 sm:p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Live reporting
            </p>
            <Badge className="bg-emerald-600 text-white">
              {liveSessions.length} active
            </Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {liveSessions.slice(0, 4).map((session: any) => (
              <div
                key={session.id}
                className="rounded-md border border-emerald-700/20 bg-background/50 px-2.5 py-2"
              >
                <p className="truncate text-sm font-medium">
                  {session.programme?.name ?? "Programme"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {session.stage?.name ?? "No stage"}
                </p>
                {session.windowEndsAt ? (
                  <div className="mt-1">
                    <ReportingEndsInCountdown
                      endsAt={session.windowEndsAt}
                      autoRefreshOnExpire
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-2 text-right">
            <Link
              href={`${base}/all-programmes`}
              className="text-xs font-medium underline underline-offset-4"
            >
              View all programmes
            </Link>
          </div>
        </div>
      ) : liveSessions.length === 1 ? (
        <div className="w-full rounded-xl border px-4 min-h-20 border-emerald-600/30 bg-emerald-500/10 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Current programme
            </p>
            <p className="text-sm font-medium truncate">
              {topLiveSession?.programme?.name ?? "Programme"}
              {topLiveSession?.stage?.name ? (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · {topLiveSession.stage.name}
                </span>
              ) : null}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live reporting for your group’s programmes.
            </p>
            {topLiveSession?.windowEndsAt ? (
              <div className="mt-2">
                <ReportingEndsInCountdown
                  endsAt={topLiveSession.windowEndsAt}
                  autoRefreshOnExpire
                />
              </div>
            ) : null}
          </div>
          <Link
            href={`${base}/all-programmes`}
            className="text-sm font-medium underline underline-offset-4"
          >
            View all programmes
          </Link>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-2xl uppercase font-bold tracking-tight">
          {participant.name}
        </p>
        <div className="flex items-center gap-2">
          <QrViewButton
            qrContent={getQrCodeContent(participant as any)}
            participantName={participant.name}
          />
          <ParticipantLogoutButton festivalSlug={slug} />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Festival
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Start</span>
            <span className="font-medium">
              {format(new Date(startDate), "PPpp")}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">End</span>
            <span className="font-medium">
              {format(new Date(endDate), "PPpp")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Venue:</span>
            <span className="font-medium">{venue}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Leader Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Group</span>
              <span className="font-medium">
                {participant.group?.name ?? "—"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Category</span>
              <span className="font-medium">
                {participant.category?.name ?? "—"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Chest No</span>
              <span className="font-mono">
                {participant.chestNumber ?? "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Team Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Team Leaders in your group
              </p>
              {teamLeadersInGroup.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {teamLeadersInGroup.map((tl) => (
                    <Badge
                      key={tl.id}
                      variant={tl.id === participant.id ? "default" : "outline"}
                      className={
                        tl.id === participant.id
                          ? "bg-amber-600 text-white border-transparent"
                          : "bg-amber-500/10 border-amber-500/30 text-amber-800"
                      }
                    >
                      {tl.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No team leaders assigned.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">
                  My Participants
                </div>
                <div className="text-2xl font-semibold mt-1">
                  {myParticipants.length}
                </div>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <Trophy className="h-3.5 w-3.5" />
                  Published Results
                </div>
                <div className="text-2xl font-semibold mt-1">
                  {publishedResultsCount}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`${base}/assign-programmes`}>Assign Programmes</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`${base}/my-participants`}>My Participants</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`${base}/all-programmes`}>Programmes</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`${base}/leaderboard`}>Leaderboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`${base}/notifications`}>Notifications</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
