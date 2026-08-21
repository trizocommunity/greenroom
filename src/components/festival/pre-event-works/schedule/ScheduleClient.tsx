"use client";

import { format } from "date-fns";
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronsUpDown,
  Loader2,
  Plus,
  Search,
  Settings2,
  TableProperties,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useCreateScheduleItem,
  useDeleteScheduleItem,
  useUpdateScheduleItem,
} from "@/api/client/schedule";

import { ScheduleReportingDrawer } from "@/components/festival/pre-event-works/schedule/ScheduleReportingDrawer";
import { ScheduleSwapDrawer } from "@/components/festival/pre-event-works/schedule/ScheduleSwapDrawer";
import { ScheduleTableView } from "@/components/festival/pre-event-works/schedule/ScheduleTableView";
import { ClearScheduleDialog } from "@/components/festival/pre-event-works/schedule/ClearScheduleDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimePicker } from "@/components/ui/time-picker";
import { parseInstant } from "@/core/datetime";
import { cn } from "@/core/utils/cn";
import { useFestivalReadOnly } from "@/features/festivals/hooks/use-festival-read-only";
import {
  type ConflictParts,
  cancelCallListNotification,
  checkScheduleConflict,
  type EnrichedScheduleEntry,
  getScheduleEntriesEnriched,
  notifyCallList,
  type SchedulableProgramme,
} from "@/features/schedule/actions/schedule.actions";
import {
  calculateProgrammeDuration,
  getEndTimeFromDuration,
} from "@/features/schedule/utils/programme-duration";
import {
  localWallClockToDate,
  parseStoredScheduleInstant,
} from "@/features/schedule/utils/schedule-datetime";
import { useLiveChannel } from "@/hooks/use-live-channel";
import { toast } from "@/lib/toast";

const SESSION_TYPE_LABELS: Record<string, string> = {
  GENERAL: "General",
  CEREMONY: "Ceremony",
  TALK: "Talk",
  CONCERT: "Concert",
};

type StageOption = { id: string; name: string; description?: string | null };

interface ScheduleClientProps {
  festivalId: string;
  initialEntries: EnrichedScheduleEntry[];
  programmes: SchedulableProgramme[];
  stages: StageOption[];
  festivalStartDate: string | null;
  festivalEndDate: string | null;
  initialStageId?: string | null;
  hideStageFilter?: boolean;
  isStageManager?: boolean;
}

function getEntryLabel(entry: EnrichedScheduleEntry): string {
  if (entry.type === "PROGRAMME" && entry.programme)
    return entry.programme.name;
  if (entry.type === "SESSION") return entry.title || "—";
  return "—";
}

function getDateKey(d: Date): string {
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "yyyy-MM-dd");
}

function safeFormat(d: Date, pattern: string, fallback: string = "—"): string {
  if (Number.isNaN(d.getTime())) return fallback;
  return format(d, pattern);
}

