import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
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
  const [dayKey, setDayKey] = useState<string>("ALL");
  const [stageId, setStageId] = useState<string>("ALL");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");

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

  const handleClear = async () => {
    await onClear({
      dayKey: dayKey === "ALL" ? null : dayKey,
      stageId: stageId === "ALL" ? null : stageId,
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
            Bulk remove entries from the schedule by applying filters. Leave a filter empty to ignore it.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Day</Label>
            <Select value={dayKey} onValueChange={setDayKey} disabled={isClearing}>
              <SelectTrigger>
                <SelectValue placeholder="All days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All days</SelectItem>
                {days.map((d) => (
                  <SelectItem key={d.key} value={d.key}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Stage</Label>
            <Select value={stageId} onValueChange={setStageId} disabled={isClearing}>
              <SelectTrigger>
                <SelectValue placeholder="All stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All stages</SelectItem>
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isClearing}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleClear} disabled={isClearing}>
            {isClearing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Clear Matching Entries
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}