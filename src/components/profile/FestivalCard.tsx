"use client";

import { Lock, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { type Festival } from "@/hooks/useFestivals";
import { format } from "date-fns";

interface FestivalCardProps {
  festival: Festival;
  onEdit?: (festival: Festival) => void;
  onView?: (festival: Festival) => void;
  onManage?: (festival: Festival) => void;
}

export function FestivalCard({ festival, onEdit, onView }: FestivalCardProps) {
  const isLocked = festival.isLocked;
  // DRAFT status is default
  const isDraft = festival.status === "DRAFT";

  return (
    <Card className="group relative overflow-hidden border-0 shadow-md transition-all duration-300">
      <div className="absolute inset-0 h-32 w-full bg-linear-to-b from-primary/10 to-background/50" />

      <CardContent className="relative pt-6 px-6 pb-6">
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-2">
            <div className="flex gap-2">
              {isDraft && (
                <Badge
                  variant="secondary"
                  className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                >
                  Draft
                </Badge>
              )}
              {isLocked && (
                <Badge
                  variant="outline"
                  className="border-red-200 text-red-500 bg-red-50 flex items-center gap-1"
                >
                  <Lock className="w-3 h-3" />
                  Locked
                </Badge>
              )}
            </div>
            <h3 className="font-bold text-2xl tracking-tight">
              {festival.name}
            </h3>
            <div className="text-sm text-muted-foreground">
              Created {format(new Date(festival.createdAt), "MMM d, yyyy")}
            </div>
            {festival.slug && (
              <div className="text-xs text-muted-foreground font-mono">
                /{festival.slug}
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onView?.(festival)}
            disabled={isLocked} // Optional: Disable view if locked? Or allow? User said "Festival dashboard must exist but be read-only".
            // "View Public Page" might be different from "Manage".
            // Let's keep View button but maybe disabled if no public page yet?
            // For now, simple Eye icon.
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>

        {isLocked && (
          <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-dashed border-muted-foreground/20 text-sm italic text-muted-foreground">
            "Your festival is created but locked. Create an edition to start
            execution."
          </div>
        )}
      </CardContent>
    </Card>
  );
}
