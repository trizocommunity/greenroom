"use client";

import {
  eachDayOfInterval,
  format,
  isSameDay,
  parseISO,
  startOfDay,
} from "date-fns";
import {
  Calendar,
  Clock,
  Loader2,
  MapPin,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { HowItWorksButton } from "@/components/dashboard/HowItWorksButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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
import { TimePicker } from "@/components/ui/time-picker";
import type { SessionType } from "@/core/types/app-enums";
import { cn } from "@/core/utils/cn";
import { parseStoredInstant } from "@/core/utils/date-time";
import { useFestivalReadOnly } from "@/features/festivals/hooks/use-festival-read-only";
import {
  type ConflictParts,
  checkScheduleConflict,
  createScheduleEntry,
  deleteScheduleEntry,
  type ScheduleEntryWithRelations,
  updateScheduleEntry,
} from "@/features/schedule/actions/schedule.actions";
import {
  localWallClockToDate,
  parseStoredScheduleInstant,
} from "@/features/schedule/utils/schedule-datetime";

const SESSION_TYPE_LABELS: Record<string, string> = {
  GENERAL: "General",
  CEREMONY: "Ceremony",
  TALK: "Talk",
  CONCERT: "Concert",
};

type StageOption = { id: string; name: string; description?: string | null };
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
  return entry.title || "—";
}

function getDateKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

interface SessionScheduleClientProps {
  festivalId: string;
  initialEntries: ScheduleEntryWithRelations[];
  stages: StageOption[];
  festivalStartDate: string | null;
  festivalEndDate: string | null;
}

