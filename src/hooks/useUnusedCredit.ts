"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { checkUnusedCredit } from "@/server/actions/billing.actions";
import { useCurrentUser } from "./useCurrentUser";

export function useUnusedCredit() {
  const { data: user } = useCurrentUser();

  return useQuery({
    queryKey: queryKeys.payments.unusedCredit(user?.id),
    queryFn: async () => {
      const credit = await checkUnusedCredit();
      return credit;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
