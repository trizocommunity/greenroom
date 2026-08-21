import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Loader2, Check, ChevronsUpDown, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/core/utils/cn";
import { parseStoredScheduleInstant } from "@/features/schedule/utils/schedule-datetime";

type EnrichedScheduleEntry = any;

export function ClearScheduleDialog({
  open,
  onOpenChange,
  entries,
  stages,
  onClear,
  isClearing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: EnrichedScheduleEntry[];
  stages: { id: string; name: string }[];
  onClear: (filters: {
    dayKey: string | null;
    stageId: string | null;
    startTime: string | null;
    endTime: string | null;
  }) => Promise<void>;
  isClearing: boolean;
}) {
  const [dayKey, setDayKey] = useState<string>("");
  const [stageId, setStageId] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [dayOpen, setDayOpen] = useState(false);

  const days = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of entries) {
      const d = parseStoredScheduleInstant(e.startTime);
      if (!Number.isNaN(d.getTime())) {
        const key = format(d, "yyyy-MM-dd");
        const label = format(d, "MMM d, yyyy");
        map.set(key, label);
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, label], idx) => ({
        key,
        label: `Day ${idx + 1} (${label})`,
      }));
  }, [entries]);

  const matchingCount = useMemo(() => {
    if (!dayKey || !stageId) return null;
    let count = 0;
    for (const e of entries) {
      if (dayKey) {
        const d = parseStoredScheduleInstant(e.startTime);
        if (Number.isNaN(d.getTime()) || format(d, "yyyy-MM-dd") !== dayKey) continue;
      }
      if (stageId && e.stage?.id !== stageId) continue;
      if (startTime) {
        const d = parseStoredScheduleInstant(e.startTime);
        if (Number.isNaN(d.getTime())) continue;
        const startStr = format(d, "HH:mm");
        if (startStr < startTime) continue;
      }
      if (endTime && e.endTime) {
        const d = parseStoredScheduleInstant(e.endTime);
        if (Number.isNaN(d.getTime())) continue;
        const endStr = format(d, "HH:mm");
        if (endStr > endTime) continue;
      }
      count++;
    }
    return count;
  }, [entries, dayKey, stageId, startTime, endTime]);

  const timeError = startTime && endTime && startTime > endTime ? "End time must be after start time." : null;
  const noMatchError = matchingCount === 0 ? "No scheduled items found matching these filters." : null;
  const canClear = !!dayKey && !!stageId && !timeError && matchingCount !== null && matchingCount > 0;

  const handleClear = async () => {
    if (!canClear) return;
    await onClear({
      dayKey: dayKey || null,
      stageId: stageId || null,
      startTime: startTime || null,
      endTime: endTime || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !isClearing && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clear Schedule</DialogTitle>
          <DialogDescription>
            Bulk remove entries from the schedule by applying filters. Time is optional.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2 flex flex-col">
            <Label>Day</Label>
            <Popover open={dayOpen} onOpenChange={setDayOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={dayOpen}
                  className="w-full justify-between font-normal"
                  disabled={isClearing}
                >
                  {dayKey
                    ? days.find((d) => d.key === dayKey)?.label
                    : "Select day..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search day..." />
                  <CommandList>
                    <CommandEmpty>No day found.</CommandEmpty>
                    <CommandGroup>
                      {days.map((d) => (
                        <CommandItem
                          key={d.key}
                          value={d.label}
                          onSelect={() => {
                            setDayKey(d.key);
                            setDayOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              dayKey === d.key ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {d.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Stage</Label>
            <Select value={stageId} onValueChange={setStageId} disabled={isClearing}>
              <SelectTrigger>
                <SelectValue placeholder="Select stage..." />
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time (Optional)</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={isClearing}
              />
            </div>
            <div className="space-y-2">
              <Label>End Time (Optional)</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={isClearing}
              />
            </div>
          </div>
          
          {(timeError || noMatchError) && (
            <div className="flex items-center gap-2 text-sm text-destructive mt-1">
              <AlertTriangle className="h-4 w-4" />
              <span>{timeError || noMatchError}</span>
            </div>
          )}
          
          {matchingCount !== null && matchingCount > 0 && !timeError && (
            <div className="text-sm text-muted-foreground mt-1">
              Found {matchingCount} entry{matchingCount === 1 ? "" : "s"} to clear.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isClearing}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleClear} disabled={!canClear || isClearing}>
            {isClearing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Clear Matching Entries
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}