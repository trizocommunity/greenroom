import { notFound } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { findFestivalBySlugOrId } from "@/features/festivals/repositories/festival.repository";
import { getFestivalContext } from "@/features/festivals/services/festival-context.service";
import { listPosterTemplatesAction } from "@/features/posters/actions/poster-template.actions";
import { listAssignmentsAction } from "@/features/posters/actions/template-assignment.actions";
import { canManageTemplates } from "@/features/posters/auth/poster-access";
import { TemplatesPageClient } from "./TemplatesPageClient";

export default async function TemplatesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSession();
  const context = await getFestivalContext({
    slugOrId: slug,
    userId: session?.userId ?? null,
    globalRole: session?.role ?? null,
  });

  if (!context || !canManageTemplates(context.role)) {
    notFound();
  }

  const festival = await findFestivalBySlugOrId(slug);
  if (!festival) notFound();

  const [templatesRes, assignmentsRes] = await Promise.all([
    listPosterTemplatesAction(festival.id),
    listAssignmentsAction(festival.id),
  ]);

  return (
    <div className="pt-4 sm:pt-6 space-y-6">
      <TemplatesPageClient
        festivalId={festival.id}
        festivalSlug={festival.slug}
        initialTemplates={templatesRes.success ? templatesRes.data : []}
        initialAssignments={assignmentsRes.success ? assignmentsRes.data : []}
        readOnly={false}
      />
    </div>
  );
}
