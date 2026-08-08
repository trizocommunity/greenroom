import { notFound } from "next/navigation";
import { JudgesClient } from "@/components/festival/pre-event-works/judges/JudgesClient";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";

export default async function JudgesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival) return notFound();

  return (
    <div className="pt-4 sm:pt-6">
      <JudgesClient festivalId={festival.id}>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          All Judges
        </h1>
      </JudgesClient>
    </div>
  );
}
