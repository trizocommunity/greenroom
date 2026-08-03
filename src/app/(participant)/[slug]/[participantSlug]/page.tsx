import { format } from "date-fns";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  ArrowRight,
  Bell,
  Crown,
  LayoutDashboard,
  ListChecks,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  APP_CONTAINER,
  AppPageHeader,
  AppSectionHeading,
  DataRow,
  StatusPill,
} from "@/components/app/AppSection";
import { ParticipantLogoutButton } from "@/components/festival/public/ParticipantLogoutButton";
import { ParticipantAssignedProgrammeCards } from "@/components/participant/ParticipantAssignedProgrammeCards";
import { ParticipantBadgeOrQr } from "@/components/participant/ParticipantBadgeOrQr";
import { ReportingEndsInCountdown } from "@/components/programme/ReportingEndsInCountdown";
import { getFestivalDurationDays } from "@/config/pricing";
import { getParticipantSessionFromCookie } from "@/core/auth/participant-session";
import { db } from "@/core/database/client";
import { MS } from "@/core/datetime/server";
import {
  participant as participantTable,
  programmeReportingSession as sessionTable,
} from "@/core/database/schema";
import type { ProgrammeStatus } from "@/core/types/app-enums";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import { findParticipantByFestivalAndProfileSlug } from "@/features/participants/repositories/participant.repository";
import { getQrCodeContent } from "@/features/participants/services/participant-profile-url";
import {
  FeatureService,
  getTierForFeatureCheck,
} from "@/features/plan-features/services/features";
import { getBadgePayloadAction } from "@/features/posters/actions/badge.actions";
import { indexReportingSessionsByProgramme } from "@/features/programmes/services/programme-reporting-display";
import { getProgrammeStatusPriorityRank } from "@/features/programmes/services/programme-status-priority";

const RESERVED_SLUGS = new Set([
  "results",
  "media",
  "news",
  "programmes",
  "sessions",
  "about",
]);

/** Keyed by the sub-route each tool lives at. */
const TEAM_LEADER_TOOLS = [
  {
    key: "dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
    hint: "Live summary and quick links",
  },
  {
    key: "assign-programmes",
    icon: ListChecks,
    label: "Assign programmes",
    hint: "Pick programmes for your participants",
  },
  {
    key: "my-participants",
    icon: Users,
    label: "My participants",
    hint: "Roster and chest numbers",
  },
  {
    key: "all-programmes",
    icon: ListChecks,
    label: "All programmes",
    hint: "Everything running at the festival",
  },
  {
    key: "notifications",
    icon: Bell,
    label: "Notifications",
    hint: "Programme updates",
  },
] as const;

function isSessionTimedOut(session: any): boolean {
  return Boolean(
    session?.status === "IN_PROGRESS" &&
      session.windowEndsAt &&
      new Date(session.windowEndsAt).getTime() <= Date.now(),
  );
}

