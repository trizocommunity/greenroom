import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  PublishResultInput,
  Result,
  SaveResultInput,
} from "@/api/contracts/results";

const API_BASE = "/api/v1";

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!json.success) throw new Error(json.error.message);
  return json.data;
}

export function useResults(festivalId: string, programmeId?: string) {
  return useQuery<Result[]>({
    queryKey: ["results", festivalId, programmeId],
    queryFn: async () => {
      const params = new URLSearchParams({ festivalId });
      if (programmeId) params.set("programmeId", programmeId);
      const res = await fetch(`${API_BASE}/results?${params}`);
      return handleResponse<Result[]>(res);
    },
    enabled: !!festivalId,
    staleTime: 30 * 1000,
  });
}

export function useSaveResult() {
  const qc = useQueryClient();
  return useMutation<Result, Error, SaveResultInput>({
    mutationFn: async (data) => {
      const res = await fetch(`${API_BASE}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      return handleResponse<Result>(res);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["results", vars.festivalId] });
    },
  });
}

export function usePublishResults() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    PublishResultInput,
    { prev: Result[] | undefined }
  >({
    mutationFn: async (data) => {
      const res = await fetch(`${API_BASE}/results/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      return handleResponse<void>(res);
    },
    onMutate: async ({ festivalId, programmeId }) => {
      await qc.cancelQueries({ queryKey: ["results", festivalId, programmeId] });
      const prev = qc.getQueryData<Result[]>(["results", festivalId, programmeId]);
      qc.setQueryData(
        ["results", festivalId, programmeId],
        (old: Result[] | undefined) =>
          old?.map((r) =>
            r.programmeId === programmeId ? { ...r, isPublished: true } : r,
          ),
      );
      return { prev };
    },
    onError: (_err, { festivalId, programmeId }, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(["results", festivalId, programmeId], ctx.prev);
      }
    },
    onSettled: (_data, _err, { festivalId, programmeId }) => {
      qc.invalidateQueries({ queryKey: ["results", festivalId, programmeId] });
    },
  });
}

export function useUnpublishResults() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    PublishResultInput,
    { prev: Result[] | undefined }
  >({
    mutationFn: async (data) => {
      const res = await fetch(`${API_BASE}/results/unpublish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      return handleResponse<void>(res);
    },
    onMutate: async ({ festivalId, programmeId }) => {
      await qc.cancelQueries({ queryKey: ["results", festivalId, programmeId] });
      const prev = qc.getQueryData<Result[]>(["results", festivalId, programmeId]);
      qc.setQueryData(
        ["results", festivalId, programmeId],
        (old: Result[] | undefined) =>
          old?.map((r) =>
            r.programmeId === programmeId ? { ...r, isPublished: false } : r,
          ),
      );
      return { prev };
    },
    onError: (_err, { festivalId, programmeId }, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(["results", festivalId, programmeId], ctx.prev);
      }
    },
    onSettled: (_data, _err, { festivalId, programmeId }) => {
      qc.invalidateQueries({ queryKey: ["results", festivalId, programmeId] });
    },
  });
}
