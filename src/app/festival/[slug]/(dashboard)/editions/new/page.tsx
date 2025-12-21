import { CreateEditionForm } from "@/components/festival/editions/CreateEditionForm";
import { findFestivalById } from "@/server/models/festival.model";
import { notFound } from "next/navigation";

export default async function NewEditionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: festivalId } = await params;
  const festival = await findFestivalById(festivalId);

  if (!festival) {
    notFound();
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Create New Edition
        </h2>
        <p className="text-muted-foreground">
          Launch a new edition for {festival.name}.
        </p>
      </div>

      <CreateEditionForm festivalId={festival.id} />
    </div>
  );
}