export default async function ParticipantMainPage({
  params,
}: {
  params: Promise<{ slug: string; participantSlug: string }>;
}) {
  const { slug, participantSlug } = await params;
  if (RESERVED_SLUGS.has(participantSlug)) notFound();

  const festival = await findFestivalBySlug(slug);
  if (!festival) notFound();

  const canViewProfile = FeatureService.isFeatureEnabled(
    getTierForFeatureCheck(festival.tier as any),
    "publicParticipantProfile",
  );
  if (!canViewProfile) notFound();

  const participant = await findParticipantByFestivalAndProfileSlug(
    festival.id,
    participantSlug,
  );
  if (!participant) notFound();

  const session = await getParticipantSessionFromCookie();
  const isOwnerSession =
    !!session &&
    session.participantId === participant.id &&
    session.festivalId === festival.id;

  // No session for any reason → send to login. Auth/team-leader checks live
  // in `requireParticipantAuth` for protected sub-pages, not here.
  if (!isOwnerSession) {
    redirect(`/${festival.slug}/login`);
  }

  const startDate = festival.startDate ?? festival.createdAt;
  const endDate =
    festival.endDate ??
    festival.expiresAt ??
    new Date(
      new Date(festival.createdAt).getTime() +
        getFestivalDurationDays() * MS.day,
    ).toISOString();
  const venue = festival.location ?? festival.orgLocation ?? "—";

  const group = participant.group;
  const category = participant.category;

  const teamLeaders = group
    ? await db.query.participant.findMany({
        where: and(
          eq(participantTable.festivalId, festival.id),
          eq(participantTable.groupId, group.id),
          eq(participantTable.isTeamLeader, true),
        ),
        columns: { id: true, name: true, profileSlug: true, chestNumber: true },
      })
    : [];

  const programmeById = new Map<
    string,
    {
      programmeId: string;
      name: string;
      categoryName: string | null;
      status: ProgrammeStatus;
      programmeType: string;
    }
  >();
  const assignmentIdByProgrammeId = new Map<string, string>();

  for (const a of participant.assignments ?? []) {
    const p = a.programme;
    const pid = a.programmeId ?? p?.id;
    if (!pid || !p?.status) continue;
    if (!programmeById.has(pid)) {
      programmeById.set(pid, {
        programmeId: pid,
        name: p.name,
        categoryName: (p as any).category?.name ?? null,
        status: p.status as ProgrammeStatus,
        programmeType: p.type,
      });
    }
    assignmentIdByProgrammeId.set(pid, a.id);
  }

  const assignedProgrammes = Array.from(programmeById.values()).sort(
    (a, b) =>
      getProgrammeStatusPriorityRank(a.status) -
      getProgrammeStatusPriorityRank(b.status),
  );

  const assignmentProgrammeIds = assignedProgrammes.map((p) => p.programmeId);

  const reportingSessions =
    assignmentProgrammeIds.length > 0
      ? await db.query.programmeReportingSession.findMany({
          where: inArray(sessionTable.programmeId, assignmentProgrammeIds),
          with: {
            programme: { columns: { name: true } },
            stage: { columns: { name: true } },
            programmeReportedParticipants: { columns: { assignmentId: true } },
            programmeCodeLetters: {
              with: {
                programmeCodeLetterRecipients: {
                  columns: { participantId: true },
                },
              },
            },
          },
          orderBy: [desc(sessionTable.updatedAt)],
        })
      : [];

  const { latestByProgrammeId, latestClosedByProgrammeId } =
    indexReportingSessionsByProgramme(reportingSessions);

  const ongoingSessions = reportingSessions.filter((s) =>
    ["IN_PROGRESS", "CLOSED"].includes(s.status),
  );



  const liveSessions = ongoingSessions.filter(
    (s) => s.status === "IN_PROGRESS" && !isSessionTimedOut(s),
  );

  const badgeResult = await getBadgePayloadAction({
    festivalId: festival.id,
    festivalName: festival.name,
    participantName: participant.name,
    chestNumber: participant.chestNumber ?? "",
    teamName: group?.name ?? "",
    categoryName: category?.name ?? "",
    qrPayload: getQrCodeContent(participant as any),
  });
  const badge = badgeResult.success ? badgeResult.data ?? null : null;

  return (
    <div className={`${APP_CONTAINER} space-y-10 py-8 md:py-10`}>
      {/* Live reporting — the one thing that must be seen first on the day */}
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
                    {session.stage?.name ?? "No stage"} · report to the stage
                    manager
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
            href={`/${slug}/${participantSlug}/assigned-programmes`}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-opacity hover:opacity-70"
          >
            View all programmes
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      )}

      {/* Identity */}
      <AppPageHeader
        eyebrow={group?.name ?? "Participant"}
        title={participant.name}
        actions={
          <>
            <ParticipantBadgeOrQr
              badge={badge}
              qrContent={getQrCodeContent(participant as any)}
              participantName={participant.name}
            />
            {isOwnerSession ? (
              <ParticipantLogoutButton festivalSlug={slug} />
            ) : null}
          </>
        }
      />

      {/* Details. The QR lives behind the "View QR" button above rather than
          being printed inline — it is only needed at the moment of reporting,
          and inline it pushed everything else below the fold. */}
      <div className="grid gap-10 md:grid-cols-2 md:gap-14">
        <section>
          <AppSectionHeading title="Your details" />
          <dl className="border-t border-border">
            <DataRow label="Chest number" value={participant.chestNumber} />
            <DataRow label="Group" value={group?.name} />
            <DataRow label="Category" value={category?.name} />
            <DataRow
              label="Programmes"
              value={
                assignedProgrammes.length > 0
                  ? `${assignedProgrammes.length} assigned`
                  : "None yet"
              }
            />
          </dl>
        </section>

        <section>
          <AppSectionHeading title="Festival" />
          <dl className="border-t border-border">
            <DataRow label="Festival" value={festival.name} />
            <DataRow
              label="Dates"
              value={`${format(new Date(startDate), "PP")} – ${format(new Date(endDate), "PP")}`}
            />
            {venue !== "—" && <DataRow label="Venue" value={venue} />}
          </dl>

          <div className="mt-6">
            <p className="mb-2.5 text-xs text-muted-foreground">
              Team leaders for {group?.name ?? "your group"}
            </p>
            {teamLeaders.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {teamLeaders.map((tl) => (
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
      </div>

      {/* Team leader tools */}
      {participant.isTeamLeader ? (
        <section>
          <AppSectionHeading
            title="Team leader tools"
            description="You manage this group — assign programmes, track your roster and follow live reporting."
          />
          <ul className="divide-y divide-border border-y border-border">
            {TEAM_LEADER_TOOLS.map((tool) => (
              <li key={tool.key}>
                <Link
                  href={`/${slug}/${participantSlug}/${tool.key}`}
                  className="group flex items-center gap-4 py-3.5 transition-opacity hover:opacity-70"
                >
                  <tool.icon
                    className="h-4 w-4 shrink-0 text-primary"
                    strokeWidth={1.75}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium text-heading">
                      {tool.label}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {tool.hint}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Programmes */}
      {assignedProgrammes.length > 0 ? (
        <section>
          <AppSectionHeading
            title="Your programmes"
            actions={
              <Link
                href={`/${slug}/${participantSlug}/assigned-programmes`}
                className="text-sm font-medium text-primary transition-opacity hover:opacity-70"
              >
                View all
              </Link>
            }
          />
          <ParticipantAssignedProgrammeCards
            programmes={assignedProgrammes.slice(0, 6)}
            latestReportingByProgrammeId={latestByProgrammeId}
            latestClosedReportingByProgrammeId={latestClosedByProgrammeId}
            assignmentIdByProgrammeId={assignmentIdByProgrammeId}
            participantId={participant.id}
            emptyMessage="No assigned programmes yet."
          />
        </section>
      ) : null}
    </div>
  );
}