export function SessionScheduleClient({
  festivalId,
  initialEntries,
  stages,
  festivalStartDate,
  festivalEndDate,
}: SessionScheduleClientProps) {
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
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [editFormConflictParts, setEditFormConflictParts] =
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
  const hasFestivalDates = dateOptions.length > 0;

  const refresh = useCallback(() => {
    window.location.reload();
  }, []);

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
    title: string;
    description?: string | null;
    speakers?: string | null;
    sessionType?: string | null;
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
        type: "SESSION",
        title: data.title.trim() || null,
        description: data.description?.trim() || null,
        speakers: data.speakers?.trim() || null,
        sessionType: data.sessionType
          ? (data.sessionType as "GENERAL" | "CEREMONY" | "TALK" | "CONCERT")
          : null,
        stageId: data.stageId || null,
        startTime: data.startTime,
        endTime: data.endTime ?? null,
        scheduleDayKey: data.scheduleDayKey,
      });
      if (res.success) {
        toast.success("Session added to schedule.");
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
      title?: string | null;
      description?: string | null;
      speakers?: string | null;
      sessionType?: string | null;
      stageId?: string | null;
      startTime?: Date;
      endTime?: Date | null;
      scheduleDayKey?: string;
    },
  ) => {
    setEditFormError(null);
    setSaving(true);
    try {
      if (isReadOnly) return;
      const res = await updateScheduleEntry(festivalId, id, {
        ...data,
        sessionType: (data.sessionType ?? null) as SessionType | null,
      });
      if (res.success) {
        toast.success("Session updated.");
        setEditEntry(null);
        refresh();
      } else {
        setEditFormError(res.error);
        setEditFormConflictParts(res.conflictParts ?? null);
        toast.error(res.error);
      }
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
        toast.success("Session removed from schedule.");
        setEntries((prev) => prev.filter((e) => e.id !== id));
        setDeleteEntryId(null);
        refresh();
      } else toast.error(res.error);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Sessions</h2>
        <div className="flex items-center gap-2 shrink-0">
          <HowItWorksButton
            title="How Sessions work"
            description="Sessions are non-programme items on the schedule (e.g. ceremonies, breaks)."
          >
            <p className="text-sm text-muted-foreground">
              <strong>Sessions</strong> are time slots that are not competition
              programmes—e.g. opening ceremony, break, talk, or concert. Add a
              title, date, time, and optionally assign a stage.
            </p>
            <p className="text-sm text-muted-foreground">
              Create at least one stage in Pre Event Works → Stage Management
              before adding sessions. Session types (General, Ceremony, Talk,
              Concert) help you label the kind of activity. Times must fall
              within your festival event dates; overlaps on the same stage are
              blocked.
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
                  "Please create at least one stage before adding sessions.",
                );
                return;
              }
              if (!hasFestivalDates) {
                toast.error(
                  "Set your festival start and end dates in Festival setup before adding sessions.",
                );
                return;
              }
              setAddOpen(true);
            }}
            className="gap-2"
            disabled={!hasStages || !hasFestivalDates || isReadOnly}
          >
            <Plus className="h-4 w-4" />
            Add session
          </Button>
        </div>
      </div>

      {!isReadOnly && hasStages && !hasFestivalDates && (
        <output className="block rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
          <p className="font-medium">Set festival event dates</p>
          <p className="text-muted-foreground mt-0.5">
            Add a start and end date in{" "}
            <span className="font-medium text-foreground">Festival setup</span>{" "}
            so session times are limited to your event days.
          </p>
        </output>
      )}

      {sortedDays.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="font-medium">
              {isReadOnly
                ? "Read-only mode"
                : !hasStages
                  ? "No stages yet"
                  : !hasFestivalDates
                    ? "Set festival event dates"
                    : "No sessions yet"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {isReadOnly
                ? "Create, edit, and delete session actions are disabled."
                : !hasStages
                  ? "Please create a stage first in Pre Event Works → Stage Management before adding sessions."
                  : !hasFestivalDates
                    ? "Add start and end dates for your festival in Festival setup, then return here to add sessions."
                    : "Add sessions with title, stage, and time."}
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
                    "Please create at least one stage before adding sessions.",
                  );
                  return;
                }
                if (!hasFestivalDates) {
                  toast.error(
                    "Set your festival start and end dates in Festival setup before adding sessions.",
                  );
                  return;
                }
                setAddOpen(true);
              }}
              disabled={!hasStages || !hasFestivalDates || isReadOnly}
            >
              Add session
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
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

          {effectiveActiveDay && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-foreground">
                  {format(parseISO(effectiveActiveDay), "EEEE, MMM d, yyyy")}
                </h3>
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
                      <SelectItem value="__all__">All stages</SelectItem>
                      {stages.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {filteredDayEntries.length} session
                {filteredDayEntries.length !== 1 ? "s" : ""}
                {activeStageId !== "" &&
                  dayEntries.length !== filteredDayEntries.length &&
                  " on this stage"}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDayEntries.map((entry) => (
                  <Card
                    key={entry.id}
                    className="group/card relative flex flex-col overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm transition-all hover:border-primary/20 hover:shadow-md"
                  >
                    <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-primary/40 to-primary/10" />
                    <div className="flex-1 p-5 pb-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-base tracking-tight line-clamp-2">
                            {getEntryLabel(entry)}
                          </h4>
                          {entry.sessionType && (
                            <span className="mt-1.5 inline-block shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border border-border/50">
                              {SESSION_TYPE_LABELS[entry.sessionType] ??
                                entry.sessionType}
                            </span>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:bg-background hover:text-foreground opacity-0 group-hover/card:opacity-100 transition-opacity focus:opacity-100 sm:-mr-2 sm:-mt-1"
                              aria-label="Actions"
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
                      </div>
                    </div>
                    
                    <div className="flex-1 min-h-4" />

                    <div className="mx-5 mb-5 mt-4 flex flex-col gap-2 rounded-lg bg-muted/40 px-3 py-2.5 border border-border/40">
                      <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-2">
                          <Clock className="h-4 w-4 shrink-0 text-primary/70" />
                          {format(
                            parseStoredScheduleInstant(entry.startTime),
                            "h:mm a",
                          )}
                          {entry.endTime &&
                            ` – ${format(
                              parseStoredScheduleInstant(entry.endTime),
                              "h:mm a",
                            )}`}
                        </span>
                        {entry.stage?.name && (
                          <span className="inline-flex items-center gap-2">
                            <MapPin className="h-4 w-4 shrink-0 text-primary/70" />
                            {entry.stage.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <AddSessionDialog
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
        stages={stages}
        dateOptions={dateOptions}
      />

      {!isReadOnly && (
        <DeleteDialog
          title="Remove session"
          description="This session will be removed from the schedule."
          open={!!deleteEntryId}
          onOpenChange={(open) => !open && setDeleteEntryId(null)}
          onDelete={async () => {
            if (deleteEntryId) {
              await handleDelete(deleteEntryId);
            }
          }}
          isDeleting={!!deletingId}
        />
      )}

      {!isReadOnly && editEntry && (
        <EditSessionDialog
          festivalId={festivalId}
          entry={editEntry}
          open={!!editEntry}
          onOpenChange={(open) => {
            if (!open) {
              setEditEntry(null);
              setEditFormError(null);
              setEditFormConflictParts(null);
            }
          }}
          onSubmit={(data) => handleUpdate(editEntry.id, data)}
          saving={saving}
          formError={editFormError}
          formConflictParts={editFormConflictParts}
          stages={stages}
          dateOptions={dateOptions}
        />
      )}
    </div>
  );
}

function AddSessionDialog({
  festivalId,
  open,
  onOpenChange,
  onSubmit,
  saving,
  formError,
  formConflictParts,
  stages,
  dateOptions,
}: {
  festivalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    title: string;
    description?: string | null;
    speakers?: string | null;
    sessionType?: string | null;
    stageId?: string;
    startTime: Date;
    endTime?: Date;
    scheduleDayKey: string;
  }) => Promise<void>;
  saving: boolean;
  formError: string | null;
  formConflictParts?: ConflictParts | null;
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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [speakers, setSpeakers] = useState("");
  const [sessionType, setSessionType] = useState<string>("GENERAL");
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
        entryType: "SESSION",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) {
      toast.error("Enter a session title.");
      return;
    }
    if (!stageId) {
      toast.error("Select a stage.");
      return;
    }
    const submitDate =
      dateOptions.length > 0 && !dateOptions.some((o) => o.value === dateStr)
        ? dateOptions[0]!.value
        : dateStr;
    const startTime = localWallClockToDate(submitDate, startTimeStr);
    const endTime = endTimeStr
      ? localWallClockToDate(submitDate, endTimeStr)
      : undefined;
    await onSubmit({
      title: t,
      description: description.trim() || null,
      speakers: speakers.trim() || null,
      sessionType: sessionType || null,
      stageId: stageId || undefined,
      startTime,
      endTime,
      scheduleDayKey: submitDate,
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="p-4 sm:p-5 gap-0">
        <DrawerHeader className="pb-3">
          <DrawerTitle className="text-base">Add session</DrawerTitle>
          <DrawerDescription className="text-xs">
            Title, stage, and time. Conflicts are checked live.
          </DrawerDescription>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5">
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

          <div className="space-y-3">
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
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="add-session-type" className="text-xs">
                  Type
                </Label>
                <Select value={sessionType} onValueChange={setSessionType}>
                  <SelectTrigger id="add-session-type" className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["GENERAL", "CEREMONY", "TALK", "CONCERT"] as const).map(
                      (t) => (
                        <SelectItem key={t} value={t}>
                          {SESSION_TYPE_LABELS[t] ?? t}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-session-stage" className="text-xs">
                  Stage
                </Label>
                <Select value={stageId} onValueChange={setStageId}>
                  <SelectTrigger id="add-session-stage" className="h-9 text-sm">
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-session-description" className="text-xs">
                Description{" "}
                <span className="text-muted-foreground font-normal">(opt)</span>
              </Label>
              <textarea
                id="add-session-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Session description"
                rows={2}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-session-speakers" className="text-xs">
                Speakers{" "}
                <span className="text-muted-foreground font-normal">(opt)</span>
              </Label>
              <Input
                id="add-session-speakers"
                value={speakers}
                onChange={(e) => setSpeakers(e.target.value)}
                placeholder="e.g. Dr. Jane Smith, John Doe"
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 items-end">
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="add-session-date" className="text-xs">
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
                  <SelectTrigger id="add-session-date" className="h-9 text-sm">
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
                  id="add-session-date"
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="h-9 text-sm"
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-session-start" className="text-xs">
                Start
              </Label>
              <TimePicker
                id="add-session-start"
                value={startTimeStr}
                onChange={setStartTimeStr}
                className="h-9 text-sm w-full"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-session-end" className="text-xs">
                End{" "}
                <span className="text-muted-foreground font-normal">(opt)</span>
              </Label>
              <TimePicker
                id="add-session-end"
                value={endTimeStr}
                onChange={setEndTimeStr}
                className="h-9 text-sm w-full"
              />
            </div>
          </div>

          <DrawerFooter className="pt-3 pb-0 gap-2">
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
              disabled={saving || !title.trim() || !stageId || !!conflictError}
            >
              {saving && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              Add
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}

function EditSessionDialog({
  festivalId,
  entry,
  open,
  onOpenChange,
  onSubmit,
  saving,
  formError,
  formConflictParts,
  stages,
  dateOptions,
}: {
  festivalId: string;
  entry: ScheduleEntryWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    title?: string | null;
    description?: string | null;
    speakers?: string | null;
    sessionType?: string | null;
    stageId?: string | null;
    startTime?: Date;
    endTime?: Date | null;
    scheduleDayKey: string;
  }) => Promise<void>;
  saving: boolean;
  formError: string | null;
  formConflictParts?: ConflictParts | null;
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
  const [title, setTitle] = useState(entry.title ?? "");
  const [description, setDescription] = useState(entry.description ?? "");
  const [speakers, setSpeakers] = useState(entry.speakers ?? "");
  const [sessionType, setSessionType] = useState<string>(
    entry.sessionType ?? "GENERAL",
  );
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [conflictParts, setConflictParts] = useState<ConflictParts | null>(
    null,
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
        entryType: "SESSION",
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
      title: title.trim() || null,
      description: description.trim() || null,
      speakers: speakers.trim() || null,
      sessionType: sessionType || null,
      stageId: stageId || null,
      startTime,
      endTime,
      scheduleDayKey: effectiveDate,
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="p-4 sm:p-5 gap-0">
        <DrawerHeader className="pb-3">
          <DrawerTitle className="text-base">Edit session</DrawerTitle>
          <DrawerDescription className="text-xs">
            {getEntryLabel(entry)}
          </DrawerDescription>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-session-title" className="text-xs">
                Title
              </Label>
              <Input
                id="edit-session-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Session title"
                className="h-9 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-session-type" className="text-xs">
                  Type
                </Label>
                <Select value={sessionType} onValueChange={setSessionType}>
                  <SelectTrigger id="edit-session-type" className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["GENERAL", "CEREMONY", "TALK", "CONCERT"] as const).map(
                      (t) => (
                        <SelectItem key={t} value={t}>
                          {SESSION_TYPE_LABELS[t] ?? t}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-session-stage" className="text-xs">
                  Stage
                </Label>
                <Select value={stageId} onValueChange={setStageId}>
                  <SelectTrigger
                    id="edit-session-stage"
                    className="h-9 text-sm"
                  >
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-session-description" className="text-xs">
                Description{" "}
                <span className="text-muted-foreground font-normal">(opt)</span>
              </Label>
              <textarea
                id="edit-session-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Session description"
                rows={2}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-session-speakers" className="text-xs">
                Speakers{" "}
                <span className="text-muted-foreground font-normal">(opt)</span>
              </Label>
              <Input
                id="edit-session-speakers"
                value={speakers}
                onChange={(e) => setSpeakers(e.target.value)}
                placeholder="e.g. Dr. Jane Smith, John Doe"
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 items-end">
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="edit-session-date" className="text-xs">
                Date
              </Label>
              <Select
                value={
                  optionsForEdit.some((o) => o.value === dateStr)
                    ? dateStr
                    : optionsForEdit[0]!.value
                }
                onValueChange={setDateStr}
              >
                <SelectTrigger id="edit-session-date" className="h-9 text-sm">
                  <SelectValue placeholder="Date" />
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
            <div className="space-y-1.5">
              <Label htmlFor="edit-session-start" className="text-xs">
                Start
              </Label>
              <TimePicker
                id="edit-session-start"
                value={startTimeStr}
                onChange={setStartTimeStr}
                className="h-9 text-sm w-full"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-session-end" className="text-xs">
                End{" "}
                <span className="text-muted-foreground font-normal">(opt)</span>
              </Label>
              <TimePicker
                id="edit-session-end"
                value={endTimeStr}
                onChange={setEndTimeStr}
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

          <DrawerFooter className="pt-3 pb-0 gap-2">
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
              disabled={saving || !stageId || !!conflictError}
            >
              {saving && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              Update
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
