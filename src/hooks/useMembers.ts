import { useQuery } from "@tanstack/react-query";
import { getMembersAction } from "@/server/actions/member.actions";

export function useMembers(festivalId: string) {
  const query = useQuery({
    queryKey: ["members", festivalId],
    queryFn: () => getMembersAction(festivalId),
  });

  return {
    members: query.data || [],
    isLoading: query.isLoading,
  };
}
