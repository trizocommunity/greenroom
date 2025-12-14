"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Festival, useFestivals } from "@/hooks/useFestivals";
import { FestivalCard } from "./FestivalCard";
import { FestivalEmptyState } from "./FestivalEmptyState";
import { CreateFestivalModal } from "./CreateFestivalModal";

export function FestivalsTab() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data: festivals = [], isLoading, isError } = useFestivals();

  const handleView = (festival: Festival) => {
    // Future: Navigate to festival details page
    console.log("View festival:", festival.id);
  };

  const handleEdit = (festival: Festival) => {
    // Future: Open edit modal
    console.log("Edit festival:", festival.id);
  };

  // if (isLoading) {
  //   return (
  //     <div className="space-y-6">
  //       <div className="flex items-center justify-between">
  //         <Skeleton className="h-8 w-48" />
  //         <Skeleton className="h-10 w-32" />
  //       </div>
  //       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  //         {[1, 2, 3].map((i) => (
  //           <Skeleton key={i} className="h-52 rounded-lg" />
  //         ))}
  //       </div>
  //     </div>
  //   );
  // }

  // if (isError) {
  //   return (
  //     <div className="py-10 text-center text-red-500">
  //       Failed to load festivals. Please try again.
  //     </div>
  //   );
  // }

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
    </div>
  );
}
