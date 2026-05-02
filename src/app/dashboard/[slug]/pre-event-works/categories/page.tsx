import { notFound } from "next/navigation";
import { CategoriesClient } from "@/components/festival/pre-event-works/categories/CategoriesClient";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";

export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival) return notFound();

  return (
    <div className="pt-4 sm:pt-6">
      <CategoriesClient festivalId={festival.id}>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Categories
        </h1>
      </CategoriesClient>
    </div>
  );
}
