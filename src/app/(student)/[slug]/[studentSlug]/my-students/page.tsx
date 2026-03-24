import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { MyStudentsClient } from "@/components/student/team-leader/MyStudentsClient";
import { requireTeamLeaderSession } from "@/lib/team-leader-auth/guard";

export default async function MyStudentsPage({
  params,
}: {
  params: Promise<{ slug: string; studentSlug: string }>;
}) {
  const { slug, studentSlug } = await params;

  const { festival, student } = await requireTeamLeaderSession({ slug, studentSlug });

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

