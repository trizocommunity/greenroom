"use client";

import { addDays, format, isAfter, parseISO, startOfDay } from "date-fns";
import { Check, ChevronsUpDown, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConflictAlert } from "@/components/festival/pre-event-works/schedule/ConflictAlert";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { TimePicker } from "@/components/ui/time-picker";
import { cn } from "@/core/utils/cn";
import {
  localWallClockToDate,
  parseStoredScheduleInstant,
} from "@/features/schedule/utils/schedule-datetime";
import { toast } from "@/lib/toast";
import {
  getEntryLabel,
  SESSION_TYPE_LABELS,
  SESSION_TYPE_OPTIONS,
  safeFormat,
} from "./constants";
import { useEntryConflictCheck } from "./hooks/useEntryConflictCheck";
import type {
  EditEntryInput,
  EnrichedScheduleEntry,
  StageOption,
} from "./types";

function buildDateOptions(start: Date | null, end: Date | null): string[] {
  const today = startOfDay(new Date());
  const lower = start ? startOfDay(start) : today;
  const upper = end ? startOfDay(end) : null;
  const options: string[] = [];
  let cursor = lower;
  const cap = 366;
  let i = 0;
  while (i++ < cap) {
    if (upper && isAfter(cursor, upper)) break;
    options.push(format(cursor, "yyyy-MM-dd"));
    cursor = addDays(cursor, 1);
  }
  return options;
}

function DateCombobox({
  value,
  onChange,
  startDate,
  endDate,
}: {
  value: string;
  onChange: (next: string) => void;
  startDate: string | null;
  endDate: string | null;
}) {
  const [open, setOpen] = useState(false);
  const options = buildDateOptions(
    startDate ? parseISO(startDate) : null,
    endDate ? parseISO(endDate) : null,
  );
  const display = value
    ? safeFormat(parseISO(value), "EEE, MMM d, yyyy")
    : "Select date";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-9 w-full justify-between font-normal text-sm px-3",
            !value && "text-muted-foreground",
          )}
        >
          <span className="truncate">{display}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command>
          <CommandInput
            placeholder="Search or type a date (yyyy-MM-dd)…"
            className="h-9"
          />
          <CommandList>
            <CommandEmpty>No matching date.</CommandEmpty>
            <CommandGroup>
              {options.map((d) => {
                const label = safeFormat(parseISO(d), "EEE, MMM d, yyyy");
                return (
                  <CommandItem
                    key={d}
                    value={label}
                    onSelect={() => {
                      onChange(d);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === d ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span>{label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export type EditEntryDialogProps = {
  festivalId: string;
  entry: EnrichedScheduleEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: EditEntryInput) => Promise<void>;
  onDelete: () => void;
  saving: boolean;
  stages: StageOption[];
  festivalStartDate: string | null;
  festivalEndDate: string | null;
};

export function EditEntryDialog({
  festivalId,
  entry,
  open,
  onOpenChange,
  onSubmit,
  onDelete,
  saving,
  stages,
  festivalStartDate,
  festivalEndDate,
}: EditEntryDialogProps) {
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

  const isSession = entry.type === "SESSION";
  const [title, setTitle] = useState(entry.title ?? "");
  const [description, setDescription] = useState(entry.description ?? "");
  const [sessionType, setSessionType] = useState<string>(
    entry.sessionType ?? "GENERAL",
  );

  const { error: conflictError, parts: conflictParts } = useEntryConflictCheck({
    festivalId,
    open,
    dateStr,
    startTimeStr,
    endTimeStr,
    stageId,
    entryType: entry.type,
    excludeEntryId: entry.id,
  });

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit schedule entry</DialogTitle>
          <DialogDescription>{getEntryLabel(entry)}</DialogDescription>
        </DialogHeader>
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
                  <SelectTrigger id="edit-session-type" className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SESSION_TYPE_OPTIONS.map((t) => (
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
              <Label className="text-xs">Date</Label>
              <DateCombobox
                value={dateStr}
                onChange={setDateStr}
                startDate={festivalStartDate}
                endDate={festivalEndDate}
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
          <ConflictAlert parts={conflictParts} message={conflictError} />
          <DialogFooter className="gap-2 flex-col-reverse sm:flex-row sm:justify-between">
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
