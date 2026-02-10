import { findFestivalBySlug } from "@/server/models/festival.model";
import { getStages } from "@/server/actions/stage.actions";
import { notFound } from "next/navigation";
import { StagesClient } from "@/components/festival/event-works/stage-management/StagesClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function StageManagementPage({ params }: PageProps) {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);

  if (!festival) {
    notFound();
  }

  const stages = await getStages(festival.id);

  return (
    <div className="container">
      <StagesClient festivalId={festival.id} stages={stages} />
    </div>
  );
}
