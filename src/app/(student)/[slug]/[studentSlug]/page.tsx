import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_URL } from "@/config/routes";
import { StudentQrButtonModal } from "@/components/student/StudentQrButtonModal";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { assertFestivalAccess } from "@/lib/auth/assert-festival-access";
import { FeatureService, getTierForFeatureCheck } from "@/lib/features";
import { findFestivalBySlug } from "@/server/models/festival.model";
import {
  findStudentByFestivalAndId,
  findStudentByFestivalAndProfileSlug,
} from "@/server/models/student.model";
import { prisma } from "@/lib/db";
import { getStudentProfileUrl } from "@/lib/student-profile-url";

const RESERVED_SLUGS = new Set([
  "results",
  "gallery",
  "news",
  "programmes",
  "sessions",
  "about",
]);

function looksLikeUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

export default async function StudentMainPage({
  params,
}: {
  params: Promise<{ slug: string; studentSlug: string }>;
}) {
  const { slug, studentSlug } = await params;
  if (RESERVED_SLUGS.has(studentSlug)) notFound();

  const session = await getSession();
  if (!session?.userId) notFound();

  const festival = await findFestivalBySlug(slug);
  if (!festival) notFound();

  await assertFestivalAccess(session, festival.id);

  const canViewProfile = FeatureService.isFeatureEnabled(
    getTierForFeatureCheck(festival.tier),
    "publicStudentProfile",
  );
  if (!canViewProfile) notFound();

  const student = looksLikeUuid(studentSlug)
    ? await findStudentByFestivalAndId(festival.id, studentSlug)
    : await findStudentByFestivalAndProfileSlug(festival.id, studentSlug);
  if (!student) notFound();

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
        where: { festivalId: festival.id, groupId: group.id, isTeamLeader: true },
        select: { id: true, name: true, profileSlug: true, chestNumber: true },
      })
    : [];

  const isTeamLeader = Boolean(student.isTeamLeader);

  const baseLink = `/${festival.slug}/${studentSlug}`;
  const profileUrl = getStudentProfileUrl(
    APP_URL.replace(/\/$/, ""),
    festival.slug,
    student,
  );

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
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
              <p className="text-sm text-muted-foreground">Who’s our Team Leader?</p>
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
                <p className="text-sm text-muted-foreground">No team leaders assigned.</p>
              )}
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Quick actions</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {!isTeamLeader ? (
                  <>
                    <Button asChild size="sm">
                      <Link href={`${baseLink}/assigned-programmes`}>Programmes</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`${baseLink}/my-group`}>My Group</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild size="sm">
                      <Link href={`${baseLink}/assign-programmes`}>Assign Programmes</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`${baseLink}/my-students`}>My Students</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`${baseLink}/all-programmes`}>Programmes</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`${baseLink}/leaderboard`}>Leaderboard</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

