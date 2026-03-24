import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { assertFestivalAccess } from "@/lib/auth/assert-festival-access";
import { FeatureService, getTierForFeatureCheck } from "@/lib/features";
import { prisma } from "@/lib/db";
import { findFestivalBySlug } from "@/server/models/festival.model";
import {
  findStudentByFestivalAndId,
  findStudentByFestivalAndProfileSlug,
} from "@/server/models/student.model";
import { MyStudentsClient } from "../../../../../components/student/team-leader/MyStudentsClient";

function looksLikeUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

export default async function MyStudentsPage({
  params,
}: {
  params: Promise<{ slug: string; studentSlug: string }>;
}) {
  const { slug, studentSlug } = await params;

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
  if (!student.isTeamLeader) notFound();

  const groupStudents = await prisma.student.findMany({
    where: { festivalId: festival.id, groupId: student.groupId },
    include: { group: true, category: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Students</h1>
        <p className="text-sm text-muted-foreground mt-1">
          All students in your group (filter by category).
        </p>
      </div>
      <MyStudentsClient
        festivalId={festival.id}
        festivalSlug={festival.slug}
        students={groupStudents}
      />
    </div>
  );
}

