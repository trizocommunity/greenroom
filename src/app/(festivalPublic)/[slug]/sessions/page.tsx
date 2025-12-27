import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicFestivalData } from "@/server/loader/festivalPublic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicFestivalData(slug);

  if (!data) return { title: "Sessions Not Found" };

  const { festival } = data;
  const title = `Sessions - ${festival.name}`;

  return {
    title: title,
    description: `Program schedule for ${festival.name}.`,
    openGraph: {
      title: title,
      description: `Program schedule for ${festival.name}.`,
    },
  };
}

export default async function SessionsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const data = await getPublicFestivalData(slug);

  if (!data) return notFound();
  const { festival } = data;

  return (
    <div className="py-24 text-center">
      <h1 className="text-3xl font-bold mb-4">Sessions</h1>
      <p className="text-muted-foreground">
        Schedule and program details for {festival.name}.
      </p>
      {/* TODO: Fetch and display sessions */}
    </div>
  );
}
