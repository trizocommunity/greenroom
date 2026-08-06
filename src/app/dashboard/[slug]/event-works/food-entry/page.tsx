import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { getFestivalContext } from "@/features/festivals/services/festival-context.service";
import { FoodEntryDashboard } from "@/features/food-entry/components/FoodEntryDashboard";
import { getFoodHallDashboardData } from "@/features/food-entry/services/food-entry.service";
import { getSessionEntries } from "@/features/food-entry/repositories/food-entry.repository";

export const metadata: Metadata = {
  title: "Food Hall Entry | Greenroom",
  description: "Manage food hall entries",
};

export default async function FoodEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSession();
  
  if (!session?.userId) {
    redirect("/login");
  }

  const context = await getFestivalContext({
    slugOrId: slug,
    userId: session.userId,
    globalRole: session.role,
  });

  if (!context) {
    notFound();
  }

  // Only Admin, Owner, Volunteer can access
  if (!["ADMIN", "OWNER", "VOLUNTEER"].includes(context.role)) {
    redirect(`/dashboard/${slug}`);
  }

  const data = await getFoodHallDashboardData(context.festival.id, context.festival.timezone || "UTC");

  let recentEntries: any[] = [];
  if (data.activeSessionId) {
    recentEntries = await getSessionEntries(data.activeSessionId);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <FoodEntryDashboard
        festivalId={context.festival.id}
        initialData={{...data, recentEntries}}
        role={context.role as any}
      />
    </div>
  );
}
