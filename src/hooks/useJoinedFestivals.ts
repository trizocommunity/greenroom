"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getJoinedFestivals } from "@/server/actions/team.actions";

const STALE_TIME_MS = 2 * 60 * 1000;
const GC_TIME_MS = 5 * 60 * 1000;

export function useJoinedFestivals(userId: string) {
  return useQuery({
    queryKey: queryKeys.festivals.joined(userId),
    queryFn: () => getJoinedFestivals(userId),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    enabled: !!userId,
  });
}
