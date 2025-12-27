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

  if (!data) return { title: "News Not Found" };

  const { festival } = data;
  const title = `News - ${festival.name}`;

  return {
    title: title,
    description: `Latest news and updates from ${festival.name}.`,
    openGraph: {
      title: title,
      description: `Latest news and updates from ${festival.name}.`,
    },
  };
}

export default async function NewsPage({
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
      <h1 className="text-3xl font-bold mb-4">News & Updates</h1>
      <p className="text-muted-foreground">
        Latest announcements for {festival.name}.
      </p>
    </div>
  );
}
