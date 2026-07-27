import { ProgrammeNotificationsClient } from "@/components/student/ProgrammeNotificationsClient";
import { requireParticipantAuth } from "@/core/auth/participant-guard";

export default async function TeamLeaderNotificationsPage({
  params,
}: {
  params: Promise<{ slug: string; studentSlug: string }>;
}) {
  const { slug, studentSlug } = await params;
  const { student } = await requireParticipantAuth(slug, studentSlug, true);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
      <ProgrammeNotificationsClient
        studentId={student.id}
        festivalId={student.festivalId}
      />
    </div>
  );
}
