"use client";

import { Lock, Eye, ExternalLink, LayoutDashboard, Pencil } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Festival } from "@/hooks/useFestivals";
import { format } from "date-fns";

interface FestivalCardProps {
  festival: Festival;
  onEdit?: (festival: Festival) => void;
}

export function FestivalCard({ festival, onEdit }: FestivalCardProps) {
  const isLocked = festival.isLocked;
  // DRAFT status is default
  const isDraft = festival.status === "DRAFT";

  // Find Active Edition or fallback to first one
  const activeEdition =
    festival.editions?.find((e) => e.status === "ACTIVE") ||
    festival.editions?.[0];

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
              {activeEdition && (
                <Badge className="bg-green-500 text-white hover:bg-green-600">
                  {activeEdition.status === "ACTIVE" ? "Active" : "Latest"}:{" "}
                  {activeEdition.slug}
                </Badge>
              )}
            </div>
            <h3 className="font-bold text-2xl tracking-tight">
              {festival.name}
            </h3>
            <div className="text-sm text-muted-foreground">
              Created {format(new Date(festival.createdAt), "MMM d, yyyy")}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit?.(festival)}
              title="Edit Details"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            {activeEdition && (
              <Button
                variant="ghost"
                size="icon"
                asChild
                title="View Public Page"
              >
                <Link href={`/${festival.slug}`} target="_blank">
                  <Eye className="w-4 h-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>

        {activeEdition ? (
          <div className="flex gap-3 mt-4">
            <Button asChild className="flex-1" variant="outline">
              <Link href={`/${festival.slug}`} target="_blank">
                <ExternalLink className="mr-2 h-4 w-4" />
                Public Site
              </Link>
            </Button>
            <Button asChild className="flex-1">
              <Link href={`/festival/${festival.slug}/${activeEdition.slug}`}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </Button>
          </div>
        ) : (
          <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-dashed border-muted-foreground/20 text-sm italic text-muted-foreground text-center">
            {isLocked
              ? "Festival is locked. Activate an edition to start."
              : "No active edition running."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
