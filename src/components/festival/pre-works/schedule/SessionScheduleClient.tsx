"use client";

import type { SessionType } from "@/lib/prisma-enums";
import {
  createScheduleEntry,
  updateScheduleEntry,
  deleteScheduleEntry,
  type ScheduleEntryWithRelations,
} from "@/server/actions/schedule.actions";
import { format, parseISO, isSameDay, eachDayOfInterval, startOfDay } from "date-fns";
import { Calendar, Clock, Loader2, MapPin, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
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

const STAGE_NONE = "__none__";

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
  const dateOptions = getFestivalDateOptions(festivalStartDate, festivalEndDate);
  const [entries, setEntries] = useState<ScheduleEntryWithRelations[]>(initialEntries);
  const [addOpen, setAddOpen] = useState(false);
  const [addFormError, setAddFormError] = useState<string | null>(null);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [editEntry, setEditEntry] = useState<ScheduleEntryWithRelations | null>(null);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeDayKey, setActiveDayKey] = useState<string | null>(null);

  const hasStages = stages.length > 0;

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
    activeDayKey && groupedByDay[activeDayKey] ? activeDayKey : sortedDays[0] ?? null;

  const handleCreate = async (data: {
    title: string;
    description?: string | null;
    speakers?: string | null;
    sessionType?: string | null;
    stageId?: string;
    startTime: Date;
    endTime?: Date;
  }) => {
    setAddFormError(null);
    setSaving(true);
    try {
      const res = await createScheduleEntry(festivalId, {
        type: "SESSION",
        title: data.title.trim() || null,
        description: data.description?.trim() || null,
        speakers: data.speakers?.trim() || null,
        sessionType: data.sessionType ? (data.sessionType as "GENERAL" | "CEREMONY" | "TALK" | "CONCERT") : null,
        stageId: data.stageId || null,
        startTime: data.startTime,
        endTime: data.endTime ?? null,
      });
      if (res.success) {
        toast.success("Session added to schedule.");
        setAddOpen(false);
        refresh();
      } else {
        setAddFormError(res.error);
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
    },
  ) => {
    setEditFormError(null);
    setSaving(true);
    try {
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
        toast.error(res.error);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
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
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sessions</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Create and manage session-type schedule entries (talks, ceremonies, etc.). Programme
            entries are managed on the Schedule page.
          </p>
        </div>
        <Button
          onClick={() => {
            if (!hasStages) {
              toast.error("Please create at least one stage before adding sessions.");
              return;
            }
            setAddOpen(true);
          }}
          className="gap-2 shrink-0"
          disabled={!hasStages}
        >
          <Plus className="h-4 w-4" />
          Add session
        </Button>
      </div>

      {sortedDays.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="font-medium">
              {!hasStages ? "No stages yet" : "No sessions yet"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {!hasStages
                ? "Please create a stage first in Pre-Works → Stage Management before adding sessions."
                : "Add sessions with title, time, and optional stage."}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                if (!hasStages) {
                  toast.error("Please create at least one stage before adding sessions.");
                  return;
                }
                setAddOpen(true);
              }}
              disabled={!hasStages}
            >
              Add session
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2 border-b border-border pb-3" role="tablist">
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

          {effectiveActiveDay && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">
                {format(parseISO(effectiveActiveDay), "EEEE, MMM d, yyyy")}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedByDay[effectiveActiveDay].map((entry) => (
                    <Card
                      key={entry.id}
                      className="group relative overflow-hidden border border-border/80 bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/20"
                    >
                    <div className="absolute top-3 right-3 z-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="secondary" size="icon" className="h-8 w-8 rounded-lg shadow-sm">
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
                    </div>
                    <CardContent className="p-5 pr-12">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-semibold text-base tracking-tight line-clamp-2 flex-1 min-w-0">
                          {getEntryLabel(entry)}
                        </h4>
                        {entry.sessionType && (
                          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {SESSION_TYPE_LABELS[entry.sessionType] ?? entry.sessionType}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-2">
                          <Clock className="h-4 w-4 shrink-0 text-primary/70" />
                          {format(new Date(entry.startTime), "h:mm a")}
                          {entry.endTime &&
                            ` – ${format(new Date(entry.endTime), "h:mm a")}`}
                        </span>
                        {entry.stage?.name && (
                          <span className="inline-flex items-center gap-2">
                            <MapPin className="h-4 w-4 shrink-0 text-primary/70" />
                            {entry.stage.name}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <AddSessionDialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) setAddFormError(null);
        }}
        onSubmit={handleCreate}
        saving={saving}
        formError={addFormError}
        stages={stages}
        dateOptions={dateOptions}
      />

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

      {editEntry && (
        <EditSessionDialog
          entry={editEntry}
          open={!!editEntry}
          onOpenChange={(open) => {
            if (!open) {
              setEditEntry(null);
              setEditFormError(null);
            }
          }}
          onSubmit={(data) => handleUpdate(editEntry.id, data)}
          saving={saving}
          formError={editFormError}
          stages={stages}
          dateOptions={dateOptions}
        />
      )}
    </div>
  );
}

function AddSessionDialog({
  open,
  onOpenChange,
  onSubmit,
  saving,
  formError,
  stages,
  dateOptions,
}: {
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
  }) => Promise<void>;
  saving: boolean;
  formError: string | null;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) {
      toast.error("Enter a session title.");
      return;
    }
    const effectiveDate =
      dateOptions.length > 0 && !dateOptions.some((o) => o.value === dateStr)
        ? dateOptions[0]!.value
        : dateStr;
    const startTime = new Date(`${effectiveDate}T${startTimeStr}`);
    const endTime = endTimeStr ? new Date(`${effectiveDate}T${endTimeStr}`) : undefined;
    await onSubmit({
      title: t,
      description: description.trim() || null,
      speakers: speakers.trim() || null,
      sessionType: sessionType || null,
      stageId: stageId || undefined,
      startTime,
      endTime,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-4 sm:p-5 gap-0">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-base">Add session</DialogTitle>
          <DialogDescription className="text-xs">
            Title, stage, and time. Same time as another slot will show an error.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {formError && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive"
            >
              <span className="shrink-0 size-3.5 rounded-full bg-destructive/20 flex items-center justify-center text-[9px] font-bold">!</span>
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="add-session-title" className="text-xs">Title</Label>
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
                <Label htmlFor="add-session-type" className="text-xs">Type</Label>
                <Select value={sessionType} onValueChange={setSessionType}>
                  <SelectTrigger id="add-session-type" className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["GENERAL", "CEREMONY", "TALK", "CONCERT"] as const).map((t) => (
                      <SelectItem key={t} value={t}>
                        {SESSION_TYPE_LABELS[t] ?? t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-session-stage" className="text-xs">Stage <span className="text-muted-foreground font-normal">(opt)</span></Label>
                <Select
                  value={stageId || STAGE_NONE}
                  onValueChange={(v) => setStageId(v === STAGE_NONE ? "" : v)}
                >
                  <SelectTrigger id="add-session-stage" className="h-9 text-sm">
                    <SelectValue placeholder="No stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={STAGE_NONE}>
                      <span className="text-muted-foreground">No stage</span>
                    </SelectItem>
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
              <Label htmlFor="add-session-description" className="text-xs">Description <span className="text-muted-foreground font-normal">(opt)</span></Label>
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
              <Label htmlFor="add-session-speakers" className="text-xs">Speakers <span className="text-muted-foreground font-normal">(opt)</span></Label>
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
              <Label htmlFor="add-session-date" className="text-xs">Date</Label>
              {dateOptions.length > 0 ? (
                <Select
                  value={dateOptions.some((o) => o.value === dateStr) ? dateStr : dateOptions[0]!.value}
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
              <Label htmlFor="add-session-start" className="text-xs">Start</Label>
              <Input
                id="add-session-start"
                type="time"
                value={startTimeStr}
                onChange={(e) => setStartTimeStr(e.target.value)}
                className="h-9 text-sm w-full"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-session-end" className="text-xs">End <span className="text-muted-foreground font-normal">(opt)</span></Label>
              <Input
                id="add-session-end"
                type="time"
                value={endTimeStr}
                onChange={(e) => setEndTimeStr(e.target.value)}
                className="h-9 text-sm w-full"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 pb-0 gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={saving || !title.trim()}>
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditSessionDialog({
  entry,
  open,
  onOpenChange,
  onSubmit,
  saving,
  formError,
  stages,
  dateOptions,
}: {
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
  }) => Promise<void>;
  saving: boolean;
  formError: string | null;
  stages: StageOption[];
  dateOptions: DateOption[];
}) {
  const entryDateStr = format(new Date(entry.startTime), "yyyy-MM-dd");
  const optionsForEdit =
    dateOptions.length > 0
      ? dateOptions.some((o) => o.value === entryDateStr)
        ? dateOptions
        : [
            { value: entryDateStr, label: format(new Date(entry.startTime), "EEE, d MMM yyyy") },
            ...dateOptions,
          ]
      : [{ value: entryDateStr, label: format(new Date(entry.startTime), "EEE, d MMM yyyy") }];
  const [title, setTitle] = useState(entry.title ?? "");
  const [description, setDescription] = useState(entry.description ?? "");
  const [speakers, setSpeakers] = useState(entry.speakers ?? "");
  const [sessionType, setSessionType] = useState<string>(entry.sessionType ?? "GENERAL");
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
      title: title.trim() || null,
      description: description.trim() || null,
      speakers: speakers.trim() || null,
      sessionType: sessionType || null,
      stageId: stageId || null,
      startTime,
      endTime,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-4 sm:p-5 gap-0">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-base">Edit session</DialogTitle>
          <DialogDescription className="text-xs">{getEntryLabel(entry)}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {formError && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive"
            >
              <span className="shrink-0 size-3.5 rounded-full bg-destructive/20 flex items-center justify-center text-[9px] font-bold">!</span>
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-session-title" className="text-xs">Title</Label>
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
                <Label htmlFor="edit-session-type" className="text-xs">Type</Label>
                <Select value={sessionType} onValueChange={setSessionType}>
                  <SelectTrigger id="edit-session-type" className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["GENERAL", "CEREMONY", "TALK", "CONCERT"] as const).map((t) => (
                      <SelectItem key={t} value={t}>
                        {SESSION_TYPE_LABELS[t] ?? t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-session-stage" className="text-xs">Stage <span className="text-muted-foreground font-normal">(opt)</span></Label>
                <Select
                  value={stageId || STAGE_NONE}
                  onValueChange={(v) => setStageId(v === STAGE_NONE ? "" : v)}
                >
                  <SelectTrigger id="edit-session-stage" className="h-9 text-sm">
                    <SelectValue placeholder="No stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={STAGE_NONE}>
                      <span className="text-muted-foreground">No stage</span>
                    </SelectItem>
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
              <Label htmlFor="edit-session-description" className="text-xs">Description <span className="text-muted-foreground font-normal">(opt)</span></Label>
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
              <Label htmlFor="edit-session-speakers" className="text-xs">Speakers <span className="text-muted-foreground font-normal">(opt)</span></Label>
              <Input
                id="edit-session-speakers"
                value={speakers}
                onChange={(e) => setSpeakers(e.target.value)}
                placeholder="e.g. Dr. Jane Smith, John Doe"
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="edit-session-date" className="text-xs">Date</Label>
              <Select
                value={optionsForEdit.some((o) => o.value === dateStr) ? dateStr : optionsForEdit[0]!.value}
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
              <Label htmlFor="edit-session-start" className="text-xs">Start</Label>
              <Input
                id="edit-session-start"
                type="time"
                value={startTimeStr}
                onChange={(e) => setStartTimeStr(e.target.value)}
                className="h-9 text-sm w-30"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-session-end" className="text-xs">End <span className="text-muted-foreground font-normal">(opt)</span></Label>
              <Input
                id="edit-session-end"
                type="time"
                value={endTimeStr}
                onChange={(e) => setEndTimeStr(e.target.value)}
                className="h-9 text-sm w-30"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 pb-0 gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Update
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
