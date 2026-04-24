import { notFound } from "next/navigation";
import { TeamLeaderLoginClient } from "@/components/student/team-leader/TeamLeaderLoginClient";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import {
  FeatureService,
  getTierForFeatureCheck,
} from "@/features/plan-features/services/features";
import { findStudentByFestivalAndProfileSlug } from "@/features/students/repositories/student.repository";

export default async function TeamLeaderLoginPage({
  params,
}: {
  params: Promise<{ slug: string; studentSlug: string }>;
}) {
  const { slug, studentSlug } = await params;
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
  if (!student?.isTeamLeader) notFound();

  return (
    <div className="max-w-xl mx-auto px-4 md:px-6 py-8">
      <TeamLeaderLoginClient
        festivalSlug={festival.slug}
        studentSlug={studentSlug}
        studentName={student.name}
      />
    </div>
  );
}
