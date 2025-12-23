import { notFound } from "next/navigation";
import { getPublicFestivalData } from "@/server/loader/festivalPublic";

export default async function SessionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ edition?: string }>;
}) {
  const { slug } = await params;
  const { edition: editionParam } = await searchParams;

  const data = await getPublicFestivalData(slug, editionParam);

  if (!data) return notFound();
  const { festival, edition } = data;

  if (!edition) {
    return (
      <div className="py-24 text-center">
        <h1 className="text-3xl font-bold mb-4">Sessions</h1>
        <p className="text-muted-foreground">
          Sessions will be announced soon for {festival.name}.
        </p>
      </div>
    );
  }

  return (
    <div className="py-24 text-center">
      <h1 className="text-3xl font-bold mb-4">Sessions</h1>
      <p className="text-muted-foreground">
        Schedule and program details for{" "}
        {edition.name || `${edition.number}th Edition`} of {festival.name}.
      </p>
      {/* TODO: Fetch and display sessions specifically for edition.id */}
    </div>
  );
}
