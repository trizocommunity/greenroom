import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getMembersAction } from "@/server/actions/member.actions";

const STALE_TIME_MS = 2 * 60 * 1000;
const GC_TIME_MS = 5 * 60 * 1000;

export function useMembers(festivalId: string) {
  const query = useQuery({
    queryKey: queryKeys.members.list(festivalId),
    queryFn: () => getMembersAction(festivalId),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    enabled: !!festivalId,
  });

  return {
    members: query.data || [],
    isLoading: query.isLoading,
  };
}
