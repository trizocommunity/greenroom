"use client";

import { CalendarOff } from "lucide-react";
import { useJoinedFestivals } from "@/api/client";
import { AppEmptyState, AppPageHeader } from "@/components/app/AppSection";
import { Skeleton } from "@/components/ui/skeleton";
import { JoinedFestivalCard } from "../JoinedFestivalCard";

interface FestivalsTabProps {
  userId: string;
}

export function FestivalsTab({ userId: _userId }: FestivalsTabProps) {
  const { data: joinedFestivals, isLoading } = useJoinedFestivals();

  return (
    <div className="animate-in fade-in space-y-8 duration-500">
      <AppPageHeader
        eyebrow="Membership"
        title="My festivals"
        description="Festivals you have been invited into as a team member."
      />

      {isLoading ? (
        <div className="space-y-px">
          <Skeleton className="h-16 w-full rounded-none" />
          <Skeleton className="h-16 w-full rounded-none" />
        </div>
      ) : !joinedFestivals || joinedFestivals.length === 0 ? (
        <AppEmptyState
          icon={CalendarOff}
          title="No festivals yet"
          description="You haven't joined any festivals as a team member. A festival owner needs to invite you."
        />
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {joinedFestivals.map((festival: any) => (
            <JoinedFestivalCard key={festival.id} festival={festival} />
          ))}
        </ul>
      )}
    </div>
  );
}
