"use client";

import {
  createScheduleEntry,
  updateScheduleEntry,
  deleteScheduleEntry,
  reorderScheduleEntries,
  type ScheduleEntryWithRelations,
} from "@/server/actions/schedule.actions";
import { format, parseISO, isSameDay, eachDayOfInterval, startOfDay } from "date-fns";
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
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { cn } from "@/lib/utils";

/** Sentinel for "no stage" — Radix Select forbids value="" */
const STAGE_NONE = "__none__";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ProgrammeOption = { id: string; name: string };
type EventOption = { id: string; name: string };
type StageOption = { id: string; name: string; description?: string | null };

interface ScheduleClientProps {
  festivalId: string;
  initialEntries: ScheduleEntryWithRelations[];
  programmes: ProgrammeOption[];
  events: EventOption[];
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
  const start = startOfDay(new Date(startISO));
  const end = startOfDay(new Date(endISO));
  if (start > end) return [];
  const days = eachDayOfInterval({ start, end });
  return days.map((d) => ({
    value: format(d, "yyyy-MM-dd"),
    label: format(d, "EEE, d MMM yyyy"),
  }));
}

function getEntryLabel(entry: ScheduleEntryWithRelations): string {
  if (entry.programme) return entry.programme.name;
  if (entry.event) return entry.event.name;
  return "—";
}

function getDateKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function ScheduleClient({
  festivalId,
  initialEntries,
  programmes,
  events,
  stages,
  festivalStartDate,
  festivalEndDate,
}: ScheduleClientProps) {
  const dateOptions = getFestivalDateOptions(festivalStartDate, festivalEndDate);
  const [entries, setEntries] = useState<ScheduleEntryWithRelations[]>(initialEntries);
  const [addOpen, setAddOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<ScheduleEntryWithRelations | null>(null);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeDayKey, setActiveDayKey] = useState<string | null>(null);

  const refresh = useCallback(() => {
    window.location.reload();
  }, []);

  const groupedByDay = entries.reduce<Record<string, ScheduleEntryWithRelations[]>>((acc, entry) => {
    const key = getDateKey(new Date(entry.startTime));
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  const sortedDays = Object.keys(groupedByDay).sort();
  const effectiveActiveDay =
    activeDayKey && groupedByDay[activeDayKey]
      ? activeDayKey
      : sortedDays[0] ?? null;

  const handleCreate = async (data: {
    type: "programme" | "event";
    programmeId?: string;
    eventId?: string;
    stageId?: string;
    startTime: Date;
    endTime?: Date;
  }) => {
    setSaving(true);
    try {
      const res = await createScheduleEntry(festivalId, {
        programmeId: data.type === "programme" ? data.programmeId : null,
        eventId: data.type === "event" ? data.eventId : null,
        stageId: data.stageId || null,
        startTime: data.startTime,
        endTime: data.endTime ?? null,
      });
      if (res.success) {
        toast.success("Added to schedule.");
        setAddOpen(false);
        refresh();
      } else toast.error(res.error);
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
    },
  ) => {
    setSaving(true);
    try {
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

  const moveEntry = async (entry: ScheduleEntryWithRelations, direction: "up" | "down") => {
    const dayKey = getDateKey(new Date(entry.startTime));
    const dayEntries = groupedByDay[dayKey] ?? [];
    const idx = dayEntries.findIndex((e) => e.id === entry.id);
    if (idx < 0) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= dayEntries.length) return;
    const reordered = [...dayEntries];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    const res = await reorderScheduleEntries(
      festivalId,
      reordered.map((e) => e.id),
    );
    if (res.success) {
      toast.success("Order updated.");
      refresh();
    } else toast.error(res.error);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Schedule</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Schedule programmes and events by day, time, and stage.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Add to schedule
        </Button>
      </div>

      {sortedDays.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="font-medium">No schedule entries yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add programmes or events to build your schedule.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => setAddOpen(true)}>
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
            {sortedDays.map((dayKey) => {
              const dayEntries = groupedByDay[dayKey];
              const dayDate = parseISO(dayKey);
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
                  {format(dayDate, "EEE, MMM d")}
                  <span className="ml-2 opacity-80">({dayEntries.length})</span>
                </button>
              );
            })}
          </div>

          {/* Active day content */}
          {effectiveActiveDay && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">
                  {format(parseISO(effectiveActiveDay), "EEEE, MMM d, yyyy")}
                </CardTitle>
                <CardDescription>
                  {groupedByDay[effectiveActiveDay].length} item
                  {groupedByDay[effectiveActiveDay].length !== 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2">
                  {groupedByDay[effectiveActiveDay].map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-center gap-3 rounded-lg border bg-card p-3"
                    >
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => moveEntry(entry, "up")}
                          disabled={
                            groupedByDay[effectiveActiveDay].indexOf(entry) === 0
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
                            groupedByDay[effectiveActiveDay].indexOf(entry) ===
                            groupedByDay[effectiveActiveDay].length - 1
                          }
                          aria-label="Move down"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{getEntryLabel(entry)}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(entry.startTime), "h:mm a")}
                          {entry.endTime &&
                            ` – ${format(new Date(entry.endTime), "h:mm a")}`}
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
                                    <> · {format(new Date(entry.updatedAt), "MMM d, h:mm a")}</>
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
                                      format(new Date(entry.updatedAt), "MMM d, yyyy 'at' h:mm a")}
                                  </p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditEntry(entry)}>
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
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <AddEntryDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSubmit={handleCreate}
        saving={saving}
        programmes={programmes}
        events={events}
        stages={stages}
        dateOptions={dateOptions}
      />

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

      {editEntry && (
        <EditEntryDialog
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
  open,
  onOpenChange,
  onSubmit,
  saving,
  programmes,
  events,
  stages,
  dateOptions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    type: "programme" | "event";
    programmeId?: string;
    eventId?: string;
    stageId?: string;
    startTime: Date;
    endTime?: Date;
  }) => Promise<void>;
  saving: boolean;
  programmes: ProgrammeOption[];
  events: EventOption[];
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
  const [type, setType] = useState<"programme" | "event">("programme");
  const [programmeId, setProgrammeId] = useState("");
  const [eventId, setEventId] = useState("");
  const [stageId, setStageId] = useState("");
  const [dateStr, setDateStr] = useState(defaultDate);
  const [startTimeStr, setStartTimeStr] = useState("09:00");
  const [endTimeStr, setEndTimeStr] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (type === "programme" && !programmeId) {
      toast.error("Select a programme.");
      return;
    }
    if (type === "event" && !eventId) {
      toast.error("Select a session.");
      return;
    }
    const effectiveDate =
      dateOptions.length > 0 && !dateOptions.some((o) => o.value === dateStr)
        ? dateOptions[0]!.value
        : dateStr;
    const startTime = new Date(`${effectiveDate}T${startTimeStr}`);
    const endTime = endTimeStr ? new Date(`${effectiveDate}T${endTimeStr}`) : undefined;
    await onSubmit({
      type,
      programmeId: type === "programme" ? programmeId : undefined,
      eventId: type === "event" ? eventId : undefined,
      stageId: stageId || undefined,
      startTime,
      endTime,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to schedule</DialogTitle>
          <DialogDescription>
            Choose a programme or event, stage, and time.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v as "programme" | "event");
                setProgrammeId("");
                setEventId("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="programme">Programme</SelectItem>
                <SelectItem value="event">Session</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {type === "programme" && (
            <div className="space-y-2">
              <Label>Programme</Label>
              <Select value={programmeId} onValueChange={setProgrammeId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select programme" />
                </SelectTrigger>
                <SelectContent>
                  {programmes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {type === "event" && (
            <div className="space-y-2">
              <Label>Session</Label>
              <Select value={eventId} onValueChange={setEventId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Stage (optional)</Label>
            <Select
              value={stageId || STAGE_NONE}
              onValueChange={(v) => setStageId(v === STAGE_NONE ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={STAGE_NONE}>None</SelectItem>
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
              {dateOptions.length > 0 ? (
                <Select
                  value={dateOptions.some((o) => o.value === dateStr) ? dateStr : dateOptions[0]!.value}
                  onValueChange={setDateStr}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select date" />
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
                <>
                  <input
                    type="date"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Set festival start and end date to restrict to festival days.
                  </p>
                </>
              )}
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                saving ||
                (type === "programme" && !programmeId) ||
                (type === "event" && !eventId)
              }
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditEntryDialog({
  entry,
  open,
  onOpenChange,
  onSubmit,
  saving,
  stages,
  dateOptions,
}: {
  entry: ScheduleEntryWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    stageId?: string | null;
    startTime?: Date;
    endTime?: Date | null;
  }) => Promise<void>;
  saving: boolean;
  stages: StageOption[];
  dateOptions: DateOption[];
}) {
  const entryDateStr = format(new Date(entry.startTime), "yyyy-MM-dd");
  const optionsForEdit =
    dateOptions.length > 0
      ? dateOptions.some((o) => o.value === entryDateStr)
        ? dateOptions
        : [
            {
              value: entryDateStr,
              label: format(new Date(entry.startTime), "EEE, d MMM yyyy"),
            },
            ...dateOptions,
          ]
      : [{ value: entryDateStr, label: format(new Date(entry.startTime), "EEE, d MMM yyyy") }];
  const [stageId, setStageId] = useState(entry.stageId ?? "");
  const [dateStr, setDateStr] = useState(entryDateStr);
  const [startTimeStr, setStartTimeStr] = useState(
    format(new Date(entry.startTime), "HH:mm"),
  );
  const [endTimeStr, setEndTimeStr] = useState(
    entry.endTime ? format(new Date(entry.endTime), "HH:mm") : "",
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const startTime = new Date(`${dateStr}T${startTimeStr}`);
    const endTime = endTimeStr ? new Date(`${dateStr}T${endTimeStr}`) : null;
    await onSubmit({
      stageId: stageId || null,
      startTime,
      endTime,
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
            <Label>Stage (optional)</Label>
            <Select
              value={stageId || STAGE_NONE}
              onValueChange={(v) => setStageId(v === STAGE_NONE ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={STAGE_NONE}>None</SelectItem>
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
                value={optionsForEdit.some((o) => o.value === dateStr) ? dateStr : optionsForEdit[0]!.value}
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
