"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { AnnouncerBlockProgress } from "@/features/announcement/services/announcer-result-count.service";

export function AnnouncerBlockProgressBanner({
  block,
  festivalSlug,
  showStandingsLink = false,
}: {
  block: AnnouncerBlockProgress;
  festivalSlug: string;
  showStandingsLink?: boolean;
}) {
  const {
    announcedResultsSinceStandings,
    resultsPerBlock,
    resultsUntilStandings,
  } = block;

  return (
    <div className="rounded-lg border bg-muted/30 px-4 py-3 space-y-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">Results announced (current block):</span>
        <Badge variant="secondary">
          {announcedResultsSinceStandings} / {resultsPerBlock}
        </Badge>
        {block.standingsDue ? (
          <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-200">
            Group standings ready
          </Badge>
        ) : (
          <span className="text-muted-foreground">
            {resultsUntilStandings} more until group standings
          </span>
        )}
      </div>
      <p className="text-muted-foreground">
        Number of results is set to {resultsPerBlock} per block. After that many
        results are announced on-air, publish group standings to the public
        site.
        {block.publicDisplayMode === "team_standings"
          ? " Public is currently showing team standings only."
          : " Public is showing announced programme results."}
      </p>
      {showStandingsLink && block.canPublishStandings ? (
        <Link
          href={`/dashboard/${festivalSlug}/event-works/group-standings`}
          className="text-primary font-medium hover:underline"
        >
          Go to Group Standings →
        </Link>
      ) : null}
    </div>
  );
}
