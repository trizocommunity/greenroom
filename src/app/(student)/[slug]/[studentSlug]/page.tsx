import { format } from "date-fns";
import { MapPin, Users } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ReportingEndsInCountdown } from "@/components/programme/ReportingEndsInCountdown";
import { StudentQrButtonModal } from "@/components/student/StudentQrButtonModal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_URL } from "@/config/routes";
import { prisma } from "@/lib/db";
import { FeatureService, getTierForFeatureCheck } from "@/lib/features";
import { getCodeForStudentFromLetters } from "@/lib/programme-reporting-code";
import { getStudentProfileUrl } from "@/lib/student-profile-url";
import { findFestivalBySlug } from "@/server/models/festival.model";
import {
  findStudentByFestivalAndId,
  findStudentByFestivalAndProfileSlug,
} from "@/server/models/student.model";

const RESERVED_SLUGS = new Set([
  "results",
  "gallery",
  "news",
  "programmes",
  "sessions",
  "about",
]);

function looksLikeUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s,
  );
}

export default async function StudentMainPage({
  params,
}: {
  params: Promise<{ slug: string; studentSlug: string }>;
}) {
  const { slug, studentSlug } = await params;
  if (RESERVED_SLUGS.has(studentSlug)) notFound();

  const festival = await findFestivalBySlug(slug);
  if (!festival) notFound();

  const canViewProfile = FeatureService.isFeatureEnabled(
    getTierForFeatureCheck(festival.tier),
    "publicStudentProfile",
  );
  if (!canViewProfile) notFound();

  const student = looksLikeUuid(studentSlug)
    ? await findStudentByFestivalAndId(festival.id, studentSlug)
    : await findStudentByFestivalAndProfileSlug(festival.id, studentSlug);
  if (!student) notFound();
  if (student.isTeamLeader) redirect(`/${festival.slug}/${studentSlug}/leader`);

  const startDate = festival.startDate ?? festival.createdAt;
  const endDate =
    festival.endDate ??
    festival.expiresAt ??
    new Date(festival.createdAt.getTime() + 40 * 24 * 60 * 60 * 1000);
  const venue = festival.location ?? festival.orgLocation ?? "—";

  const group = student.group;
  const category = student.category;

  // Team leaders within the student's group.
  const teamLeaders = group
    ? await prisma.student.findMany({
        where: {
          festivalId: festival.id,
          groupId: group.id,
          isTeamLeader: true,
        },
        select: { id: true, name: true, profileSlug: true, chestNumber: true },
      })
    : [];

  const ongoingSessions = await prisma.programmeReportingSession.findMany({
    where: {
      programmeId: {
        in: (student.assignments ?? []).map((a: any) => a.programmeId),
      },
      status: { in: ["IN_PROGRESS", "CLOSED"] },
    },
    include: {
      programme: { select: { name: true } },
      stage: { select: { name: true } },
      codeLetters: {
        where: { recipients: { some: { studentId: student.id } } },
        orderBy: { issuedAt: "desc" },
        take: 5,
        include: {
          recipients: { where: { studentId: student.id } },
        },
      },
      scheduleEntry: { select: { startTime: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  const profileUrl = getStudentProfileUrl(
    APP_URL.replace(/\/$/, ""),
    festival.slug,
    student,
  );

  const stripIsLive = ongoingSessions.some((s) => s.status === "IN_PROGRESS");
  const topSession =
    ongoingSessions.find((s) => s.status === "IN_PROGRESS") ??
    ongoingSessions[0];
  const topCode = topSession
    ? getCodeForStudentFromLetters(topSession.codeLetters, student.id)
    : null;
  const stripIsClosed = Boolean(
    topSession?.status === "CLOSED" &&
      ongoingSessions.length > 0 &&
      !stripIsLive,
  );

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
      {ongoingSessions.length > 0 ? (
        <div
          className={`w-full rounded-xl border px-4 ${
            stripIsLive
              ? "min-h-20 border-emerald-600/30 bg-emerald-500/10 py-3"
              : stripIsClosed
                ? "min-h-20 border-blue-600/35 bg-blue-500/10 py-3"
                : "min-h-16 border-amber-600/25 bg-amber-500/10 py-3"
          } flex items-center justify-between gap-3`}
        >
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Current programme
            </p>
            <p className="text-sm font-medium truncate">
              {topSession?.programme?.name ?? "Programme"}
              {topSession?.stage?.name ? (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · {topSession.stage.name}
                </span>
              ) : null}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {topSession?.status === "IN_PROGRESS"
                ? "Live reporting — report to the stage manager."
                : topSession?.status === "CLOSED"
                  ? topCode
                    ? `Reporting ended — your code letter is ${topCode}.`
                    : "Reporting ended."
                  : topSession?.status === "RESET"
                    ? "Reporting closed — no codes were issued."
                    : "Programme reporting update."}
            </p>
            {stripIsLive &&
            topSession?.status === "IN_PROGRESS" &&
            topSession.windowEndsAt ? (
              <div className="mt-2">
                <ReportingEndsInCountdown
                  endsAt={topSession.windowEndsAt.toISOString()}
                />
              </div>
            ) : null}
          </div>
          <Link
            href={`/${slug}/${studentSlug}/assigned-programmes`}
            className="text-sm font-medium underline underline-offset-4"
          >
            View all programmes
          </Link>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
          {student.name}
        </h1>
        <StudentQrButtonModal profileUrl={profileUrl} />
      </div>

      {/* Festival summary */}
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

      {/* Student details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Student</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Group</span>
              <span className="font-medium">{group?.name ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Category</span>
              <span className="font-medium">{category?.name ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Chest No</span>
              <span className="font-mono">{student.chestNumber ?? "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Your Team</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">
                Who’s our Team Leader?
              </p>
              {teamLeaders.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {teamLeaders.map((tl) => (
                    <Badge
                      key={tl.id}
                      variant={tl.id === student.id ? "default" : "outline"}
                      className={
                        tl.id === student.id
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

            <div>
              <p className="text-sm text-muted-foreground">Quick actions</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <p className="text-sm text-muted-foreground">
                  Team leader login is only available for assigned team leaders.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
