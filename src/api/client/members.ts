import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AddMemberInput, Member } from "@/api/contracts/members";

const API_BASE = "/api/v1";

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!json.success) throw new Error(json.error.message);
  return json.data;
}

export function useMembers(festivalId: string) {
  return useQuery<Member[]>({
    queryKey: ["members", festivalId],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/members?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleResponse<Member[]>(res);
    },
    enabled: !!festivalId,
    staleTime: 30 * 1000,
  });
}

export function useAddMember() {
  const qc = useQueryClient();
  return useMutation<Member, Error, { festivalId: string; data: AddMemberInput }>({
    mutationFn: async ({ festivalId, data }) => {
      const res = await fetch(
        `${API_BASE}/members?festivalId=${encodeURIComponent(festivalId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        },
      );
      return handleResponse<Member>(res);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: ["members", festivalId] });
    },
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation<void, Error, { festivalId: string; memberId: string }>({
    mutationFn: async ({ festivalId, memberId }) => {
      const res = await fetch(
        `${API_BASE}/members?festivalId=${encodeURIComponent(festivalId)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId }),
        },
      );
      return handleResponse<void>(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
    },
  });
}
