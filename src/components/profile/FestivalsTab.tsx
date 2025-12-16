"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Festival, useFestivals } from "@/hooks/useFestivals";
import { FestivalCard } from "./FestivalCard";
import { FestivalEmptyState } from "./FestivalEmptyState";
import { EditFestivalModal } from "./EditFestivalModal";
import { CreateFestivalModal } from "./CreateFestivalModal";
import { useRouter } from "next/navigation";

export function FestivalsTab() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingFestival, setEditingFestival] = useState<Festival | null>(null);
  const { data: festivals = [], isLoading, isError } = useFestivals();

  const router = useRouter();

  const handleView = (festival: Festival) => {
    if (!festival.slug) {
      toast.error("This festival does not have a public page yet.");
      return;
    }

    // Determine URL based on environment (simplified for now)
    // In production this should be `${festival.slug}.greenrooom.com`
    // For local dev we use the query param fallback
    const url = `${window.location.origin}?festival=${festival.slug}`;
    window.open(url, "_blank");
  };

  const handleManage = (festival: Festival) => {
    if (!festival.slug) {
      toast.error("This festival does not have a dashboard yet.");
      return;
    }
    // Navigate to dashboard using client-side routing
    router.push(`/festival/${festival.slug}/dashboard`);
  };

  const handleEdit = (festival: Festival) => {
    setEditingFestival(festival);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Festivals</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage festivals you organize or host
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Festival
        </Button>
      </div>

      {/* Festival List or Empty State */}
      {isLoading ? (<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-52 rounded-lg" />
          ))}
        </div>
        ) : festivals.length === 0 ? (
        <FestivalEmptyState onCreateClick={() => setIsCreateOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {festivals.map((festival) => (
            <FestivalCard
              key={festival.id}
              festival={festival}
              onView={handleView}
              onManage={handleManage}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateFestivalModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />

      {/* Edit Modal */}
      <EditFestivalModal
        festival={editingFestival}
        open={!!editingFestival}
        onOpenChange={(open) => !open && setEditingFestival(null)}
      />
    </div>
  );
}
