"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { type Festival, useMyFestival } from "@/hooks/useFestivals";
import type { JoinedFestival } from "@/types/festival";
import { CreateFestivalModal } from "./CreateFestivalModal";
import { EditFestivalModal } from "./EditFestivalModal";
import { FestivalCard } from "./FestivalCard";
import { FestivalEmptyState } from "./FestivalEmptyState";
import { JoinedFestivalCard } from "./JoinedFestivalCard";

import { MOCK_JOINED_FESTIVALS } from "@/data/user-festivals.mock";
import { Sparkles } from "lucide-react";

export function FestivalsTab() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingFestival, setEditingFestival] = useState<Festival | null>(null);

  // Use useMyFestival hook
  const { data: festival, isLoading } = useMyFestival();
  // festival is Festival | null | undefined

  const router = useRouter();

  // MOCK DATA for Joined Festivals
  const joinedFestivals: JoinedFestival[] =
    MOCK_JOINED_FESTIVALS as unknown as JoinedFestival[];

  const handleCreateClick = () => {
    if (festival) {
      toast.error("You can only create one festival.");
      return;
    }
    setIsCreateOpen(true);
  };

  const handleView = (festival: Festival) => {
    // Phase 1: View might be disabled or restricted
    if (!festival.slug) {
      toast.error("No public page available.");
      return;
    }
    const url = `${window.location.origin}?festival=${festival.slug}`;
    window.open(url, "_blank");
  };

  const handleManage = (festival: Festival) => {
    // Disabled in Phase 1 / Locked
    toast.info("Dashboard is locked.");
  };

  const handleEdit = (festival: Festival) => {
    setEditingFestival(festival);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-10">
        {/* Section 1: Your Festival */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4">
              <Skeleton className="h-52 rounded-lg" />
            </div>
          ) : !festival ? (
            <div className="py-16 rounded-lg border border-dashed bg-muted/20">
              <FestivalEmptyState />
              <div className="flex justify-center">
                <Button size="lg" onClick={handleCreateClick}>
                  Create Your Festival
                  <Sparkles className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              <FestivalCard
                festival={festival}
                onView={handleView}
                onManage={handleManage}
                onEdit={handleEdit}
              />
            </div>
          )}
        </div>

        {/* Section 2: Joined Festivals */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold uppercase tracking-widest border-b border-white/10 pb-2 text-foreground">
            Joined Festivals
          </h3>
          {joinedFestivals.length === 0 ? (
            <div className="text-center py-10 rounded-lg border border-dashed bg-muted/20">
              <p className="text-muted-foreground">
                You haven't joined any festivals yet
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {joinedFestivals.map((festival) => (
                <JoinedFestivalCard key={festival.id} festival={festival} />
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateFestivalModal open={isCreateOpen} onOpenChange={setIsCreateOpen} />

      {/* Edit Festival Modal - Might need updates if fields changed, but keeping connected for now */}
      <EditFestivalModal
        festival={editingFestival}
        open={!!editingFestival}
        onOpenChange={(open) => !open && setEditingFestival(null)}
      />
    </div>
  );
}
