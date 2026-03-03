import { getChestNumberSettings } from "@/server/actions/chest-number.actions";
import { getStudentsAction } from "@/server/actions/student.actions";
import { getCategoriesAction } from "@/server/actions/category.actions";
import { ChestNumberSetup } from "@/components/festival/event-works/chest-numbers/ChestNumberSetup";
import { ChestNumberTable } from "@/components/festival/event-works/chest-numbers/ChestNumberTable";
import { ChestNumberHowItWorks } from "@/components/festival/event-works/chest-numbers/ChestNumberHowItWorks";
import { findFestivalBySlugOrId } from "@/server/models/festival.model";
import { revalidatePath } from "next/cache";
import { EmptyState } from "@/components/common/EmptyState";
import { UserPlus } from "lucide-react";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ChestNumbersPage({ params }: PageProps) {
  const { slug } = await params;

  // Ensure festival exists
  const festival = await findFestivalBySlugOrId(slug);
  if (!festival) {
    return <div>Festival not found</div>;
  }
  const festivalId = festival.id;

  const settings = await getChestNumberSettings(festivalId);
  const studentsRaw = await getStudentsAction(festivalId);
  const categories = await getCategoriesAction(festivalId);

  // Filter for SINGLE categories only
  const singleCategories = categories.filter((c) => c.type === "SINGLE");

  const students = studentsRaw.sort((a, b) => {
    if (!a.chestNumber && b.chestNumber) return -1;
    if (a.chestNumber && !b.chestNumber) return 1;
    // Secondary sort: newest first
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (students.length === 0) {
    return (
      <EmptyState
        title="No Students Found"
        description="You need to add students before generating chest numbers."
        actionLabel="Add Students"
        actionLink={`/dashboard/${slug}/pre-works/students`}
        icon={UserPlus} // Need to import UserPlus
      />
    );
  }

  const pendingCount = students.filter(
    (s) => !s.chestNumber && s.category?.type === "SINGLE",
  ).length;

  async function handleRevalidate() {
    "use server";
    revalidatePath(`/dashboard/${slug}/event-works/chest-numbers`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chest Numbers</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage and generate unique chest numbers based on categories.
          </p>
        </div>
        <ChestNumberHowItWorks />
      </div>

      <div className="space-y-4">
        <ChestNumberSetup
          festivalId={festivalId}
          categories={singleCategories}
          initialSettings={settings}
          onGenerated={handleRevalidate}
          pendingCount={pendingCount}
        />

        <ChestNumberTable students={students} />
      </div>
    </div>
  );
}
