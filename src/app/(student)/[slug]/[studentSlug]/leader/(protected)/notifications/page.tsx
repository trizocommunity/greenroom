import { ProgrammeNotificationsClient } from "@/components/student/ProgrammeNotificationsClient";
import { requireTeamLeaderSession } from "@/core/auth/team-leader-guard";

export default async function TeamLeaderNotificationsPage({
  params,
}: {
  params: Promise<{ slug: string; studentSlug: string }>;
}) {
  const { slug, studentSlug } = await params;
  const { student } = await requireTeamLeaderSession({ slug, studentSlug });

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
      <ProgrammeNotificationsClient
        studentId={student.id}
        festivalId={student.festivalId}
      />
    </div>
  );
}
