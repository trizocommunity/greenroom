import { notFound } from "next/navigation";
import { ProgrammeNotificationsClient } from "@/components/student/ProgrammeNotificationsClient";
import { findFestivalBySlug } from "@/server/models/festival.model";
import { findStudentByFestivalAndProfileSlug } from "@/server/models/student.model";

export default async function StudentNotificationsPage({
  params,
}: {
  params: Promise<{ slug: string; studentSlug: string }>;
}) {
  const { slug, studentSlug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival) notFound();

  const student = await findStudentByFestivalAndProfileSlug(
    festival.id,
    studentSlug,
  );
  if (!student) notFound();

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
      <ProgrammeNotificationsClient
        studentId={student.id}
        festivalId={festival.id}
      />
    </div>
  );
}
