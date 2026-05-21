"use client";

import {
  eachDayOfInterval,
  format,
  isSameDay,
  parseISO,
  startOfDay,
} from "date-fns";
import { motion } from "framer-motion";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { HowItWorksButton } from "@/components/dashboard/HowItWorksButton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/core/utils/cn";
import { parseStoredInstant } from "@/core/utils/date-time";
import { useFestivalReadOnly } from "@/features/festivals/hooks/use-festival-read-only";
import {
  type ConflictParts,
  checkScheduleConflict,
  createScheduleEntry,
  deleteScheduleEntry,
  getScheduleEntries,
  reorderScheduleEntries,
  type ScheduleEntryWithRelations,
  updateScheduleEntry,
} from "@/features/schedule/actions/schedule.actions";
import {
  localWallClockToDate,
  parseStoredScheduleInstant,
} from "@/features/schedule/utils/schedule-datetime";

type ProgrammeOption = {
  id: string;
  name: string;
  categoryId?: string | null;
  categoryName?: string | null;
};
type StageOption = { id: string; name: string; description?: string | null };

interface ScheduleClientProps {
  festivalId: string;
  initialEntries: ScheduleEntryWithRelations[];
  programmes: ProgrammeOption[];
  stages: StageOption[];
  /** ISO date strings; used to restrict date picker to festival range */
  festivalStartDate: string | null;
  festivalEndDate: string | null;
}

type DateOption = { value: string; label: string };

function getFestivalDateOptions(
  startISO: string | null,
  endISO: string | null,
): DateOption[] {
  if (!startISO || !endISO) return [];
  const start = startOfDay(parseStoredInstant(startISO));
  const end = startOfDay(parseStoredInstant(endISO));
  if (start > end) return [];
  const days = eachDayOfInterval({ start, end });
  return days.map((d) => ({
    value: format(d, "yyyy-MM-dd"),
    label: format(d, "EEE, d MMM yyyy"),
  }));
}

function getEntryLabel(entry: ScheduleEntryWithRelations): string {
  if (entry.type === "PROGRAMME" && entry.programme)
    return entry.programme.name;
  if (entry.type === "SESSION") return entry.title || "—";
  return "—";
}

function isProgrammeEntry(entry: ScheduleEntryWithRelations): boolean {
  return entry.type === "PROGRAMME";
}

function getDateKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function ScheduleClient({
  festivalId,
  initialEntries,
  programmes,
  stages,
  festivalStartDate,
  festivalEndDate,
}: ScheduleClientProps) {
  const { isReadOnly } = useFestivalReadOnly();
  const dateOptions = getFestivalDateOptions(
    festivalStartDate,
    festivalEndDate,
  );
  const [entries, setEntries] =
    useState<ScheduleEntryWithRelations[]>(initialEntries);
  const [addOpen, setAddOpen] = useState(false);
  const [addFormError, setAddFormError] = useState<string | null>(null);
  const [addFormConflictParts, setAddFormConflictParts] =
    useState<ConflictParts | null>(null);
  const [editEntry, setEditEntry] = useState<ScheduleEntryWithRelations | null>(
    null,
  );
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeDayKey, setActiveDayKey] = useState<string | null>(null);
  /** Stage filter for the active day: "" = All stages (default), or stage id */
  const [activeStageId, setActiveStageId] = useState<string>("");

  const hasStages = stages.length > 0;
  const hasProgrammes = programmes.length > 0;
  const hasFestivalDates = dateOptions.length > 0;
  const canAdd = hasStages && hasProgrammes && hasFestivalDates && !isReadOnly;

  const refresh = useCallback(async () => {
    const data = await getScheduleEntries(festivalId);
    setEntries(data);
  }, [festivalId]);

  const groupedByDay = entries.reduce<
    Record<string, ScheduleEntryWithRelations[]>
  >((acc, entry) => {
    const key = getDateKey(parseStoredScheduleInstant(entry.startTime));
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  const sortedDays = Object.keys(groupedByDay).sort();
  const effectiveActiveDay =
    activeDayKey && groupedByDay[activeDayKey]
      ? activeDayKey
      : (sortedDays[0] ?? null);

  const dayEntries = effectiveActiveDay
    ? (groupedByDay[effectiveActiveDay] ?? [])
    : [];
  const filteredDayEntries =
    activeStageId === ""
      ? dayEntries
      : dayEntries.filter((e) => e.stageId === activeStageId);

  const handleCreate = async (data: {
    programmeId?: string;
    stageId?: string;
    startTime: Date;
    endTime?: Date;
    scheduleDayKey: string;
  }) => {
    setAddFormError(null);
    setSaving(true);
    try {
      if (isReadOnly) return;
      const res = await createScheduleEntry(festivalId, {
        type: "PROGRAMME",
        programmeId: data.programmeId || null,
        stageId: data.stageId || null,
        startTime: data.startTime,
        endTime: data.endTime ?? null,
        scheduleDayKey: data.scheduleDayKey,
      });
      if (res.success) {
        toast.success("Added to schedule.");
        setAddOpen(false);
        refresh();
      } else {
        setAddFormError(res.error);
        setAddFormConflictParts(res.conflictParts ?? null);
        toast.error(res.error);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (
    id: string,
    data: {
      stageId?: string | null;
      startTime?: Date;
      endTime?: Date | null;
      scheduleDayKey: string;
    },
  ) => {
    setSaving(true);
    try {
      if (isReadOnly) return;
      const res = await updateScheduleEntry(festivalId, id, data);
      if (res.success) {
        toast.success("Schedule updated.");
        setEditEntry(null);
        refresh();
      } else toast.error(res.error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      if (isReadOnly) return;
      const res = await deleteScheduleEntry(festivalId, id);
      if (res.success) {
        toast.success("Removed from schedule.");
        setEntries((prev) => prev.filter((e) => e.id !== id));
        refresh();
      } else toast.error(res.error);
    } finally {
      setDeletingId(null);
    }
  };

  const moveEntry = async (
    entry: ScheduleEntryWithRelations,
    direction: "up" | "down",
  ) => {
    if (isReadOnly) return;
    const dayKey = getDateKey(parseStoredScheduleInstant(entry.startTime));
    const list =
      activeStageId === ""
        ? (groupedByDay[dayKey] ?? [])
        : (groupedByDay[dayKey] ?? []).filter(
            (e) => e.stageId === activeStageId,
          );
    const idx = list.findIndex((e) => e.id === entry.id);
    if (idx < 0) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= list.length) return;
    const reordered = [...list];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    const res = await reorderScheduleEntries(
      festivalId,
      reordered.map((e) => e.id),
    );
    if (res.success) {
      refresh();
    } else toast.error(res.error);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Schedule</h2>
        <div className="flex items-center gap-2 shrink-0">
          <HowItWorksButton
            title="How the Schedule works"
            description="Build your festival programme by day, time, and stage."
          >
            <p className="text-sm text-muted-foreground">
              Add <strong>programme</strong> entries: pick a programme, date,
              time, and stage. Create stages first in Stage Management and
              programmes in Programmes.
            </p>
            <p className="text-sm text-muted-foreground">
              Use the day tabs to switch dates. You can reorder entries, edit
              times, or remove them. The same time can be used on different
              stages (e.g. Stage A and Stage B both at 11:00); a conflict only
              occurs when the same stage has two overlapping time ranges. Start
              and end times must stay within your festival event dates and on
              the same day.
            </p>
            <p className="text-sm text-muted-foreground">
              Sessions (e.g. opening ceremony) are managed separately under Pre
              Event Works → Sessions.
            </p>
          </HowItWorksButton>
          <Button
            size="sm"
            onClick={() => {
              if (isReadOnly) {
                toast.error("Festival is read-only.");
                return;
              }
              if (!hasStages) {
                toast.error(
                  "Please create at least one stage before adding to the schedule.",
                );
                return;
              }
              if (!hasProgrammes) {
                toast.error(
                  "Please create programmes first before scheduling.",
                );
                return;
              }
              if (!hasFestivalDates) {
                toast.error(
                  "Set your festival start and end dates in Festival setup before scheduling.",
                );
                return;
              }
              setAddOpen(true);
            }}
            className="gap-2"
            disabled={!canAdd}
          >
            <Plus className="h-4 w-4" />
            Add to schedule
          </Button>
        </div>
      </div>

      {!isReadOnly && hasStages && hasProgrammes && !hasFestivalDates && (
        <output className="block rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
          <p className="font-medium">Set festival event dates</p>
          <p className="text-muted-foreground mt-0.5">
            Add a start and end date in{" "}
            <span className="font-medium text-foreground">Festival setup</span>{" "}
            so every schedule slot can be validated against your event days.
          </p>
        </output>
      )}

      {sortedDays.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="font-medium">
              {isReadOnly
                ? "Festival is read-only in past/expired mode."
                : !hasStages
                  ? "No stages yet"
                  : !hasProgrammes
                    ? "No programmes yet"
                    : !hasFestivalDates
                      ? "Set festival event dates"
                      : "No schedule entries yet"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {isReadOnly &&
                "Create, edit, delete, and reorder are disabled in read-only mode."}
              {!isReadOnly &&
                !hasStages &&
                "Please create a stage first in Pre Event Works → Stage Management."}
              {!isReadOnly &&
                hasStages &&
                !hasProgrammes &&
                "Please create programmes first in Pre Event Works → Programmes."}
              {!isReadOnly &&
                hasStages &&
                hasProgrammes &&
                !hasFestivalDates &&
                "Add start and end dates for your festival in Festival setup, then return here to build the schedule."}
              {!isReadOnly &&
                hasStages &&
                hasProgrammes &&
                hasFestivalDates &&
                "Add programmes to build your schedule."}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                if (isReadOnly) {
                  toast.error("Festival is read-only.");
                  return;
                }
                if (!hasStages) {
                  toast.error(
                    "Please create at least one stage before adding to the schedule.",
                  );
                  return;
                }
                if (!hasProgrammes) {
                  toast.error(
                    "Please create programmes first before scheduling.",
                  );
                  return;
                }
                if (!hasFestivalDates) {
                  toast.error(
                    "Set your festival start and end dates in Festival setup before scheduling.",
                  );
                  return;
                }
                setAddOpen(true);
              }}
              disabled={!canAdd}
            >
              Add to schedule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Day tabs */}
          <div
            className="flex flex-wrap gap-2 border-b border-border pb-3"
            role="tablist"
          >
            {sortedDays.map((dayKey, index) => {
              const dayEntries = groupedByDay[dayKey];
              const isActive = effectiveActiveDay === dayKey;
              return (
                <button
                  key={dayKey}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveDayKey(dayKey)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  Day {index + 1}
                  <span className="ml-2 opacity-80">({dayEntries.length})</span>
                </button>
              );
            })}
          </div>

          {/* Active day content */}
          {effectiveActiveDay && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex text-lg gap-2 items-center justify-between">
                  {format(parseISO(effectiveActiveDay), "EEEE, MMM d, yyyy")}
                  {hasStages && (
                    <Select
                      value={activeStageId === "" ? "__all__" : activeStageId}
                      onValueChange={(v) =>
                        setActiveStageId(v === "__all__" ? "" : v)
                      }
                    >
                      <SelectTrigger className="w-[180px] h-8 text-sm">
                        <SelectValue placeholder="Stage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem className="font-normal" value="__all__">
                          All stages
                        </SelectItem>
                        {stages.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </CardTitle>
                <CardDescription className="mt-0!">
                  {filteredDayEntries.length} item
                  {filteredDayEntries.length !== 1 ? "s" : ""}
                  {activeStageId !== "" &&
                    dayEntries.length !== filteredDayEntries.length && (
                      <span className="text-muted-foreground">
                        {" "}
                        on this stage
                      </span>
                    )}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <motion.ul
                  className="space-y-2"
                  layout
                  transition={{ layout: { duration: 0.25 } }}
                >
                  {filteredDayEntries.map((entry) => (
                    <motion.li
                      key={entry.id}
                      layout
                      initial={false}
                      transition={{
                        layout: { type: "spring", stiffness: 350, damping: 30 },
                      }}
                      className="flex items-center gap-3 rounded-lg border bg-card p-3"
                    >
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => moveEntry(entry, "up")}
                          disabled={
                            isReadOnly ||
                            filteredDayEntries.indexOf(entry) === 0
                          }
                          aria-label="Move up"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => moveEntry(entry, "down")}
                          disabled={
                            isReadOnly ||
                            filteredDayEntries.indexOf(entry) ===
                              filteredDayEntries.length - 1
                          }
                          aria-label="Move down"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">
                            {getEntryLabel(entry)}
                          </p>
                          {entry.programme?.category?.name && (
                            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                              {entry.programme.category.name}
                            </span>
                          )}
                          {entry.type === "SESSION" && (
                            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                              Session
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(
                            parseStoredScheduleInstant(entry.startTime),
                            "h:mm a",
                          )}
                          {entry.endTime &&
                            ` – ${format(
                              parseStoredScheduleInstant(entry.endTime),
                              "h:mm a",
                            )}`}
                          {entry.stage?.name && ` · ${entry.stage.name}`}
                        </p>
                        {(entry.createdBy || entry.updatedBy) && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {entry.updatedBy
                                    ? `Updated by ${entry.updatedBy}`
                                    : entry.createdBy
                                      ? `Created by ${entry.createdBy}`
                                      : ""}
                                  {entry.updatedAt && (
                                    <>
                                      {" "}
                                      ·{" "}
                                      {format(
                                        parseStoredInstant(entry.updatedAt),
                                        "MMM d, h:mm a",
                                      )}
                                    </>
                                  )}
                                </p>
                              </TooltipTrigger>
                              <TooltipContent>
                                {entry.createdBy && (
                                  <p>Created by {entry.createdBy}</p>
                                )}
                                {entry.updatedBy && (
                                  <p>
                                    Updated by {entry.updatedBy} on{" "}
                                    {entry.updatedAt &&
                                      format(
                                        parseStoredInstant(entry.updatedAt),
                                        "MMM d, yyyy 'at' h:mm a",
                                      )}
                                  </p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      {isProgrammeEntry(entry) ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!isReadOnly && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => setEditEntry(entry)}
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleteEntryId(entry.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Read-only
                        </span>
                      )}
                    </motion.li>
                  ))}
                </motion.ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

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
        dateOptions={dateOptions}
      />

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

      {!isReadOnly && editEntry && (
        <EditEntryDialog
          festivalId={festivalId}
          entry={editEntry}
          open={!!editEntry}
          onOpenChange={(open) => !open && setEditEntry(null)}
          onSubmit={(data) => handleUpdate(editEntry.id, data)}
          saving={saving}
          stages={stages}
          dateOptions={dateOptions}
        />
      )}
    </div>
  );
}

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
  dateOptions,
}: {
  festivalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    programmeId?: string;
    stageId?: string;
    startTime: Date;
    endTime?: Date;
    scheduleDayKey: string;
  }) => Promise<void>;
  saving: boolean;
  formError: string | null;
  formConflictParts?: ConflictParts | null;
  programmes: ProgrammeOption[];
  stages: StageOption[];
  dateOptions: DateOption[];
}) {
  const today = format(new Date(), "yyyy-MM-dd");
  const defaultDate =
    dateOptions.length > 0
      ? dateOptions.some((o) => o.value === today)
        ? today
        : dateOptions[0]!.value
      : today;
  const [categoryId, setCategoryId] = useState<string>("");
  const [programmeId, setProgrammeId] = useState("");
  const [stageId, setStageId] = useState("");
  const [dateStr, setDateStr] = useState(defaultDate);
  const [startTimeStr, setStartTimeStr] = useState("09:00");
  const [endTimeStr, setEndTimeStr] = useState("");
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [conflictParts, setConflictParts] = useState<ConflictParts | null>(
    null,
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectiveDate =
    dateOptions.length > 0 && !dateOptions.some((o) => o.value === dateStr)
      ? dateOptions[0]!.value
      : dateStr;

  useEffect(() => {
    if (!open) return;
    debounceRef.current = setTimeout(async () => {
      const startTime = localWallClockToDate(effectiveDate, startTimeStr);
      const endTime = endTimeStr
        ? localWallClockToDate(effectiveDate, endTimeStr)
        : null;
      const res = await checkScheduleConflict(festivalId, {
        startTime,
        endTime,
        stageId: stageId || null,
        scheduleDayKey: effectiveDate,
        entryType: "PROGRAMME",
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
  }, [festivalId, open, effectiveDate, startTimeStr, endTimeStr, stageId]);

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
    if (!categoryId) {
      toast.error("Select a category first.");
      return;
    }
    if (!programmeId) {
      toast.error("Select a programme.");
      return;
    }
    if (!stageId) {
      toast.error("Select a stage.");
      return;
    }
    const effectiveDate =
      dateOptions.length > 0 && !dateOptions.some((o) => o.value === dateStr)
        ? dateOptions[0]!.value
        : dateStr;
    const startTime = localWallClockToDate(effectiveDate, startTimeStr);
    const endTime = endTimeStr
      ? localWallClockToDate(effectiveDate, endTimeStr)
      : undefined;
    await onSubmit({
      programmeId,
      stageId: stageId || undefined,
      startTime,
      endTime,
      scheduleDayKey: effectiveDate,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-4 sm:p-5 gap-0">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-base">
            Add programme to schedule
          </DialogTitle>
          <DialogDescription className="text-xs">
            Programme, stage, and time. Sessions are on the Sessions page.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-1 gap-1">
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
              <Select
                value={programmeId}
                onValueChange={setProgrammeId}
                required
                disabled={!categoryId}
              >
                <SelectTrigger id="add-programme" className="h-9 text-sm">
                  <SelectValue
                    placeholder={
                      categoryId ? "Select programme" : "Select category first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {visibleProgrammes.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      {categoryId
                        ? "No programmes in this category"
                        : "Select category first"}
                    </SelectItem>
                  ) : (
                    visibleProgrammes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
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
              {dateOptions.length > 0 ? (
                <Select
                  value={
                    dateOptions.some((o) => o.value === dateStr)
                      ? dateStr
                      : dateOptions[0]!.value
                  }
                  onValueChange={setDateStr}
                >
                  <SelectTrigger id="add-date" className="h-9 text-sm">
                    <SelectValue placeholder="Date" />
                  </SelectTrigger>
                  <SelectContent>
                    {dateOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="add-date"
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="h-9 text-sm"
                />
              )}
            </div>
            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="add-start" className="text-xs">
                Start
              </Label>
              <Input
                id="add-start"
                type="time"
                value={startTimeStr}
                onChange={(e) => setStartTimeStr(e.target.value)}
                className="h-9 text-sm w-full"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-end" className="text-xs">
                End{" "}
                <span className="text-muted-foreground font-normal">(opt)</span>
              </Label>
              <Input
                id="add-end"
                type="time"
                value={endTimeStr}
                onChange={(e) => setEndTimeStr(e.target.value)}
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

          <DialogFooter className="pt-3 pb-0 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              disabled={
                saving ||
                !categoryId ||
                !programmeId ||
                !stageId ||
                !!conflictError
              }
            >
              {saving && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditEntryDialog({
  festivalId,
  entry,
  open,
  onOpenChange,
  onSubmit,
  saving,
  stages,
  dateOptions,
}: {
  festivalId: string;
  entry: ScheduleEntryWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    stageId?: string | null;
    startTime?: Date;
    endTime?: Date | null;
    scheduleDayKey: string;
  }) => Promise<void>;
  saving: boolean;
  stages: StageOption[];
  dateOptions: DateOption[];
}) {
  const entryDateStr = format(
    parseStoredScheduleInstant(entry.startTime),
    "yyyy-MM-dd",
  );
  const optionsForEdit =
    dateOptions.length > 0
      ? dateOptions.some((o) => o.value === entryDateStr)
        ? dateOptions
        : [
            {
              value: entryDateStr,
              label: format(
                parseStoredScheduleInstant(entry.startTime),
                "EEE, d MMM yyyy",
              ),
            },
            ...dateOptions,
          ]
      : [
          {
            value: entryDateStr,
            label: format(
              parseStoredScheduleInstant(entry.startTime),
              "EEE, d MMM yyyy",
            ),
          },
        ];
  const [stageId, setStageId] = useState(entry.stageId ?? "");
  const [dateStr, setDateStr] = useState(entryDateStr);
  const [startTimeStr, setStartTimeStr] = useState(
    format(parseStoredScheduleInstant(entry.startTime), "HH:mm"),
  );
  const [endTimeStr, setEndTimeStr] = useState(
    entry.endTime
      ? format(parseStoredScheduleInstant(entry.endTime), "HH:mm")
      : "",
  );
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [conflictParts, setConflictParts] = useState<ConflictParts | null>(
    null,
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectiveDate = optionsForEdit.some((o) => o.value === dateStr)
    ? dateStr
    : optionsForEdit[0]!.value;

  useEffect(() => {
    if (!open) return;
    debounceRef.current = setTimeout(async () => {
      const startTime = localWallClockToDate(effectiveDate, startTimeStr);
      const endTime = endTimeStr
        ? localWallClockToDate(effectiveDate, endTimeStr)
        : null;
      const res = await checkScheduleConflict(festivalId, {
        startTime,
        endTime,
        stageId: stageId || null,
        excludeEntryId: entry.id,
        scheduleDayKey: effectiveDate,
        entryType: "PROGRAMME",
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
    effectiveDate,
    startTimeStr,
    endTimeStr,
    stageId,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageId) {
      toast.error("Select a stage.");
      return;
    }
    const startTime = localWallClockToDate(effectiveDate, startTimeStr);
    const endTime = endTimeStr
      ? localWallClockToDate(effectiveDate, endTimeStr)
      : null;
    await onSubmit({
      stageId: stageId || null,
      startTime,
      endTime,
      scheduleDayKey: effectiveDate,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit schedule entry</DialogTitle>
          <DialogDescription>{getEntryLabel(entry)}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Stage</Label>
            <Select value={stageId} onValueChange={setStageId}>
              <SelectTrigger>
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="block font-medium">{s.name}</span>
                    {s.description && (
                      <span className="block text-xs text-muted-foreground font-normal line-clamp-2">
                        {s.description}
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Select
                value={
                  optionsForEdit.some((o) => o.value === dateStr)
                    ? dateStr
                    : optionsForEdit[0]!.value
                }
                onValueChange={setDateStr}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select date" />
                </SelectTrigger>
                <SelectContent>
                  {optionsForEdit.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start time</Label>
              <input
                type="time"
                value={startTimeStr}
                onChange={(e) => setStartTimeStr(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>End time (optional)</Label>
            <input
              type="time"
              value={endTimeStr}
              onChange={(e) => setEndTimeStr(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            />
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
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !stageId || !!conflictError}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
