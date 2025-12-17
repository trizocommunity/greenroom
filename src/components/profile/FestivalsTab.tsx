"use client";

import type { GlobalRole } from "@prisma/client";
import { Lock, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type Festival, useFestivals } from "@/hooks/useFestivals";
import { usePaymentStatus } from "@/hooks/usePaymentStatus";
import type { JoinedFestival } from "@/types/festival";
import { CreateFestivalModal } from "./CreateFestivalModal";
import { EditFestivalModal } from "./EditFestivalModal";
import { FestivalCard } from "./FestivalCard";
import { FestivalEmptyState } from "./FestivalEmptyState";
import { JoinedFestivalCard } from "./JoinedFestivalCard";

interface FestivalsTabProps {
  user: {
    globalRole: GlobalRole;
  };
}

import { MOCK_JOINED_FESTIVALS } from "@/data/user-festivals.mock";

export function FestivalsTab({ user }: FestivalsTabProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingFestival, setEditingFestival] = useState<Festival | null>(null);
  const { data: festivals = [], isLoading, isError } = useFestivals();
  const { data: paymentStatus, isLoading: isPaymentLoading } =
    usePaymentStatus();

  const router = useRouter();

  const hasCreatedFestival = festivals.length > 0;
  const isSuperAdmin = user.globalRole === "SUPER_ADMIN";
  // User can create if they are Super Admin OR they haven't created one yet (AND payment is OK)
  const canCreate = isSuperAdmin || !hasCreatedFestival;
  const canCreateFestival =
    canCreate && (paymentStatus?.canCreateFestival ?? false);

  // MOCK DATA for Joined Festivals (Since backend doesn't support it yet)
  const joinedFestivals: JoinedFestival[] =
    MOCK_JOINED_FESTIVALS as unknown as JoinedFestival[];

  const handleCreateClick = () => {
    if (hasCreatedFestival && !isSuperAdmin) {
      // This case should be handled by disabled button state, but redundant check
      return;
    }

    if (!paymentStatus?.canCreateFestival) {
      toast.error("Complete payment to create a festival", {
        description: "Go to the Billing tab to complete your payment.",
        action: {
          label: "Go to Billing",
          onClick: () => router.push("/profile?tab=billing"),
        },
      });
      return;
    }
    setIsCreateOpen(true);
  };

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
      {canCreateFestival && (
        <div className="flex flex-col items-start gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block">
                  <Button
                    onClick={handleCreateClick}
                    disabled={isPaymentLoading}
                    variant={canCreateFestival ? "default" : "secondary"}
                    className={
                      !canCreateFestival ? "cursor-not-allowed opacity-70" : ""
                    }
                  >
                    {canCreateFestival ? (
                      <Plus className="mr-2 h-4 w-4" />
                    ) : (
                      <Lock className="mr-2 h-4 w-4" />
                    )}
                    Create Festival
                  </Button>
                </span>
              </TooltipTrigger>
              {!canCreateFestival && !isPaymentLoading && (
                <TooltipContent side="bottom" className="max-w-xs">
                  {hasCreatedFestival && !isSuperAdmin ? (
                    <p>You can manage only one festival at a time</p>
                  ) : (
                    <p>Complete payment to unlock festival creation</p>
                  )}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          <p className="text-sm text-muted-foreground">
            Create and manage festivals you organize or host
          </p>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-10">
        {/* Section 1: Your Festival */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium border-b pb-2">Your Festival</h3>
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4">
              <Skeleton className="h-52 rounded-lg" />
            </div>
          ) : festivals.length === 0 ? (
            <FestivalEmptyState />
          ) : (
            <div className="grid grid-cols-1 gap-6">
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
        </div>

        {/* Section 2: Joined Festivals */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium border-b pb-2">
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

      {/* Create Modal */}
      <CreateFestivalModal open={isCreateOpen} onOpenChange={setIsCreateOpen} />

      {/* Edit Modal */}
      <EditFestivalModal
        festival={editingFestival}
        open={!!editingFestival}
        onOpenChange={(open) => !open && setEditingFestival(null)}
      />
    </div>
  );
}
