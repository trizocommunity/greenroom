"use client";

import { format } from "date-fns";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
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
import { TimePicker } from "@/components/ui/time-picker";
import { cn } from "@/core/utils/cn";
import {
  calculateProgrammeDuration,
  getEndTimeFromDuration,
} from "@/features/schedule/utils/programme-duration";
import { localWallClockToDate } from "@/features/schedule/utils/schedule-datetime";
import { toast } from "@/lib/toast";
import { SESSION_TYPE_LABELS, SESSION_TYPE_OPTIONS } from "./constants";
import { useEntryConflictCheck } from "./hooks/useEntryConflictCheck";
import type {
  AddEntryInput,
  ConflictParts,
  SchedulableProgramme,
  StageOption,
} from "./types";

export type AddEntryDialogProps = {
  festivalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AddEntryInput) => Promise<void>;
  saving: boolean;
  formError: string | null;
  formConflictParts?: ConflictParts | null;
  programmes: SchedulableProgramme[];
  stages: StageOption[];
  festivalEndDate: string | null;
};

export function AddEntryDialog({
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
}: AddEntryDialogProps) {
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

  const selectedProgramme = programmes.find((p) => p.id === programmeId);

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

  const { error: conflictError, parts: conflictParts } = useEntryConflictCheck({
    festivalId,
    open,
    dateStr,
    startTimeStr,
    endTimeStr,
    stageId,
    entryType,
  });

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
                        {SESSION_TYPE_OPTIONS.map((t) => (
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

            <ConflictAlert
              parts={formConflictParts ?? conflictParts}
              message={formError ?? conflictError}
            />

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
