"use client";

import { format } from "date-fns";
import { ArrowRightLeft, Loader2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { cn } from "@/core/utils/cn";
import {
  type EnrichedScheduleEntry,
  swapScheduleSlots,
} from "@/features/schedule/actions/schedule.actions";
import { parseStoredScheduleInstant } from "@/features/schedule/utils/schedule-datetime";
import { toast } from "@/lib/toast";

interface ScheduleSwapDrawerProps {
  festivalId: string;
  entry: EnrichedScheduleEntry | null;
  allEntries: EnrichedScheduleEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwapped: () => void;
}

function safeFormat(d: Date, pattern: string, fallback = "—"): string {
  if (Number.isNaN(d.getTime())) return fallback;
  return format(d, pattern);
}

function getEntryTimeLabel(entry: EnrichedScheduleEntry): string {
  const start = parseStoredScheduleInstant(entry.startTime);
  const dateStr = safeFormat(start, "MMM d");
  const startStr = safeFormat(start, "h:mm a");
  if (!entry.endTime) return `${dateStr}, ${startStr}`;
  const end = parseStoredScheduleInstant(entry.endTime);
  return `${dateStr}, ${startStr} → ${safeFormat(end, "h:mm a")}`;
}

export function ScheduleSwapDrawer({
  festivalId,
  entry,
  allEntries,
  open,
  onOpenChange,
  onSwapped,
}: ScheduleSwapDrawerProps) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [swapping, setSwapping] = useState(false);

  const swappable = useMemo(() => {
    if (!entry) return [];
    return allEntries.filter(
      (e) => e.id !== entry.id && e.type === "PROGRAMME",
    );
  }, [allEntries, entry]);

  const filtered = useMemo(() => {
    if (!search.trim()) return swappable;
    const q = search.trim().toLowerCase();
    return swappable.filter((e) => {
      const name = e.programme?.name?.toLowerCase() ?? "";
      const stage = e.stage?.name?.toLowerCase() ?? "";
      const cat = e.programme?.category?.name?.toLowerCase() ?? "";
      return name.includes(q) || stage.includes(q) || cat.includes(q);
    });
  }, [swappable, search]);

  const selectedEntry = selectedId
    ? allEntries.find((e) => e.id === selectedId)
    : null;

  const handleSwap = async () => {
    if (!entry || !selectedId) return;
    setSwapping(true);
    try {
      const res = await swapScheduleSlots(festivalId, entry.id, selectedId);
      if (res.success) {
        toast.success("Schedule slots swapped successfully.");
        onSwapped();
        onOpenChange(false);
      } else {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to swap slots.");
    } finally {
      setSwapping(false);
    }
  };

  if (!entry) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <DrawerHeader className="pb-3 px-0 pt-0">
            <DrawerTitle className="text-base">
              Switch Schedule Slot
            </DrawerTitle>
            <DrawerDescription className="text-xs">
              Swap this programme's time slot and stage with another.
            </DrawerDescription>
          </DrawerHeader>

          {/* Current entry details */}
          <div className="rounded-lg border bg-muted/30 p-3 mb-4">
            <div className="text-xs text-muted-foreground mb-1">
              Current Programme
            </div>
            <div className="font-medium">
              {entry.programme?.name ?? entry.title ?? "—"}
            </div>
            {entry.programme?.nameSecondary && (
              <div className="text-xs text-muted-foreground">
                {entry.programme.nameSecondary}
              </div>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span>{entry.stage?.name ?? "No stage"}</span>
              <span>{getEntryTimeLabel(entry)}</span>
            </div>
            {entry.programme?.category?.name && (
              <span className="inline-block mt-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {entry.programme.category.name}
              </span>
            )}
          </div>

          {/* Swap arrow */}
          <div className="flex justify-center my-2">
            <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Search and select target */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search programmes to swap with..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1 rounded-lg border p-1">
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                  {search.trim()
                    ? "No matching programmes."
                    : "No other programme entries to swap with."}
                </div>
              ) : (
                filtered.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    className={cn(
                      "w-full text-left rounded-md px-3 py-2 text-sm transition-colors",
                      selectedId === e.id
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-muted/50",
                    )}
                    onClick={() =>
                      setSelectedId(selectedId === e.id ? null : e.id)
                    }
                  >
                    <div className="font-medium">
                      {e.programme?.name ?? "—"}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span>{e.stage?.name ?? "No stage"}</span>
                      <span>·</span>
                      <span>{getEntryTimeLabel(e)}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Preview */}
          {selectedEntry && (
            <div className="mt-4 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
              <div className="text-xs text-muted-foreground mb-2 font-medium">
                After swap
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="font-medium truncate">
                    {entry.programme?.name ?? "—"}
                  </div>
                  <div className="text-muted-foreground mt-0.5">
                    → {selectedEntry.stage?.name ?? "No stage"},{" "}
                    {getEntryTimeLabel(selectedEntry)}
                  </div>
                </div>
                <div>
                  <div className="font-medium truncate">
                    {selectedEntry.programme?.name ?? "—"}
                  </div>
                  <div className="text-muted-foreground mt-0.5">
                    → {entry.stage?.name ?? "No stage"},{" "}
                    {getEntryTimeLabel(entry)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DrawerFooter className="pt-3 pb-4 px-4 gap-2 flex-col-reverse sm:flex-row sm:justify-end border-t">
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
            className="w-full sm:w-auto"
            disabled={!selectedId || swapping}
            onClick={handleSwap}
          >
            {swapping && (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            )}
            Swap Slots
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
