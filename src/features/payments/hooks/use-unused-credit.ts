"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/core/http/query-keys";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { checkUnusedCredit } from "@/features/billing/actions/billing.actions";

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
