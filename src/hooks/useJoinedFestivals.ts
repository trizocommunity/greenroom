"use client";

import { useQuery } from "@tanstack/react-query";
import { getJoinedFestivals } from "@/server/actions/team.actions";

export function useJoinedFestivals(userId: string) {
  return useQuery({
    queryKey: ["joined-festivals", userId],
    queryFn: async () => {
      return getJoinedFestivals(userId);
    },
  });
}
