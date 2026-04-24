import { Crown } from "lucide-react";
import { notFound } from "next/navigation";
import { StudentDetailsDialog } from "@/components/festival/pre-works/students/StudentDetailsDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { student as studentTable } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { FeatureService, getTierForFeatureCheck } from "@/lib/features";
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
    getTierForFeatureCheck(festival.tier as any),
    "publicStudentProfile",
  );
  if (!canViewProfile) notFound();

  const student = await findStudentByFestivalAndProfileSlug(
    festival.id,
    studentSlug,
  );
  if (!student) notFound();

  // Non-leader pages are public; leaders use /leader routes.
  if (student.isTeamLeader) notFound();

  const groupId = student.groupId ?? (student as any).group?.id;
  if (!groupId) notFound();

  const groupStudents = await db.query.student.findMany({
    where: and(eq(studentTable.festivalId, festival.id), eq(studentTable.groupId, groupId as string)),
    with: {
      group: true,
      category: true,
    },
    orderBy: [desc(studentTable.createdAt)],
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
