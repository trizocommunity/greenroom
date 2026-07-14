import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Judge, JudgeInput } from "@/api/contracts/judges";

const API_BASE = "/api/v1";

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!json.success) throw new Error(json.error.message);
  return json.data;
}

export function useJudges(festivalId: string) {
  return useQuery<Judge[]>({
    queryKey: ["judges", festivalId],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/judges?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleResponse<Judge[]>(res);
    },
    enabled: !!festivalId,
    staleTime: 30 * 1000,
  });
}

export function useCreateJudge() {
  const qc = useQueryClient();
  return useMutation<Judge, Error, { festivalId: string; data: JudgeInput }>({
    mutationFn: async ({ festivalId, data }) => {
      const res = await fetch(
        `${API_BASE}/judges?festivalId=${encodeURIComponent(festivalId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        },
      );
      return handleResponse<Judge>(res);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: ["judges", festivalId] });
    },
  });
}

export function useUpdateJudge() {
  const qc = useQueryClient();
  return useMutation<Judge, Error, { festivalId: string; judgeId: string; data: JudgeInput }>({
    mutationFn: async ({ festivalId, judgeId, data }) => {
      const res = await fetch(
        `${API_BASE}/judges/${judgeId}?festivalId=${encodeURIComponent(festivalId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        },
      );
      return handleResponse<Judge>(res);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: ["judges", festivalId] });
    },
  });
}

export function useDeleteJudge() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { festivalId: string; judgeId: string },
    { prev: Judge[] | undefined }
  >({
    mutationFn: async ({ festivalId, judgeId }) => {
      const res = await fetch(
        `${API_BASE}/judges/${judgeId}?festivalId=${encodeURIComponent(festivalId)}`,
        { method: "DELETE" },
      );
      return handleResponse<void>(res);
    },
    onMutate: async ({ festivalId, judgeId }) => {
      await qc.cancelQueries({ queryKey: ["judges", festivalId] });
      const prev = qc.getQueryData<Judge[]>(["judges", festivalId]);
      qc.setQueryData(["judges", festivalId], (old: Judge[] | undefined) =>
        old?.filter((j) => j.id !== judgeId),
      );
      return { prev };
    },
    onError: (_err, { festivalId }, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(["judges", festivalId], ctx.prev);
      }
    },
    onSettled: (_data, _err, { festivalId }) => {
      qc.invalidateQueries({ queryKey: ["judges", festivalId] });
    },
  });
}