export function ScheduleClient({
  festivalId,
  initialEntries,
  programmes,
  stages,
  festivalStartDate,
  festivalEndDate,
  initialStageId,
  hideStageFilter,
  isStageManager = false,
}: ScheduleClientProps) {
  const router = useRouter();
  const { isReadOnly } = useFestivalReadOnly();
  const [entries, setEntries] =
    useState<EnrichedScheduleEntry[]>(initialEntries);
  const [addOpen, setAddOpen] = useState(false);
  const [addFormError, setAddFormError] = useState<string | null>(null);
  const [addFormConflictParts, setAddFormConflictParts] =
    useState<ConflictParts | null>(null);
  const [editEntry, setEditEntry] = useState<EnrichedScheduleEntry | null>(
    null,
  );
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [swapEntry, setSwapEntry] = useState<EnrichedScheduleEntry | null>(
    null,
  );
  const [clearScheduleOpen, setClearScheduleOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [reportingEntry, setReportingEntry] =
    useState<EnrichedScheduleEntry | null>(null);

  /* UC15 — schedule-channel delta. Another admin adding/moving a slot
     pushes here; we re-pull the enriched entries (re-runs the conflict
     check on the server with the latest data) and re-render the table +
     calendar. Hook has its own backoff; auto-reconnect is built in.
     `liveStatus` is consumed by the polling fallback below so we don't
     double-refresh while SSE is healthy. */
  const { data: scheduleEvent, status: liveStatus } = useLiveChannel<{
    festivalId: string;
    entryId: string;
    action: "CREATED" | "UPDATED" | "DELETED";
    at: string;
  }>({
    url: `/api/v1/festivals/${festivalId}/schedule/stream`,
  });

  useEffect(() => {
    if (!scheduleEvent) return;
    router.refresh();
  }, [scheduleEvent, router]);

  /* Polling fallback. No pre-Issue-48 poll loop existed for this page —
     Issue 48 sub-slice B added SSE-only. The brief's rollback clause
     ("every consumer must keep its existing poll loop as fallback")
     still requires a polling path, so we add one at the 30s cadence
     the brief specifies. Suppressed while SSE is open so a healthy
     connection doesn't double-refresh. If SSE drops + reconnects
     inside the 30s window both fire — harmless, the refresh re-reads
     the same loader. */
  useEffect(() => {
    if (liveStatus === "open") return;
    const id = window.setInterval(() => {
      router.refresh();
    }, 30_000);
    return () => window.clearInterval(id);
  }, [router, liveStatus]);

  const hasStages = stages.length > 0;
  const hasProgrammes = programmes.length > 0;
  const hasFestivalDates = !!festivalStartDate && !!festivalEndDate;
  const canAdd = hasStages && hasProgrammes && hasFestivalDates && !isReadOnly;

  const createScheduleItem = useCreateScheduleItem();
  const updateScheduleItem = useUpdateScheduleItem();
  const deleteScheduleItem = useDeleteScheduleItem();

  const refresh = useCallback(async () => {
    const data = await getScheduleEntriesEnriched(festivalId);
    setEntries(data);
  }, [festivalId]);

  // Conflict count
  const conflictCount = useMemo(() => {
    let count = 0;
    const checked = new Set<string>();
    for (const entry of entries) {
      if (!entry.stageId || !entry.endTime) continue;
      const startA = new Date(entry.startTime).getTime();
      const endA = new Date(entry.endTime).getTime();
      for (const other of entries) {
        if (other.id === entry.id || other.stageId !== entry.stageId) continue;
        if (!other.endTime) continue;
        const pairKey = [entry.id, other.id].sort().join(":");
        if (checked.has(pairKey)) continue;
        const startB = new Date(other.startTime).getTime();
        const endB = new Date(other.endTime).getTime();
        if (startA < endB && startB < endA) {
          count++;
          checked.add(pairKey);
        }
      }
    }
    return count;
  }, [entries]);

  const handleCreate = async (data: {
    type: "PROGRAMME" | "SESSION";
    programmeId?: string;
    title?: string;
    description?: string;
    speakers?: string;
    sessionType?: string;
    stageId?: string;
    startTime: Date;
    endTime?: Date;
    scheduleDayKey: string;
  }) => {
    setAddFormError(null);
    setSaving(true);
    try {
      if (isReadOnly) return;
      await createScheduleItem.mutateAsync({
        festivalId,
        data: {
          type: data.type,
          programmeId:
            data.type === "PROGRAMME" ? data.programmeId || null : null,
          title: data.type === "SESSION" ? data.title || null : null,
          description:
            data.type === "SESSION" ? data.description || null : null,
          speakers: data.type === "SESSION" ? data.speakers || null : null,
          sessionType:
            data.type === "SESSION" ? (data.sessionType as any) || null : null,
          stageId: data.stageId || null,
          startTime: data.startTime.toISOString(),
          endTime: data.endTime ? data.endTime.toISOString() : null,
          scheduleDayKey: data.scheduleDayKey,
        },
      });
      toast.success("Added to schedule.");
      setAddOpen(false);
      refresh();
    } catch (error: any) {
      setAddFormError(error?.message);
      toast.error(error?.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (
    id: string,
    data: {
      title?: string | null;
      description?: string | null;
      speakers?: string | null;
      sessionType?: string | null;
      stageId?: string | null;
      startTime?: Date;
      endTime?: Date | null;
      scheduleDayKey: string;
    },
  ) => {
    setSaving(true);
    try {
      if (isReadOnly) return;
      await updateScheduleItem.mutateAsync({
        festivalId,
        entryId: id,
        data: {
          title: data.title ?? undefined,
          description: data.description ?? undefined,
          speakers: data.speakers ?? undefined,
          sessionType: data.sessionType as any,
          stageId: data.stageId ?? undefined,
          startTime: data.startTime ? data.startTime.toISOString() : undefined,
          endTime: data.endTime ? data.endTime.toISOString() : null,
          scheduleDayKey: data.scheduleDayKey,
        },
      });
      toast.success("Schedule updated.");
      setEditEntry(null);
      refresh();
    } catch (error: any) {
      toast.error(error?.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      if (isReadOnly) return;
      await deleteScheduleItem.mutateAsync({ festivalId, entryId: id });
      toast.success("Removed from schedule.");
      setEntries((prev) => prev.filter((e) => e.id !== id));
      refresh();
    } catch (error: any) {
      toast.error(error?.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearSchedule = async (filters: {
    dayKey: string | null;
    stageId: string | null;
    startTime: string | null;
    endTime: string | null;
  }) => {
    setIsClearing(true);
    try {
      if (isReadOnly) return;
      const toDelete = entries.filter((e) => {
        if (filters.dayKey) {
          const d = parseStoredScheduleInstant(e.startTime);
          if (Number.isNaN(d.getTime()) || format(d, "yyyy-MM-dd") !== filters.dayKey) return false;
        }
        if (filters.stageId && e.stage?.id !== filters.stageId) return false;
        if (filters.startTime) {
          const d = parseStoredScheduleInstant(e.startTime);
          if (Number.isNaN(d.getTime())) return false;
          const startStr = format(d, "HH:mm");
          if (startStr < filters.startTime) return false;
        }
        if (filters.endTime && e.endTime) {
          const d = parseStoredScheduleInstant(e.endTime);
          if (Number.isNaN(d.getTime())) return false;
          const endStr = format(d, "HH:mm");
          if (endStr > filters.endTime) return false;
        }
        return true;
      });

      if (toDelete.length === 0) {
        toast.info("No entries matched the selected filters.");
        setClearScheduleOpen(false);
        return;
      }

      await Promise.all(
        toDelete.map((e) => deleteScheduleItem.mutateAsync({ festivalId, entryId: e.id }))
      );

      toast.success(`Removed ${toDelete.length} entries from schedule.`);
      setEntries((prev) => prev.filter((e) => !toDelete.find((d) => d.id === e.id)));
      setClearScheduleOpen(false);
      refresh();
    } catch (error: any) {
      toast.error(error?.message || "Failed to clear schedule entries.");
    } finally {
      setIsClearing(false);
    }
  };

  const handleNotify = async (entry: EnrichedScheduleEntry) => {
    try {
      const res = await notifyCallList(festivalId, entry.id);
      if (res.success) {
        toast.success("Call list notified!");
        refresh();
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to notify call list",
      );
    }
  };

  const handleCancelNotify = async (entry: EnrichedScheduleEntry) => {
    try {
      const res = await cancelCallListNotification(festivalId, entry.id);
      if (res.success) {
        toast.success("Call list notification cancelled");
        refresh();
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to cancel notification",
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-row items-center justify-between gap-3">
          <h2 className="text-2xl font-bold tracking-tight">Schedule</h2>

          <div className="flex items-center gap-2 flex-wrap">
            {conflictCount > 0 && (
              <Badge variant="destructive" className="gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                {conflictCount} Conflict{conflictCount !== 1 ? "s" : ""}
              </Badge>
            )}
            {!isReadOnly && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setClearScheduleOpen(true)}
                  disabled={!canAdd || entries.length === 0}
                  className="gap-1.5"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Clear Schedule</span>
                </Button>
                <Button
                size="sm"
                onClick={() => {
                  if (!hasStages) {
                    toast.error("Create at least one stage first.");
                    return;
                  }
                  if (!hasProgrammes) {
                    toast.error("Create programmes first.");
                    return;
                  }
                  if (!hasFestivalDates) {
                    toast.error("Set festival dates first.");
                    return;
                  }
                  setAddOpen(true);
                }}
                disabled={!canAdd}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Add Schedule
              </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Empty state */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-card">
          <Calendar className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="font-medium">
            {isReadOnly
              ? "No schedule entries."
              : !hasStages
                ? "No stages yet"
                : !hasProgrammes
                  ? "No programmes yet"
                  : !hasFestivalDates
                    ? "Set festival event dates"
                    : "No schedule entries yet"}
          </p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            {!isReadOnly &&
              hasStages &&
              hasProgrammes &&
              hasFestivalDates &&
              "Click 'Add Schedule' to start building your competition schedule."}
          </p>
        </div>
      ) : (
        <ScheduleTableView
          festivalId={festivalId}
          entries={entries}
          stages={stages}
          hideStageFilter={hideStageFilter}
          initialStageId={initialStageId}
          onEdit={(entry) => {
            if (isReadOnly) return;
            setEditEntry(entry);
          }}
          onSwap={(entry) => setSwapEntry(entry)}
          onNotify={handleNotify}
          onCancelNotify={handleCancelNotify}
          onStartReporting={(entry) => {
            if (entry.programmeId) {
              setReportingEntry(entry);
            }
          }}
          isReadOnly={isReadOnly}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
        />
      )}

      {/* Add Entry Drawer */}
      <AddEntryDialog
        festivalId={festivalId}
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) {
            setAddFormError(null);
            setAddFormConflictParts(null);
          }
        }}
        onSubmit={handleCreate}
        saving={saving}
        formError={addFormError}
        formConflictParts={addFormConflictParts}
        programmes={programmes}
        stages={stages}
        festivalEndDate={festivalEndDate}
      />

      {/* Delete Dialog */}
      {!isReadOnly && (
        <DeleteDialog
          title="Remove from schedule"
          description="This entry will be removed. You can add it again later."
          open={!!deleteEntryId}
          onOpenChange={(open) => !open && setDeleteEntryId(null)}
          onDelete={async () => {
            if (deleteEntryId) {
              await handleDelete(deleteEntryId);
              setDeleteEntryId(null);
            }
          }}
          isDeleting={!!deletingId}
        />
      )}

      {/* Edit Entry Drawer */}
      {!isReadOnly && editEntry && (
        <EditEntryDialog
          festivalId={festivalId}
          entry={editEntry}
          open={!!editEntry}
          onOpenChange={(open) => !open && setEditEntry(null)}
          onSubmit={(data) => handleUpdate(editEntry.id, data)}
          onDelete={() => {
            setEditEntry(null);
            setDeleteEntryId(editEntry.id);
          }}
          saving={saving}
          stages={stages}
          festivalEndDate={festivalEndDate}
        />
      )}

      {/* Swap Drawer */}
      <ScheduleSwapDrawer
        festivalId={festivalId}
        entry={swapEntry}
        allEntries={entries}
        open={!!swapEntry}
        onOpenChange={(open) => !open && setSwapEntry(null)}
        onSwapped={refresh}
      />

      <ScheduleReportingDrawer
        festivalId={festivalId}
        open={!!reportingEntry}
        onOpenChange={(open) => {
          if (!open) setReportingEntry(null);
        }}
        entry={reportingEntry}
        onSuccess={() => {
          setReportingEntry(null);
        }}
      />

      <ClearScheduleDialog
        open={clearScheduleOpen}
        onOpenChange={setClearScheduleOpen}
        entries={entries}
        stages={stages}
        onClear={handleClearSchedule}
        isClearing={isClearing}
      />
    </div>
  );
}

// ─── Add Entry Dialog ────────────────────────────────────────────────────────

function AddEntryDialog({
  festivalId,
  open,
  onOpenChange,
  onSubmit,
  saving,
  formError,
  formConflictParts,
  programmes,
  stages,
  festivalEndDate,
}: {
  festivalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    type: "PROGRAMME" | "SESSION";
    programmeId?: string;
    title?: string;
    description?: string;
    speakers?: string;
    sessionType?: string;
    stageId?: string;
    startTime: Date;
    endTime?: Date;
    scheduleDayKey: string;
  }) => Promise<void>;
  saving: boolean;
  formError: string | null;
  formConflictParts?: ConflictParts | null;
  programmes: SchedulableProgramme[];
  stages: StageOption[];
  festivalEndDate: string | null;
}) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [entryType, setEntryType] = useState<"PROGRAMME" | "SESSION">(
    "PROGRAMME",
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [speakers, setSpeakers] = useState("");
  const [sessionType, setSessionType] = useState<string>("GENERAL");
  const [categoryId, setCategoryId] = useState<string>("");
  const [programmeId, setProgrammeId] = useState("");
  const [programmeOpen, setProgrammeOpen] = useState(false);
  const [stageId, setStageId] = useState("");
  const [dateStr, setDateStr] = useState(today);
  const [startTimeStr, setStartTimeStr] = useState("09:00");
  const [endTimeStr, setEndTimeStr] = useState("");
  const [autoEndTime, setAutoEndTime] = useState(true);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [conflictParts, setConflictParts] = useState<ConflictParts | null>(
    null,
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedProgramme = programmes.find((p) => p.id === programmeId);

  // Auto-calculate end time when programme or start time changes
  useEffect(() => {
    if (!autoEndTime || entryType !== "PROGRAMME" || !selectedProgramme) return;
    const dur = calculateProgrammeDuration({
      type: selectedProgramme.type,
      durationMode: selectedProgramme.durationMode,
      timePerUnitMinutes: selectedProgramme.timePerUnitMinutes,
      parallelDurationMinutes: selectedProgramme.parallelDurationMinutes,
      unitCount:
        selectedProgramme.type === "GROUP"
          ? selectedProgramme.teamCount
          : selectedProgramme.assignmentCount,
    });
    const startDate = localWallClockToDate(dateStr, startTimeStr);
    const endDate = getEndTimeFromDuration(startDate, dur.totalMinutes);
    if (!Number.isNaN(endDate.getTime())) {
      setEndTimeStr(format(endDate, "HH:mm"));
    }
  }, [autoEndTime, entryType, selectedProgramme, dateStr, startTimeStr]);

  // Conflict check
  useEffect(() => {
    if (!open) return;
    debounceRef.current = setTimeout(async () => {
      const startTime = localWallClockToDate(dateStr, startTimeStr);
      const endTime = endTimeStr
        ? localWallClockToDate(dateStr, endTimeStr)
        : null;
      const res = await checkScheduleConflict(festivalId, {
        startTime,
        endTime,
        stageId: stageId || null,
        scheduleDayKey: dateStr,
        entryType,
      });
      if (res.ok) {
        setConflictError(null);
        setConflictParts(null);
      } else {
        setConflictError(res.error);
        setConflictParts(res.conflictParts ?? null);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [festivalId, open, dateStr, startTimeStr, endTimeStr, stageId, entryType]);

  const categoryOptions = Array.from(
    new Map(
      programmes
        .filter((p) => p.categoryId && p.categoryName)
        .map((p) => [
          p.categoryId as string,
          { id: p.categoryId as string, name: p.categoryName as string },
        ]),
    ).values(),
  );

  const visibleProgrammes = categoryId
    ? programmes.filter((p) => p.categoryId === categoryId)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (entryType === "PROGRAMME") {
      if (!categoryId) {
        toast.error("Select a category first.");
        return;
      }
      if (!programmeId) {
        toast.error("Select a programme.");
        return;
      }
    } else {
      if (!title.trim()) {
        toast.error("Enter a session title.");
        return;
      }
    }

    if (!stageId) {
      toast.error("Select a stage.");
      return;
    }
    const startTime = localWallClockToDate(dateStr, startTimeStr);
    const endTime = endTimeStr
      ? localWallClockToDate(dateStr, endTimeStr)
      : undefined;

    await onSubmit({
      type: entryType,
      programmeId: entryType === "PROGRAMME" ? programmeId : undefined,
      title: entryType === "SESSION" ? title.trim() : undefined,
      description: entryType === "SESSION" ? description.trim() : undefined,
      speakers: entryType === "SESSION" ? speakers.trim() : undefined,
      sessionType: entryType === "SESSION" ? sessionType : undefined,
      stageId: stageId || undefined,
      startTime,
      endTime,
      scheduleDayKey: dateStr,
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="flex flex-col p-0 sm:p-0 gap-0">
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5">
          <DrawerHeader className="pb-3 px-0 pt-0">
            <DrawerTitle className="text-base">Add to schedule</DrawerTitle>
            <DrawerDescription className="text-xs">
              Add a programme or a custom session to the schedule.
            </DrawerDescription>
          </DrawerHeader>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="grid grid-cols-1 gap-1">
              <div className="space-y-1.5 mb-2">
                <Label className="text-xs">Entry Type</Label>
                <Select
                  value={entryType}
                  onValueChange={(val: "PROGRAMME" | "SESSION") =>
                    setEntryType(val)
                  }
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PROGRAMME">Programme</SelectItem>
                    <SelectItem value="SESSION">Session</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {entryType === "PROGRAMME" ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="add-category" className="text-xs">
                      Category{" "}
                      <span className="text-muted-foreground font-normal">
                        (filters programmes)
                      </span>
                    </Label>
                    <Select
                      value={categoryId}
                      onValueChange={(value) => {
                        setCategoryId(value);
                        setProgrammeId("");
                      }}
                    >
                      <SelectTrigger id="add-category" className="h-9 text-sm">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="add-programme" className="text-xs">
                      Programme
                    </Label>
                    <Popover
                      open={programmeOpen}
                      onOpenChange={setProgrammeOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          id="add-programme"
                          variant="outline"
                          role="combobox"
                          disabled={!categoryId}
                          aria-expanded={programmeOpen}
                          className={cn(
                            "h-9 w-full justify-between font-normal text-sm px-3",
                            !programmeId && "text-muted-foreground",
                          )}
                        >
                          <span className="truncate">
                            {programmeId
                              ? visibleProgrammes.find(
                                  (p) => p.id === programmeId,
                                )?.name || "Select programme"
                              : categoryId
                                ? "Select programme"
                                : "Select category first"}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[--radix-popover-trigger-width] p-0"
                        align="start"
                      >
                        <Command>
                          <CommandInput
                            placeholder="Search programme..."
                            className="h-9"
                          />
                          <CommandList>
                            <CommandEmpty>
                              {categoryId
                                ? "No matching programme."
                                : "Select category first."}
                            </CommandEmpty>
                            <CommandGroup>
                              {visibleProgrammes.map((p) => (
                                <CommandItem
                                  key={p.id}
                                  value={p.name}
                                  onSelect={() => {
                                    setProgrammeId(p.id);
                                    setProgrammeOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4 shrink-0",
                                      programmeId === p.id
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  <div className="truncate">
                                    <span>{p.name}</span>
                                    {p.nameSecondary && (
                                      <span className="text-xs text-muted-foreground ml-2">
                                        ({p.nameSecondary})
                                      </span>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Duration preview */}
                  {selectedProgramme && (
                    <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                      {(() => {
                        const dur = calculateProgrammeDuration({
                          type: selectedProgramme.type,
                          durationMode: selectedProgramme.durationMode,
                          timePerUnitMinutes:
                            selectedProgramme.timePerUnitMinutes,
                          parallelDurationMinutes:
                            selectedProgramme.parallelDurationMinutes,
                          unitCount:
                            selectedProgramme.type === "GROUP"
                              ? selectedProgramme.teamCount
                              : selectedProgramme.assignmentCount,
                        });
                        return (
                          <span>
                            Duration: <strong>{dur.label}</strong>
                          </span>
                        );
                      })()}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="add-session-title" className="text-xs">
                      Title
                    </Label>
                    <Input
                      id="add-session-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Opening ceremony"
                      className="h-9 text-sm"
                      required={entryType === "SESSION"}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="add-session-type" className="text-xs">
                      Session Type
                    </Label>
                    <Select value={sessionType} onValueChange={setSessionType}>
                      <SelectTrigger
                        id="add-session-type"
                        className="h-9 text-sm"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          ["GENERAL", "CEREMONY", "TALK", "CONCERT"] as const
                        ).map((t) => (
                          <SelectItem key={t} value={t}>
                            {SESSION_TYPE_LABELS[t] ?? t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="add-session-description"
                      className="text-xs"
                    >
                      Description{" "}
                      <span className="text-muted-foreground font-normal">
                        (opt)
                      </span>
                    </Label>
                    <textarea
                      id="add-session-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Optional details..."
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    />
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="add-stage" className="text-xs">
                  Stage
                </Label>
                <Select value={stageId} onValueChange={setStageId}>
                  <SelectTrigger id="add-stage" className="h-9 text-sm">
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="block font-medium">{s.name}</span>
                        {s.description && (
                          <span className="block text-xs text-muted-foreground font-normal line-clamp-1">
                            {s.description}
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 items-end">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="add-date" className="text-xs">
                  Date
                </Label>
                <Input
                  id="add-date"
                  type="date"
                  value={dateStr}
                  max={
                    festivalEndDate ? festivalEndDate.split("T")[0] : undefined
                  }
                  onChange={(e) => setDateStr(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="add-start" className="text-xs">
                  Start
                </Label>
                <TimePicker
                  id="add-start"
                  value={startTimeStr}
                  onChange={setStartTimeStr}
                  className="h-9 text-sm w-full"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-end" className="text-xs">
                  End{" "}
                  {entryType === "PROGRAMME" && autoEndTime && (
                    <span className="text-muted-foreground font-normal">
                      (auto)
                    </span>
                  )}
                </Label>
                <TimePicker
                  id="add-end"
                  value={endTimeStr}
                  onChange={(v) => {
                    setAutoEndTime(false);
                    setEndTimeStr(v);
                  }}
                  className="h-9 text-sm w-full"
                />
              </div>
            </div>

            {(formError || conflictError) && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive"
              >
                <span className="shrink-0 size-3.5 rounded-full bg-destructive/20 flex items-center justify-center text-[9px] font-bold">
                  !
                </span>
                <span>
                  {(formConflictParts ?? conflictParts)
                    ? (() => {
                        const p = formConflictParts ?? conflictParts!;
                        return (
                          <>
                            {p.prefix}
                            <strong className="font-semibold">
                              {p.highlight}
                            </strong>
                            {p.suffix}
                          </>
                        );
                      })()
                    : (formError ?? conflictError)}
                </span>
              </div>
            )}

            <DrawerFooter className="pt-3 pb-0 px-0 gap-2 flex-col-reverse sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                type="submit"
                className="w-full sm:w-auto"
                disabled={
                  saving ||
                  (entryType === "PROGRAMME" &&
                    (!categoryId || !programmeId)) ||
                  (entryType === "SESSION" && !title.trim()) ||
                  !stageId ||
                  !!conflictError
                }
              >
                {saving && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                Add
              </Button>
            </DrawerFooter>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// ─── Edit Entry Dialog ───────────────────────────────────────────────────────

function EditEntryDialog({
  festivalId,
  entry,
  open,
  onOpenChange,
  onSubmit,
  onDelete,
  saving,
  stages,
  festivalEndDate,
}: {
  festivalId: string;
  entry: EnrichedScheduleEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    title?: string | null;
    description?: string | null;
    sessionType?: string | null;
    stageId?: string | null;
    startTime?: Date;
    endTime?: Date | null;
    scheduleDayKey: string;
  }) => Promise<void>;
  onDelete: () => void;
  saving: boolean;
  stages: StageOption[];
  festivalEndDate: string | null;
}) {
  const entryDateStr = safeFormat(
    parseStoredScheduleInstant(entry.startTime),
    "yyyy-MM-dd",
  );
  const [stageId, setStageId] = useState(entry.stageId ?? "");
  const [dateStr, setDateStr] = useState(entryDateStr);
  const [startTimeStr, setStartTimeStr] = useState(
    safeFormat(parseStoredScheduleInstant(entry.startTime), "HH:mm"),
  );
  const [endTimeStr, setEndTimeStr] = useState(
    entry.endTime
      ? safeFormat(parseStoredScheduleInstant(entry.endTime), "HH:mm")
      : "",
  );
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [conflictParts, setConflictParts] = useState<ConflictParts | null>(
    null,
  );

  const isSession = entry.type === "SESSION";
  const [title, setTitle] = useState(entry.title ?? "");
  const [description, setDescription] = useState(entry.description ?? "");
  const [sessionType, setSessionType] = useState<string>(
    entry.sessionType ?? "GENERAL",
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    debounceRef.current = setTimeout(async () => {
      const startTime = localWallClockToDate(dateStr, startTimeStr);
      const endTime = endTimeStr
        ? localWallClockToDate(dateStr, endTimeStr)
        : null;
      const res = await checkScheduleConflict(festivalId, {
        startTime,
        endTime,
        stageId: stageId || null,
        excludeEntryId: entry.id,
        scheduleDayKey: dateStr,
        entryType: entry.type,
      });
      if (res.ok) {
        setConflictError(null);
        setConflictParts(null);
      } else {
        setConflictError(res.error);
        setConflictParts(res.conflictParts ?? null);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [
    festivalId,
    entry.id,
    open,
    dateStr,
    startTimeStr,
    endTimeStr,
    stageId,
    entry.type,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSession && !title.trim()) {
      toast.error("Enter a session title.");
      return;
    }
    if (!stageId) {
      toast.error("Select a stage.");
      return;
    }
    const startTime = localWallClockToDate(dateStr, startTimeStr);
    const endTime = endTimeStr
      ? localWallClockToDate(dateStr, endTimeStr)
      : null;
    await onSubmit({
      title: isSession ? title.trim() : undefined,
      description: isSession ? description.trim() : undefined,
      sessionType: isSession ? sessionType : undefined,
      stageId: stageId || null,
      startTime,
      endTime,
      scheduleDayKey: dateStr,
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="flex flex-col p-0 sm:p-0 gap-0">
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5">
          <DrawerHeader className="px-0 pt-0">
            <DrawerTitle>Edit schedule entry</DrawerTitle>
            <DrawerDescription>{getEntryLabel(entry)}</DrawerDescription>
          </DrawerHeader>
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isSession && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-session-title" className="text-xs">
                    Title
                  </Label>
                  <Input
                    id="edit-session-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Opening ceremony"
                    className="h-9 text-sm"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-session-type" className="text-xs">
                    Session Type
                  </Label>
                  <Select value={sessionType} onValueChange={setSessionType}>
                    <SelectTrigger
                      id="edit-session-type"
                      className="h-9 text-sm"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        ["GENERAL", "CEREMONY", "TALK", "CONCERT"] as const
                      ).map((t) => (
                        <SelectItem key={t} value={t}>
                          {SESSION_TYPE_LABELS[t] ?? t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-session-description" className="text-xs">
                    Description (opt)
                  </Label>
                  <textarea
                    id="edit-session-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional details..."
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Stage</Label>
              <Select value={stageId} onValueChange={setStageId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="block font-medium">{s.name}</span>
                      {s.description && (
                        <span className="block text-xs text-muted-foreground font-normal line-clamp-1">
                          {s.description}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2 items-end">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="edit-date" className="text-xs">
                  Date
                </Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={dateStr}
                  max={
                    festivalEndDate ? festivalEndDate.split("T")[0] : undefined
                  }
                  onChange={(e) => setDateStr(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5 col-span-1">
                <Label className="text-xs">Start time</Label>
                <TimePicker
                  value={startTimeStr}
                  onChange={setStartTimeStr}
                  className="h-9 text-sm w-full"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">End time (optional)</Label>
                <TimePicker
                  value={endTimeStr}
                  onChange={setEndTimeStr}
                  className="h-9 text-sm w-full"
                />
              </div>
            </div>
            {conflictError && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive"
              >
                <span className="shrink-0 size-3.5 rounded-full bg-destructive/20 flex items-center justify-center text-[9px] font-bold">
                  !
                </span>
                <span>
                  {conflictParts ? (
                    <>
                      {conflictParts.prefix}
                      <strong className="font-semibold">
                        {conflictParts.highlight}
                      </strong>
                      {conflictParts.suffix}
                    </>
                  ) : (
                    conflictError
                  )}
                </span>
              </div>
            )}
            <DrawerFooter className="px-0 pt-4 pb-0 gap-2 flex-col-reverse sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete
              </Button>
              <div className="flex gap-2 flex-col-reverse sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  disabled={
                    saving ||
                    (isSession && !title.trim()) ||
                    !stageId ||
                    !!conflictError
                  }
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update
                </Button>
              </div>
            </DrawerFooter>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
