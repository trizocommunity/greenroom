"use client";

import { CalendarOff } from "lucide-react";
import { useJoinedFestivals } from "@/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { JoinedFestivalCard } from "../JoinedFestivalCard";

interface FestivalsTabProps {
  userId: string;
}

export function FestivalsTab({ userId: _userId }: FestivalsTabProps) {
  const { data: joinedFestivals, isLoading } = useJoinedFestivals();

  if (isLoading) {
    return (
      <div className="space-y-4 animate-in fade-in duration-500">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  if (!joinedFestivals || joinedFestivals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in duration-500 border rounded-lg bg-muted/10 border-dashed">
        <div className="bg-muted p-4 rounded-full mb-4">
          <CalendarOff className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">No Festivals Found</h3>
        <p className="text-muted-foreground max-w-sm mt-2">
          You haven't joined any festivals as a team member yet. Contact a
          festival admin to get added.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">My Festivals</h2>
        <p className="text-muted-foreground">
          Manage festivals you are a part of.
        </p>
      </div>
      <div className="grid gap-4">
        {joinedFestivals.map((festival: any) => (
          <JoinedFestivalCard key={festival.id} festival={festival} />
        ))}
      </div>
    </div>
  );
}
