import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateGroupInput,
  Group,
  UpdateGroupInput,
} from "@/api/contracts/groups";

const API_BASE = "/api/v1";

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!json.success) throw new Error(json.error.message);
  return json.data;
}

export function useGroups(festivalId: string) {
  return useQuery<Group[]>({
    queryKey: ["groups", festivalId],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/groups?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleResponse<Group[]>(res);
    },
    enabled: !!festivalId,
    staleTime: 30 * 1000,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation<Group, Error, { festivalId: string; data: CreateGroupInput }>({
    mutationFn: async ({ festivalId, data }) => {
      const res = await fetch(
        `${API_BASE}/groups?festivalId=${encodeURIComponent(festivalId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        },
      );
      return handleResponse<Group>(res);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: ["groups", festivalId] });
    },
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation<Group, Error, { festivalId: string; groupId: string; data: UpdateGroupInput }>({
    mutationFn: async ({ festivalId, groupId, data }) => {
      const res = await fetch(
        `${API_BASE}/groups/${groupId}?festivalId=${encodeURIComponent(festivalId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        },
      );
      return handleResponse<Group>(res);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: ["groups", festivalId] });
    },
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { festivalId: string; groupId: string },
    { prev: Group[] | undefined }
  >({
    mutationFn: async ({ festivalId, groupId }) => {
      const res = await fetch(
        `${API_BASE}/groups/${groupId}?festivalId=${encodeURIComponent(festivalId)}`,
        { method: "DELETE" },
      );
      return handleResponse<void>(res);
    },
    onMutate: async ({ festivalId, groupId }) => {
      await qc.cancelQueries({ queryKey: ["groups", festivalId] });
      const prev = qc.getQueryData<Group[]>(["groups", festivalId]);
      qc.setQueryData(["groups", festivalId], (old: Group[] | undefined) =>
        old?.filter((g) => g.id !== groupId),
      );
      return { prev };
    },
    onError: (_err, { festivalId }, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(["groups", festivalId], ctx.prev);
      }
    },
    onSettled: (_data, _err, { festivalId }) => {
      qc.invalidateQueries({ queryKey: ["groups", festivalId] });
    },
  });
}
