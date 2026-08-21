"use client";

import { useCallback, useState } from "react";
import {
  useCreateScheduleItem,
  useDeleteScheduleItem,
  useUpdateScheduleItem,
} from "@/api/client/schedule";
import {
  cancelCallListNotification,
  clearScheduleEntries,
  notifyCallList,
} from "@/features/schedule/actions/schedule.actions";
import { toast } from "@/lib/toast";
import type {
  AddEntryInput,
  ClearFilters,
  EditEntryInput,
  EnrichedScheduleEntry,
} from "../types";

export type ScheduleActionResult = { ok: true } | { ok: false; error: string };

export type ClearActionResult =
  | { ok: true; count: number }
  | { ok: false; error: string };

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Something went wrong";
}

function buildCreatePayload(data: AddEntryInput) {
  return {
    type: data.type,
    programmeId: data.type === "PROGRAMME" ? data.programmeId || null : null,
    title: data.type === "SESSION" ? data.title || null : null,
    description: data.type === "SESSION" ? data.description || null : null,
    speakers: data.type === "SESSION" ? data.speakers || null : null,
    sessionType:
      data.type === "SESSION" ? (data.sessionType as never) || null : null,
    stageId: data.stageId || null,
    startTime: data.startTime.toISOString(),
    endTime: data.endTime ? data.endTime.toISOString() : null,
    scheduleDayKey: data.scheduleDayKey,
  };
}

function buildUpdatePayload(data: EditEntryInput) {
  return {
    title: data.title ?? undefined,
    description: data.description ?? undefined,
    speakers: data.speakers ?? undefined,
    sessionType: data.sessionType as never,
    stageId: data.stageId ?? undefined,
    startTime: data.startTime ? data.startTime.toISOString() : undefined,
    endTime: data.endTime ? data.endTime.toISOString() : null,
    scheduleDayKey: data.scheduleDayKey,
  };
}

export function useScheduleActions(
  festivalId: string,
  refresh: () => Promise<void>,
) {
  const createScheduleItem = useCreateScheduleItem();
  const updateScheduleItem = useUpdateScheduleItem();
  const deleteScheduleItem = useDeleteScheduleItem();

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const createEntry = useCallback(
    async (input: AddEntryInput): Promise<ScheduleActionResult> => {
      setSaving(true);
      try {
        await createScheduleItem.mutateAsync({
          festivalId,
          data: buildCreatePayload(input),
        });
        toast.success("Added to schedule.");
        await refresh();
        return { ok: true };
      } catch (error) {
        const message = readErrorMessage(error);
        toast.error(message);
        return { ok: false, error: message };
      } finally {
        setSaving(false);
      }
    },
    [createScheduleItem, festivalId, refresh],
  );

  const updateEntry = useCallback(
    async (
      id: string,
      input: EditEntryInput,
    ): Promise<ScheduleActionResult> => {
      setSaving(true);
      try {
        await updateScheduleItem.mutateAsync({
          festivalId,
          entryId: id,
          data: buildUpdatePayload(input),
        });
        toast.success("Schedule updated.");
        await refresh();
        return { ok: true };
      } catch (error) {
        const message = readErrorMessage(error);
        toast.error(message);
        return { ok: false, error: message };
      } finally {
        setSaving(false);
      }
    },
    [updateScheduleItem, festivalId, refresh],
  );

  const deleteEntry = useCallback(
    async (id: string): Promise<ScheduleActionResult> => {
      setDeletingId(id);
      try {
        await deleteScheduleItem.mutateAsync({ festivalId, entryId: id });
        toast.success("Removed from schedule.");
        await refresh();
        return { ok: true };
      } catch (error) {
        const message = readErrorMessage(error);
        toast.error(message);
        return { ok: false, error: message };
      } finally {
        setDeletingId(null);
      }
    },
    [deleteScheduleItem, festivalId, refresh],
  );

  const notifyEntry = useCallback(
    async (entry: EnrichedScheduleEntry): Promise<void> => {
      try {
        const res = await notifyCallList(festivalId, entry.id);
        if (res.success) {
          toast.success("Call list notified!");
          await refresh();
        }
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Failed to notify call list",
        );
      }
    },
    [festivalId, refresh],
  );

  const cancelNotifyEntry = useCallback(
    async (entry: EnrichedScheduleEntry): Promise<void> => {
      try {
        const res = await cancelCallListNotification(festivalId, entry.id);
        if (res.success) {
          toast.success("Call list notification cancelled");
          await refresh();
        }
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Failed to cancel notification",
        );
      }
    },
    [festivalId, refresh],
  );

  const clearEntries = useCallback(
    async (filters?: ClearFilters): Promise<ClearActionResult> => {
      try {
        const result = await clearScheduleEntries(
          festivalId,
          filters && Object.keys(filters).length > 0 ? filters : undefined,
        );
        if (result.success) {
          toast.success(
            `Cleared ${result.count} schedule ${result.count === 1 ? "entry" : "entries"}.`,
          );
          await refresh();
          return { ok: true, count: result.count };
        }
        const message = result.error || "Failed to clear schedule.";
        toast.error(message);
        return { ok: false, error: message };
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Failed to clear schedule.";
        toast.error(message);
        return { ok: false, error: message };
      }
    },
    [festivalId, refresh],
  );

  return {
    createEntry,
    updateEntry,
    deleteEntry,
    notifyEntry,
    cancelNotifyEntry,
    clearEntries,
    saving,
    deletingId,
  };
}
