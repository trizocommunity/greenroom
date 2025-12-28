import { ProgrammesClient } from "@/components/festival/pre-works/programmes/ProgrammesClient";
import { findFestivalBySlug } from "@/server/models/festival.model";
import { notFound } from "next/navigation";

export default async function ProgrammesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival) return notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Programmes</h1>
          <p className="text-muted-foreground">
            Manage events and competitions.
          </p>
        </div>
      </div>
      <ProgrammesClient festivalId={festival.id} />
    </div>
  );
}
