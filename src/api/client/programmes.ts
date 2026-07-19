import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateProgrammeInput,
  Programme,
  UpdateProgrammeInput,
} from "@/api/contracts/programmes";

const API_BASE = "/api/v1";

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!json.success) throw new Error(json.error.message);
  return json.data;
}

export function useProgrammes(festivalId: string, categoryId?: string) {
  return useQuery<Programme[]>({
    queryKey: ["programmes", festivalId, categoryId],
    queryFn: async () => {
      const params = new URLSearchParams({ festivalId });
      if (categoryId) params.set("categoryId", categoryId);
      const res = await fetch(`${API_BASE}/programmes?${params}`);
      return handleResponse<Programme[]>(res);
    },
    enabled: !!festivalId,
    staleTime: 30 * 1000,
  });
}

export function useProgramme(festivalId: string, programmeId: string) {
  return useQuery<Programme>({
    queryKey: ["programmes", festivalId, programmeId],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/programmes/${programmeId}?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleResponse<Programme>(res);
    },
    enabled: !!festivalId && !!programmeId,
    staleTime: 30 * 1000,
  });
}

export function useCreateProgramme() {
  const qc = useQueryClient();
  return useMutation<
    Programme,
    Error,
    { festivalId: string; data: CreateProgrammeInput },
    { prev: Programme[] | undefined }
  >({
    mutationFn: async ({ festivalId, data }) => {
      const res = await fetch(
        `${API_BASE}/programmes?festivalId=${encodeURIComponent(festivalId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        },
      );
      return handleResponse<Programme>(res);
    },
    onMutate: async ({ festivalId, data }) => {
      await qc.cancelQueries({ queryKey: ["programmes", festivalId] });
      const prev = qc.getQueryData<Programme[]>(["programmes", festivalId]);
      const tempId = `temp-${Date.now()}`;
      const optimisticProgramme: Programme = {
        id: tempId,
        festivalId,
        name: data.name,
        categoryId: data.categoryId,
        type: data.type,
        stageType: data.stageType,
        maxParticipantsPerGroup: data.maxParticipantsPerGroup ?? 1,
        maxTeamsPerGroup: data.maxTeamsPerGroup ?? 1,
        maxStudentsPerTeam: data.maxStudentsPerTeam ?? 1,
        maxPoints: data.maxPoints ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      qc.setQueryData<Programme[]>(["programmes", festivalId], (old) =>
        old ? [...old, optimisticProgramme] : [optimisticProgramme],
      );
      return { prev };
    },
    onError: (_err, { festivalId }, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(["programmes", festivalId], ctx.prev);
      }
    },
    onSettled: (_data, _err, { festivalId }) => {
      qc.invalidateQueries({
        queryKey: ["programmes", festivalId],
        refetchType: "none",
      });
      qc.invalidateQueries({ queryKey: ["schedule", festivalId] });
    },
  });
}

export function useUpdateProgramme() {
  const qc = useQueryClient();
  return useMutation<
    Programme,
    Error,
    { festivalId: string; programmeId: string; data: UpdateProgrammeInput },
    { prev: Programme[] | undefined }
  >({
    mutationFn: async ({ festivalId, programmeId, data }) => {
      const res = await fetch(
        `${API_BASE}/programmes/${programmeId}?festivalId=${encodeURIComponent(festivalId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        },
      );
      return handleResponse<Programme>(res);
    },
    onMutate: async ({ festivalId, programmeId, data }) => {
      await qc.cancelQueries({ queryKey: ["programmes", festivalId] });
      const prev = qc.getQueryData<Programme[]>(["programmes", festivalId]);
      qc.setQueryData<Programme[]>(["programmes", festivalId], (old) =>
        old?.map((p) =>
          p.id === programmeId
            ? {
                ...p,
                ...data,
                updatedAt: new Date().toISOString(),
              }
            : p,
        ),
      );
      return { prev };
    },
    onError: (_err, { festivalId }, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(["programmes", festivalId], ctx.prev);
      }
    },
    onSettled: (_data, _err, { festivalId }) => {
      qc.invalidateQueries({
        queryKey: ["programmes", festivalId],
        refetchType: "none",
      });
      qc.invalidateQueries({ queryKey: ["schedule", festivalId] });
    },
  });
}

export function useDeleteProgramme() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { festivalId: string; programmeId: string },
    { prev: Programme[] | undefined }
  >({
    mutationFn: async ({ festivalId, programmeId }) => {
      const res = await fetch(
        `${API_BASE}/programmes/${programmeId}?festivalId=${encodeURIComponent(festivalId)}`,
        { method: "DELETE" },
      );
      return handleResponse<void>(res);
    },
    onMutate: async ({ festivalId, programmeId }) => {
      await qc.cancelQueries({ queryKey: ["programmes", festivalId] });
      const prev = qc.getQueryData<Programme[]>(["programmes", festivalId]);
      qc.setQueryData(
        ["programmes", festivalId],
        (old: Programme[] | undefined) =>
          old?.filter((p) => p.id !== programmeId),
      );
      return { prev };
    },
    onError: (_err, { festivalId }, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(["programmes", festivalId], ctx.prev);
      }
    },
    onSettled: (_data, _err, { festivalId }) => {
      qc.invalidateQueries({
        queryKey: ["programmes", festivalId],
        refetchType: "none",
      });
      qc.invalidateQueries({ queryKey: ["schedule", festivalId] });
    },
  });
}
