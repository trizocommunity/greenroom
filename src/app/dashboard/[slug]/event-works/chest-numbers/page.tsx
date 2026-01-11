import { getChestNumberSettings } from "@/server/actions/chest-number.actions";
import { getStudentsAction } from "@/server/actions/student.actions";
import { getCategoriesAction } from "@/server/actions/category.actions";
import { ChestNumberSetup } from "@/components/festival/event-works/chest-numbers/ChestNumberSetup";
import { ChestNumberTable } from "@/components/festival/event-works/chest-numbers/ChestNumberTable";
import { findFestivalBySlugOrId } from "@/server/models/festival.model";
import { revalidatePath } from "next/cache";

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

  // Sort students: Pending first, then by chest number/name
  const students = studentsRaw.sort((a, b) => {
    // If a is pending (null/empty) and b is not, a comes first (-1)
    if (!a.chestNumber && b.chestNumber) return -1;
    // If a is not pending and b is, b comes first (1)
    if (a.chestNumber && !b.chestNumber) return 1;
    // Otherwise keep original order (or sort by name/created)
    return 0;
  });

  // Calculate pending count (only for SINGLE categories or generally all that need generation?)
  // Logic in generation filters for SINGLE categories.
  // We should count students in SINGLE categories who don't have chest numbers.
  const pendingCount = students.filter(
    (s) => !s.chestNumber && s.category?.type === "SINGLE",
  ).length;

  // Filter logic:
  // If NO settings exist => Show Initial Setup (centered)
  // If settings EXIST => Show Compact Header + Table
  // However, we might need adjustments if we want to allow re-configuring categories.
  // For now stick to existing pattern: Settings exist -> Compact Mode.

  const isSetup = !settings;

  async function handleRevalidate() {
    "use server";
    revalidatePath(`/dashboard/${slug}/event-works/chest-numbers`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Chest Numbers</h2>
        <p className="text-muted-foreground">
          Manage and generate unique chest numbers based on categories.
        </p>
      </div>

      {isSetup ? (
        <div className="mt-12">
          <ChestNumberSetup
            festivalId={festivalId}
            categories={singleCategories}
            initialSettings={null}
            onGenerated={handleRevalidate}
            pendingCount={pendingCount}
          />
        </div>
      ) : (
        <div className="space-y-6">
          <ChestNumberSetup
            festivalId={festivalId}
            categories={singleCategories}
            initialSettings={settings}
            onGenerated={handleRevalidate}
            compact
            pendingCount={pendingCount}
          />

          <ChestNumberTable students={students} />
        </div>
      )}
    </div>
  );
}
