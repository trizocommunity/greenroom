import { and, asc, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { MyStudentsClient } from "@/components/student/team-leader/MyStudentsClient";
import { requireParticipantAuth } from "@/core/auth/participant-guard";
import { db } from "@/core/database/client";
import { category as categoryTable, student as studentTable } from "@/core/database/schema";

export default async function MyStudentsPage({
  params,
}: {
  params: Promise<{ slug: string; studentSlug: string }>;
}) {
  const { slug, studentSlug } = await params;

  const { festival, student } = await requireParticipantAuth(
    slug,
    studentSlug,
    true,
  );

  const [groupStudents, categories] = await Promise.all([
    db.query.student.findMany({
      where: and(
        eq(studentTable.festivalId, festival.id),
        eq(studentTable.groupId, student.groupId!),
      ),
      with: { group: true, category: true },
      orderBy: [desc(studentTable.createdAt)],
    }),
    db.query.category.findMany({
      where: eq(categoryTable.festivalId, festival.id),
      columns: { id: true, name: true, type: true },
      orderBy: [asc(categoryTable.name)],
    }),
  ]);

  const deadline = festival.studentCreationDeadline;
  const isReadOnly = deadline ? new Date() > new Date(deadline) : false;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-4">

      <MyStudentsClient
        festivalId={festival.id}
        festivalSlug={festival.slug}
        students={groupStudents as any[]}
        allCategories={categories
          .filter((c) => c.type === "SINGLE")
          .map((c) => ({ id: c.id, name: c.name }))}
        deadline={deadline}
        isReadOnly={isReadOnly}
      />
    </div>
  );
}
