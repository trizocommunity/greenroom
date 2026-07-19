import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateScheduleEntryInput,
  ScheduleEntry,
  UpdateScheduleEntryInput,
} from "@/api/contracts/schedule";

const API_BASE = "/api/v1";

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!json.success) throw new Error(json.error.message);
  return json.data;
}

export function useSchedule(
  festivalId: string,
  typeFilter?: "PROGRAMME" | "SESSION",
) {
  return useQuery<ScheduleEntry[]>({
    queryKey: ["schedule", festivalId, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ festivalId });
      if (typeFilter) params.set("typeFilter", typeFilter);
      const res = await fetch(`${API_BASE}/schedule?${params}`);
      return handleResponse<ScheduleEntry[]>(res);
    },
    enabled: !!festivalId,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useCreateScheduleItem() {
  const qc = useQueryClient();
  return useMutation<
    ScheduleEntry,
    Error,
    { festivalId: string; data: CreateScheduleEntryInput },
    { prev: ScheduleEntry[] | undefined }
  >({
    mutationFn: async ({ festivalId, data }) => {
      const res = await fetch(
        `${API_BASE}/schedule?festivalId=${encodeURIComponent(festivalId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        },
      );
      return handleResponse<ScheduleEntry>(res);
    },
    onMutate: async ({ festivalId, data }) => {
      await qc.cancelQueries({ queryKey: ["schedule", festivalId] });
      const prev = qc.getQueryData<ScheduleEntry[]>(["schedule", festivalId]);
      const tempId = `temp-${Date.now()}`;
      const optimisticEntry: ScheduleEntry = {
        id: tempId,
        festivalId,
        type: data.type,
        programmeId: data.programmeId ?? null,
        stageId: data.stageId ?? null,
        title: data.title ?? null,
        description: data.description ?? null,
        speakers: data.speakers ?? null,
        sessionType: data.sessionType ?? null,
        startTime: data.startTime,
        endTime: data.endTime ?? null,
        order: data.order ?? 0,
        scheduleDayKey: data.scheduleDayKey ?? null,
        createdBy: null,
        updatedBy: null,
        updatedAt: new Date().toISOString(),
      };
      qc.setQueryData<ScheduleEntry[]>(["schedule", festivalId], (old) =>
        old ? [...old, optimisticEntry] : [optimisticEntry],
      );
      return { prev };
    },
    onError: (_err, { festivalId }, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(["schedule", festivalId], ctx.prev);
      }
    },
    onSettled: (_data, _err, { festivalId }) => {
      qc.invalidateQueries({
        queryKey: ["schedule", festivalId],
        refetchType: "none",
      });
    },
  });
}

export function useUpdateScheduleItem() {
  const qc = useQueryClient();
  return useMutation<
    ScheduleEntry,
    Error,
    { festivalId: string; entryId: string; data: UpdateScheduleEntryInput },
    { prev: ScheduleEntry[] | undefined }
  >({
    mutationFn: async ({ festivalId, entryId, data }) => {
      const res = await fetch(
        `${API_BASE}/schedule/${entryId}?festivalId=${encodeURIComponent(festivalId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        },
      );
      return handleResponse<ScheduleEntry>(res);
    },
    onMutate: async ({ festivalId, entryId, data }) => {
      await qc.cancelQueries({ queryKey: ["schedule", festivalId] });
      const prev = qc.getQueryData<ScheduleEntry[]>(["schedule", festivalId]);
      qc.setQueryData<ScheduleEntry[]>(["schedule", festivalId], (old) =>
        old?.map((e) =>
          e.id === entryId
            ? {
                ...e,
                ...data,
                updatedAt: new Date().toISOString(),
              }
            : e,
        ),
      );
      return { prev };
    },
    onError: (_err, { festivalId }, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(["schedule", festivalId], ctx.prev);
      }
    },
    onSettled: (_data, _err, { festivalId }) => {
      qc.invalidateQueries({
        queryKey: ["schedule", festivalId],
        refetchType: "none",
      });
    },
  });
}

export function useDeleteScheduleItem() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { festivalId: string; entryId: string },
    { prev: ScheduleEntry[] | undefined }
  >({
    mutationFn: async ({ festivalId, entryId }) => {
      const res = await fetch(
        `${API_BASE}/schedule/${entryId}?festivalId=${encodeURIComponent(festivalId)}`,
        { method: "DELETE" },
      );
      return handleResponse<void>(res);
    },
    onMutate: async ({ festivalId, entryId }) => {
      await qc.cancelQueries({ queryKey: ["schedule", festivalId] });
      const prev = qc.getQueryData<ScheduleEntry[]>(["schedule", festivalId]);
      qc.setQueryData(
        ["schedule", festivalId],
        (old: ScheduleEntry[] | undefined) =>
          old?.filter((e) => e.id !== entryId),
      );
      return { prev };
    },
    onError: (_err, { festivalId }, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(["schedule", festivalId], ctx.prev);
      }
    },
    onSettled: (_data, _err, { festivalId }) => {
      qc.invalidateQueries({
        queryKey: ["schedule", festivalId],
        refetchType: "none",
      });
    },
  });
}
