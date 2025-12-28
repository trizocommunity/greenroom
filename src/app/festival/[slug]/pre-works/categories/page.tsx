import { CategoriesClient } from "@/components/festival/pre-works/categories/CategoriesClient";
import { findFestivalBySlug } from "@/server/models/festival.model";
import { notFound } from "next/navigation";

export default async function CategoriesPage({
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
          <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">
            Define categories for your festival events (e.g. Juniors, Seniors).
          </p>
        </div>
      </div>
      <CategoriesClient festivalId={festival.id} />
    </div>
  );
}
