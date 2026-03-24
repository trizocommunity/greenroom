import { notFound } from "next/navigation";
import { Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FeatureService, getTierForFeatureCheck } from "@/lib/features";
import { prisma } from "@/lib/db";
import { findFestivalBySlug } from "@/server/models/festival.model";
import {
  findStudentByFestivalAndId,
  findStudentByFestivalAndProfileSlug,
} from "@/server/models/student.model";
import { StudentDetailsDialog } from "@/components/festival/pre-works/students/StudentDetailsDialog";

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

export default async function MyGroupPage({
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

  // Non-leader pages are public; leaders use /leader routes.
  if (student.isTeamLeader) notFound();

  if (!student.groupId && !student.group?.id) notFound();

  const groupId = student.groupId ?? student.group?.id;

  const groupStudents = await prisma.student.findMany({
    where: { festivalId: festival.id, groupId: groupId as string },
    include: {
      group: true,
      category: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Students</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View every student in your group and open their profile details.
        </p>
      </div>

      {groupStudents.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No students in this group.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groupStudents.map((s: any) => (
            <Card key={s.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{s.name}</span>
                    {s.isTeamLeader && (
                      <Badge
                        variant="secondary"
                        className="bg-amber-500/15 text-amber-800 border-amber-500/30"
                      >
                        <span className="inline-flex items-center gap-1">
                          <Crown className="h-3.5 w-3.5" />
                          Team Leader
                        </span>
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {s.category?.name ?? "—"} · {s.chestNumber ?? "—"}
                  </div>
                </div>

                <StudentDetailsDialog
                  festivalId={festival.id}
                  student={s}
                  trigger={
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      View Details
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

