import { format } from "date-fns";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { ArrowRight, Bell, Crown, ListChecks, Users } from "lucide-react";
import Link from "next/link";
import {
  APP_CONTAINER,
  AppPageHeader,
  AppSectionHeading,
  DataRow,
  StatusPill,
} from "@/components/app/AppSection";
import { QrViewButton } from "@/components/common/QrViewButton";
import { DeadlineWindowChip } from "@/components/festival/pre-event-works/DeadlineWindowChip";
import { ParticipantLogoutButton } from "@/components/festival/public/ParticipantLogoutButton";
import { ReportingEndsInCountdown } from "@/components/programme/ReportingEndsInCountdown";
import { APP_URL } from "@/config/routes";
import { getFestivalDurationDays } from "@/config/pricing";
import { requireParticipantAuth } from "@/core/auth/participant-guard";
import { db } from "@/core/database/client";
import { MS } from "@/core/datetime/server";
import {
  programmeAssignment as assignmentTable,
  programmeAssignmentMember as assignmentMemberTable,
  participant as participantTable,
  result as resultTable,
  programmeReportingSession as sessionTable,
} from "@/core/database/schema";
import { getTeamLeaderMyParticipants } from "@/features/participants/services/my-team";
import {
  getParticipantProfileUrl,
  getQrCodeContent,
} from "@/features/participants/services/participant-profile-url";

/** Keyed by the sub-route each link points at. */
const QUICK_LINKS = [
  { key: "assign-programmes", icon: ListChecks, label: "Assign programmes" },
  { key: "my-participants", icon: Users, label: "My participants" },
  { key: "all-programmes", icon: ListChecks, label: "All programmes" },
  { key: "notifications", icon: Bell, label: "Notifications" },
] as const;

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
      new Date(festival.createdAt).getTime() +
        getFestivalDurationDays() * MS.day,
    ).toISOString();
  const venue = festival.location ?? festival.orgLocation ?? "—";

  const { myParticipants } = await getTeamLeaderMyParticipants(
    festival.id,
    participant.id,
  );
  const myParticipantIds = myParticipants.map((s) => s.id);

  let publishedResultsCount = 0;
  if (myParticipantIds.length > 0) {
    const individualResults = await db
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
    const totalIndividual = Number(individualResults[0]?.count ?? 0);

    const memberResults = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${resultTable.id})` })
      .from(resultTable)
      .innerJoin(
        assignmentTable,
        eq(resultTable.assignmentId, assignmentTable.id),
      )
      .innerJoin(
        assignmentMemberTable,
        eq(assignmentMemberTable.assignmentId, assignmentTable.id),
      )
      .where(
        and(
          eq(resultTable.festivalId, festival.id),
          eq(resultTable.isPublished, true),
          inArray(assignmentMemberTable.participantId, myParticipantIds),
          isNull(assignmentTable.participantId),
        ),
      );
    const totalMember = Number(memberResults[0]?.count ?? 0);
    publishedResultsCount = totalIndividual + totalMember;
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

  return (
    <div className={`${APP_CONTAINER} space-y-10 py-8 md:py-10`}>
      {/* Live reporting first — it is the only time-critical thing here */}
      {liveSessions.length > 0 && (
        <section className="rounded-2xl border border-success/30 bg-success/[0.07] p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <StatusPill tone="live" pulse>
              Live reporting
            </StatusPill>
            {liveSessions.length > 1 && (
              <span className="text-xs tabular-nums text-muted-foreground">
                {liveSessions.length} active
              </span>
            )}
          </div>

          <ul className="divide-y divide-success/20">
            {liveSessions.slice(0, 4).map((session: any) => (
              <li
                key={session.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium text-heading">
                    {session.programme?.name ?? "Programme"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {session.stage?.name ?? "No stage"}
                  </p>
                </div>
                {session.windowEndsAt && (
                  <ReportingEndsInCountdown
                    endsAt={session.windowEndsAt}
                    autoRefreshOnExpire
                  />
                )}
              </li>
            ))}
          </ul>

          <Link
            href={`${base}/all-programmes`}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-opacity hover:opacity-70"
          >
            View all programmes
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      )}

      <AppPageHeader
        eyebrow="Team leader"
        title={participant.name}
        description={participant.group?.name ?? undefined}
        actions={
          <>
            <QrViewButton
              qrContent={getQrCodeContent(participant as any)}
              participantName={participant.name}
            />
            <ParticipantLogoutButton festivalSlug={slug} />
          </>
        }
      />

      {/* Deadline windows — when the leader can register and assign */}
      <section className="grid gap-3 sm:grid-cols-2">
        <DeadlineWindowChip
          label="Participant registration"
          start={festival.participantCreationStartDate}
          end={festival.participantCreationDeadline}
        />
        <DeadlineWindowChip
          label="Programme assignments"
          start={festival.programmeAssignmentStartDate}
          end={festival.programmeAssignmentDeadline}
        />
      </section>

      {/* Counts */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border">
        <div className="bg-card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            My participants
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-heading">
            {myParticipants.length}
          </p>
        </div>
        <div className="bg-card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Published results
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-heading">
            {publishedResultsCount}
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="grid gap-10 md:grid-cols-2 md:gap-14">
        <section>
          <AppSectionHeading title="Your details" />
          <dl className="border-t border-border">
            <DataRow label="Chest number" value={participant.chestNumber} />
            <DataRow label="Group" value={participant.group?.name} />
            <DataRow label="Category" value={participant.category?.name} />
          </dl>

          <div className="mt-6">
            <p className="mb-2.5 text-xs text-muted-foreground">
              Team leaders in your group
            </p>
            {teamLeadersInGroup.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {teamLeadersInGroup.map((tl) => (
                  <StatusPill
                    key={tl.id}
                    tone={tl.id === participant.id ? "ready" : "muted"}
                    icon={Crown}
                  >
                    {tl.name}
                    {tl.id === participant.id ? " (you)" : ""}
                  </StatusPill>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No team leader assigned yet.
              </p>
            )}
          </div>
        </section>

        <section>
          <AppSectionHeading title="Festival" />
          <dl className="border-t border-border">
            <DataRow
              label="Starts"
              value={format(new Date(startDate), "PPp")}
            />
            <DataRow label="Ends" value={format(new Date(endDate), "PPp")} />
            <DataRow label="Venue" value={venue} />
          </dl>
        </section>
      </div>

      {/* Quick links */}
      <section>
        <AppSectionHeading title="Go to" />
        <ul className="divide-y divide-border border-y border-border">
          {QUICK_LINKS.map((link) => (
            <li key={link.key}>
              <Link
                href={`${base}/${link.key}`}
                className="group flex items-center gap-4 py-3.5 transition-opacity hover:opacity-70"
              >
                <link.icon
                  className="h-4 w-4 shrink-0 text-primary"
                  strokeWidth={1.75}
                />
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-heading">
                  {link.label}
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
