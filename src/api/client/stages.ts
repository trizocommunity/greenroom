import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Stage, StageDataInput } from "@/api/contracts/stages";

const API_BASE = "/api/v1";

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!json.success) throw new Error(json.error.message);
  return json.data;
}

export function useStages(festivalId: string) {
  return useQuery<Stage[]>({
    queryKey: ["stages", festivalId],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/stages?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleResponse<Stage[]>(res);
    },
    enabled: !!festivalId,
    staleTime: 30 * 1000,
  });
}

export function useCreateStage() {
  const qc = useQueryClient();
  return useMutation<
    Stage,
    Error,
    { festivalId: string; data: StageDataInput },
    { prev: Stage[] | undefined }
  >({
    mutationFn: async ({ festivalId, data }) => {
      const res = await fetch(
        `${API_BASE}/stages?festivalId=${encodeURIComponent(festivalId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        },
      );
      return handleResponse<Stage>(res);
    },
    onMutate: async ({ festivalId, data }) => {
      await qc.cancelQueries({ queryKey: ["stages", festivalId] });
      const prev = qc.getQueryData<Stage[]>(["stages", festivalId]);
      const tempId = `temp-${Date.now()}`;
      const optimisticStage: Stage = {
        id: tempId,
        festivalId,
        name: data.name,
        description: data.description ?? null,
        createdBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      qc.setQueryData<Stage[]>(["stages", festivalId], (old) =>
        old ? [...old, optimisticStage] : [optimisticStage],
      );
      return { prev };
    },
    onError: (_err, { festivalId }, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(["stages", festivalId], ctx.prev);
      }
    },
    onSettled: (_data, _err, { festivalId }) => {
      qc.invalidateQueries({
        queryKey: ["stages", festivalId],
        refetchType: "none",
      });
    },
  });
}

export function useUpdateStage() {
  const qc = useQueryClient();
  return useMutation<
    Stage,
    Error,
    { festivalId: string; stageId: string; data: StageDataInput },
    { prev: Stage[] | undefined }
  >({
    mutationFn: async ({ festivalId, stageId, data }) => {
      const res = await fetch(
        `${API_BASE}/stages/${stageId}?festivalId=${encodeURIComponent(festivalId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        },
      );
      return handleResponse<Stage>(res);
    },
    onMutate: async ({ festivalId, stageId, data }) => {
      await qc.cancelQueries({ queryKey: ["stages", festivalId] });
      const prev = qc.getQueryData<Stage[]>(["stages", festivalId]);
      qc.setQueryData<Stage[]>(["stages", festivalId], (old) =>
        old?.map((s) =>
          s.id === stageId
            ? {
                ...s,
                ...data,
                updatedAt: new Date().toISOString(),
              }
            : s,
        ),
      );
      return { prev };
    },
    onError: (_err, { festivalId }, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(["stages", festivalId], ctx.prev);
      }
    },
    onSettled: (_data, _err, { festivalId }) => {
      qc.invalidateQueries({
        queryKey: ["stages", festivalId],
        refetchType: "none",
      });
    },
  });
}

export function useDeleteStage() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { festivalId: string; stageId: string },
    { prev: Stage[] | undefined }
  >({
    mutationFn: async ({ festivalId, stageId }) => {
      const res = await fetch(
        `${API_BASE}/stages/${stageId}?festivalId=${encodeURIComponent(festivalId)}`,
        { method: "DELETE" },
      );
      return handleResponse<void>(res);
    },
    onMutate: async ({ festivalId, stageId }) => {
      await qc.cancelQueries({ queryKey: ["stages", festivalId] });
      const prev = qc.getQueryData<Stage[]>(["stages", festivalId]);
      qc.setQueryData(["stages", festivalId], (old: Stage[] | undefined) =>
        old?.filter((s) => s.id !== stageId),
      );
      return { prev };
    },
    onError: (_err, { festivalId }, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(["stages", festivalId], ctx.prev);
      }
    },
    onSettled: (_data, _err, { festivalId }) => {
      qc.invalidateQueries({
        queryKey: ["stages", festivalId],
        refetchType: "none",
      });
    },
  });
}
