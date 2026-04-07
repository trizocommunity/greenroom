import { format } from "date-fns";
import { Download, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { QrCodeWithActions } from "@/components/common/QrCodeWithActions";
import { ReportingEndsInCountdown } from "@/components/programme/ReportingEndsInCountdown";
import { CopyProfileLinkButton } from "@/components/student/CopyProfileLinkButton";
import { StudentQrDialogButton } from "@/components/student/StudentQrDialogButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_URL } from "@/config/routes";
import { prisma } from "@/lib/db";
import { FeatureService, getTierForFeatureCheck } from "@/lib/features";
import {
  getQrCodeContent,
  getStudentProfileUrl,
} from "@/lib/student-profile-url";
import { findFestivalBySlug } from "@/server/models/festival.model";
import { findStudentByFestivalAndProfileSlug } from "@/server/models/student.model";

const RESERVED_SLUGS = new Set([
  "results",
  "gallery",
  "news",
  "programmes",
  "sessions",
  "about",
]);

function isSessionTimedOut(
  session:
    | {
        status: string;
        windowEndsAt: Date | null;
      }
    | null
    | undefined,
): boolean {
  return Boolean(
    session?.status === "IN_PROGRESS" &&
      session.windowEndsAt &&
      session.windowEndsAt.getTime() <= Date.now(),
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

  const student = await findStudentByFestivalAndProfileSlug(
    festival.id,
    studentSlug,
  );
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
            {liveSessions.slice(0, 4).map((session) => (
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
                      endsAt={session.windowEndsAt.toISOString()}
                      autoRefreshOnExpire
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-2 text-right">
            <Link
              href={`/${slug}/${studentSlug}/assigned-programmes`}
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
              Live reporting — report to the stage manager.
            </p>
            {topLiveSession?.windowEndsAt ? (
              <div className="mt-2">
                <ReportingEndsInCountdown
                  endsAt={topLiveSession.windowEndsAt.toISOString()}
                  autoRefreshOnExpire
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
        <StudentQrDialogButton
          qrContent={getQrCodeContent(student)}
          studentName={student.name}
        />
      </div>

      {/* QR Code Section - Prominent Display */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3 text-center">
          <CardTitle className="text-lg flex items-center justify-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Your Chest Number QR Code
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            ⭐ Used for programme reporting - scan to mark attendance
          </p>
        </CardHeader>
        <CardContent className="flex justify-center pb-4">
          <QrCodeWithActions
            url={student.chestNumber || student.name || student.id}
            qrContent={getQrCodeContent(student)}
            size={220}
            downloadLabel="Download"
            shareLabel="WhatsApp"
            fileName={`${student.name.replace(/\s+/g, "-").toLowerCase()}-chest-${student.chestNumber || "unknown"}.png`}
            shareMessage={`My chest number: ${student.chestNumber || getQrCodeContent(student)} - ${festival.name}`}
            sizeVariant="lg"
          />
        </CardContent>
      </Card>

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

            {/* Profile Link */}
            <div className="pt-3 mt-3 border-t">
              <p className="text-xs font-medium mb-2">Your Profile Link</p>
              <div className="flex items-center gap-1">
                <CopyProfileLinkButton profileUrl={profileUrl} />
              </div>
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
