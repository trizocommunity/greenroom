import Link from "next/link";
import { format } from "date-fns";
import { MapPin, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamLeaderLogoutButton } from "@/components/student/team-leader/TeamLeaderLogoutButton";
import { requireTeamLeaderSession } from "@/lib/team-leader-auth/guard";
import { APP_URL } from "@/config/routes";
import { StudentQrButtonModal } from "@/components/student/StudentQrButtonModal";
import { getStudentProfileUrl } from "@/lib/student-profile-url";
import { getTeamLeaderMyStudents } from "@/lib/team-leader/my-team";
import { prisma } from "@/lib/db";

export default async function TeamLeaderDashboardPage({
  params,
}: {
  params: Promise<{ slug: string; studentSlug: string }>;
}) {
  const { slug, studentSlug } = await params;
  const { festival, student } = await requireTeamLeaderSession({ slug, studentSlug });
  const base = `/${slug}/${studentSlug}/leader`;

  const startDate = festival.startDate ?? festival.createdAt;
  const endDate =
    festival.endDate ??
    festival.expiresAt ??
    new Date(festival.createdAt.getTime() + 40 * 24 * 60 * 60 * 1000);
  const venue = festival.location ?? festival.orgLocation ?? "—";

  const { myStudents } = await getTeamLeaderMyStudents(festival.id, student.id);
  const myStudentIds = myStudents.map((s) => s.id);

  const publishedResultsCount = myStudentIds.length
    ? await prisma.result.count({
        where: {
          festivalId: festival.id,
          isPublished: true,
          assignment: {
            studentId: { in: myStudentIds },
          },
        },
      })
    : 0;

  const teamLeadersInGroup = await prisma.student.findMany({
    where: {
      festivalId: festival.id,
      groupId: student.groupId,
      isTeamLeader: true,
    },
    select: { id: true, name: true },
  });

  const profileUrl = getStudentProfileUrl(
    APP_URL.replace(/\/$/, ""),
    festival.slug,
    student,
  );

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-2xl uppercase font-bold tracking-tight">{student.name}</p>
        <div className="flex items-center gap-2">
          <StudentQrButtonModal profileUrl={profileUrl} />
          <TeamLeaderLogoutButton redirectTo={`/${slug}/${studentSlug}/leader`} />
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
            <span className="font-medium">{format(new Date(startDate), "PPpp")}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">End</span>
            <span className="font-medium">{format(new Date(endDate), "PPpp")}</span>
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
              <span className="font-medium">{student.group?.name ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Category</span>
              <span className="font-medium">{student.category?.name ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Chest No</span>
              <span className="font-mono">{student.chestNumber ?? "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Team Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Team Leaders in your group</p>
              {teamLeadersInGroup.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {teamLeadersInGroup.map((tl) => (
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
                <p className="text-sm text-muted-foreground">No team leaders assigned.</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">My Students</div>
                <div className="text-2xl font-semibold mt-1">{myStudents.length}</div>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <Trophy className="h-3.5 w-3.5" />
                  Published Results
                </div>
                <div className="text-2xl font-semibold mt-1">{publishedResultsCount}</div>
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
          <Button asChild><Link href={`${base}/assign-programmes`}>Assign Programmes</Link></Button>
          <Button asChild variant="outline"><Link href={`${base}/my-students`}>My Students</Link></Button>
          <Button asChild variant="outline"><Link href={`${base}/all-programmes`}>Programmes</Link></Button>
          <Button asChild variant="outline"><Link href={`${base}/leaderboard`}>Leaderboard</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}
