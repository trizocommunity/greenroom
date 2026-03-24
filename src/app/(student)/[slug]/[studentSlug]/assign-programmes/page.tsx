import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { assertFestivalAccess } from "@/lib/auth/assert-festival-access";
import { FeatureService, getTierForFeatureCheck } from "@/lib/features";
import { findFestivalBySlug } from "@/server/models/festival.model";
import {
  findStudentByFestivalAndId,
  findStudentByFestivalAndProfileSlug,
} from "@/server/models/student.model";
import { prisma } from "@/lib/db";
import { AssignProgrammesClient } from "@/components/student/team-leader/AssignProgrammesClient";
import { getTeamLeaderGroupStudentsForSelection } from "@/lib/team-leader/my-team";
import { DeadlinesCard } from "@/components/festival/pre-works/DeadlinesCard";

function looksLikeUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

export default async function AssignProgrammesPage({
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

  const deadline = festival.programmeAssignmentDeadline;
  const isReadOnly = deadline ? new Date() > new Date(deadline) : false;
  const managerName =
    festival.owner?.displayName || festival.owner?.fullName || festival.owner?.email || null;
  const managerEmail = festival.owner?.email ?? null;
  const managerPhone =
    festival.branding &&
    typeof festival.branding === "object" &&
    ("contactNumber" in festival.branding || "phone" in festival.branding)
      ? ((festival.branding as any).contactNumber ??
        (festival.branding as any).phone ??
        null)
      : null;

  // Requirement: show/assign from ALL students in the leader's group.
  const { groupStudents } = await getTeamLeaderGroupStudentsForSelection(
    festival.id,
    student.id,
  );

  const programmes = await prisma.programme.findMany({
    where: { festivalId: festival.id },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  const groupCount = await prisma.group.count({
    where: { festivalId: festival.id },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Assign Programmes</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <DeadlinesCard />
        </div>
      </div>

      <AssignProgrammesClient
        festivalId={festival.id}
        leaderGroupId={student.groupId}
        leaderCategoryId={student.categoryId}
        isReadOnly={isReadOnly}
        deadline={deadline}
        managerName={managerName}
        managerEmail={managerEmail}
        managerPhone={managerPhone}
        groupCount={groupCount}
        programmes={programmes.map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          status: p.status,
          maxTeamsPerGroup: p.maxTeamsPerGroup,
          maxStudentsPerTeam: p.maxStudentsPerTeam,
          maxParticipantsPerGroup: p.maxParticipantsPerGroup,
          category: {
            id: p.category.id,
            name: p.category.name,
            type: p.category.type,
          },
        }))}
        myStudents={groupStudents.map((s) => ({
          id: s.id,
          name: s.name,
          chestNumber: s.chestNumber,
          categoryId: s.category?.id ?? student.categoryId,
        }))}
      />
    </div>
  );
}

