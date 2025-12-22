import { notFound } from "next/navigation";
import { findFestivalBySlug } from "@/server/models/festival.model";

export default async function SessionsPage({
  params,
}: {
  params: Promise<{ slug: string; editionSlug: string }>;
}) {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);

  if (!festival) return notFound();

  return (
    <div className="py-24 text-center">
      <h1 className="text-3xl font-bold mb-4">Sessions</h1>
      <p className="text-muted-foreground">
        Schedule and program details for {festival.name}.
      </p>
    </div>
  );
}
