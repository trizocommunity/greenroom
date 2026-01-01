import { notFound } from "next/navigation";
import { ProgrammesClient } from "@/components/festival/pre-works/programmes/ProgrammesClient";
import { findFestivalBySlug } from "@/server/models/festival.model";

export default async function ProgrammesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival) return notFound();

  return <ProgrammesClient festivalId={festival.id} />;
}
