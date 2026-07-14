import { revalidatePath } from "next/cache";
import { findFestivalById } from "@/features/festivals/repositories/festival.repository";

type RevalidationScope = "reporting" | "reporting-close" | "reporting-reopen";

const scopeToPaths: Record<RevalidationScope, (slug: string) => string[]> = {
  reporting: (slug) => [`/dashboard/${slug}/event-works/reporting`],
  "reporting-close": (slug) => [
    `/dashboard/${slug}/event-works/reporting`,
    `/${slug}`,
    `/${slug}/programmes`,
    `/${slug}/results`,
  ],
  "reporting-reopen": (slug) => [
    `/dashboard/${slug}/event-works/reporting`,
    `/dashboard/${slug}/event-works/results`,
    `/dashboard/${slug}/event-works/judgment`,
    `/dashboard/${slug}/event-works/leaderboard`,
    `/${slug}/results`,
    `/${slug}`,
  ],
};

export async function revalidateProgrammeReporting(
  festivalId: string,
  scope: RevalidationScope = "reporting",
) {
  const festival = await findFestivalById(festivalId);
  if (!festival) return;

  for (const path of scopeToPaths[scope](festival.slug)) {
    revalidatePath(path);
  }
  if (scope === "reporting-close" || scope === "reporting-reopen") {
    revalidatePath(`/${festival.slug}`, "layout");
  }
}
