import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/core/http/query-keys";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { getBillingHistory } from "@/features/billing/actions/billing.actions";

const STALE_TIME_MS = 2 * 60 * 1000; // 2 minutes
const GC_TIME_MS = 5 * 60 * 1000; // 5 minutes

export function useBillingHistory() {
  const { data: user } = useCurrentUser();

  return useQuery({
    queryKey: queryKeys.payments.billingHistory(user?.id),
    queryFn: getBillingHistory,
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    enabled: !!user?.id,
  });
}
