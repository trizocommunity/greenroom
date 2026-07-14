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
  return useMutation<Stage, Error, { festivalId: string; data: StageDataInput }>({
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
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: ["stages", festivalId] });
    },
  });
}

export function useUpdateStage() {
  const qc = useQueryClient();
  return useMutation<Stage, Error, { festivalId: string; stageId: string; data: StageDataInput }>({
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
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: ["stages", festivalId] });
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
      qc.invalidateQueries({ queryKey: ["stages", festivalId] });
    },
  });
}
