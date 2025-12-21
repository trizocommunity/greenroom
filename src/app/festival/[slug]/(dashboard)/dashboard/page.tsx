import { findFestivalById } from "@/server/models/festival.model";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from "next/link";

export default async function FestivalDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: festivalId } = await params;
  const festival = await findFestivalById(festivalId);

  if (!festival) {
    notFound();
  }

  const editions = festival.editions || [];
  const activeEdition =
    editions.find((e) => e.status === "ACTIVE") || editions[0];

  if (editions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <h2 className="text-2xl font-bold">Welcome to {festival.name}</h2>
        <p className="text-muted-foreground max-w-md">
          You haven't created any editions yet. Start by creating your first
          edition to begin managing your festival.
        </p>
        <Button asChild>
          <Link href={`/festival/${festival.id}/editions/new`}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create First Edition
          </Link>
        </Button>
        <p className="text-xs text-muted-foreground mt-4">
          (Note: Edition creation flow implementation in progress)
        </p>
      </div>
    );
  }

  // Active Dashboard View
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Overview</h2>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/festival/${festival.id}/editions`}>
            View All Editions
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-lg border shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground">
            Total Participants
          </h3>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
        <div className="bg-card p-6 rounded-lg border shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground">
            Active Sessions
          </h3>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
        <div className="bg-card p-6 rounded-lg border shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground">Judges</h3>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
      </div>
    </div>
  );
}
