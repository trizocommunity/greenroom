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
  return useMutation<
    Group,
    Error,
    { festivalId: string; data: CreateGroupInput },
    { prev: Group[] | undefined }
  >({
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
    onMutate: async ({ festivalId, data }) => {
      await qc.cancelQueries({ queryKey: ["groups", festivalId] });
      const prev = qc.getQueryData<Group[]>(["groups", festivalId]);
      const tempId = `temp-${Date.now()}`;
      const optimisticGroup: Group = {
        id: tempId,
        festivalId,
        name: data.name,
        seriesStart: data.seriesStart ?? null,
        color: data.color ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      qc.setQueryData<Group[]>(["groups", festivalId], (old) =>
        old ? [...old, optimisticGroup] : [optimisticGroup],
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
      qc.invalidateQueries({ queryKey: ["students", festivalId] });
    },
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation<
    Group,
    Error,
    { festivalId: string; groupId: string; data: UpdateGroupInput },
    { prev: Group[] | undefined }
  >({
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
    onMutate: async ({ festivalId, groupId, data }) => {
      await qc.cancelQueries({ queryKey: ["groups", festivalId] });
      const prev = qc.getQueryData<Group[]>(["groups", festivalId]);
      qc.setQueryData<Group[]>(["groups", festivalId], (old) =>
        old?.map((g) =>
          g.id === groupId
            ? {
                ...g,
                ...data,
                updatedAt: new Date().toISOString(),
              }
            : g,
        ),
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
      qc.invalidateQueries({ queryKey: ["students", festivalId] });
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
