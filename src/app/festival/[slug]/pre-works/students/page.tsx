import { notFound } from "next/navigation";
import { StudentsClient } from "@/components/festival/pre-works/students/StudentsClient";
import { getSession } from "@/lib/auth/session";
import { findFestivalBySlugOrId } from "@/server/models/festival.model";
import { findMemberByFestivalAndUser } from "@/server/models/member.model";

export default async function StudentsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: festivalSlug } = await params;
  const festival = await findFestivalBySlugOrId(festivalSlug);

  if (!festival) {
    notFound();
  }

  // Fetch current user member role
  const session = await getSession();
  const member = session?.userId
    ? await findMemberByFestivalAndUser(festival.id, session.userId)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Students</h2>
        <p className="text-muted-foreground">
          Manage students for{" "}
          <span className="font-semibold text-foreground">{festival.name}</span>
        </p>
      </div>

      <StudentsClient festivalId={festival.id} />
    </div>
  );
}
