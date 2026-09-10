"use client";

import { Loader2, Play, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TimePicker } from "@/components/ui/time-picker";
import { createCheckpointAction } from "../actions/checkpoint.actions";
import { startSessionAction } from "../actions/checkpoint.actions";

export interface StartedSession {
  id: string;
  checkpointId: string;
  name: string;
  sessionDate: string;
  windowStartMin: number | null;
  windowEndMin: number | null;
  status: "OPEN" | "CLOSED";
  scannedCount: number;
}

interface CheckpointOption {
  id: string;
  name: string;
  requiresWindow: boolean;
}

interface StartSessionDialogProps {
  festivalId: string;
  basePath: string;
  checkpoints: CheckpointOption[];
  todayString: string;
  /** When set, the checkpoint is locked (nested page) and the picker hidden. */
  fixedCheckpointId?: string;
  /**
   * Called after a session is created. When omitted, the dialog navigates to
   * the checkpoint page with the new session opened.
   */
  onStarted?: (session: StartedSession) => void;
  triggerLabel?: string;
}

function hhmmToMinutes(value: string): number | null {
  if (!value) return null;
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export function StartSessionDialog({
  festivalId,
  basePath,
  checkpoints: initialCheckpoints,
  todayString,
  fixedCheckpointId,
  onStarted,
  triggerLabel = "Start session",
}: StartSessionDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [checkpoints, setCheckpoints] =
    useState<CheckpointOption[]>(initialCheckpoints);
  const [selectedId, setSelectedId] = useState<string>(
    fixedCheckpointId ?? initialCheckpoints[0]?.id ?? "",
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => checkpoints.find((c) => c.id === selectedId) ?? null,
    [checkpoints, selectedId],
  );
  const requiresWindow = selected?.requiresWindow ?? false;

  const canCreate =
    query.trim().length > 0 &&
    !checkpoints.some(
      (c) => c.name.toLowerCase() === query.trim().toLowerCase(),
    );

  const resetForm = () => {
    setSelectedId(fixedCheckpointId ?? initialCheckpoints[0]?.id ?? "");
    setStartTime("");
    setEndTime("");
    setQuery("");
    setError(null);
  };

  const handleCreateCheckpoint = async () => {
    const name = query.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const res = await createCheckpointAction({
        festivalId,
        name,
        requiresWindow: false,
      });
      if (res.success && res.checkpoint) {
        const option: CheckpointOption = {
          id: res.checkpoint.id,
          name: res.checkpoint.name,
          requiresWindow: res.checkpoint.requiresWindow,
        };
        setCheckpoints((prev) => [...prev, option]);
        setSelectedId(option.id);
        setPickerOpen(false);
        setQuery("");
      }
    } catch {
      setError("Could not create the checkpoint. The name may be taken.");
    } finally {
      setCreating(false);
    }
  };

  const handleStart = async () => {
    if (!selectedId) {
      setError("Select a checkpoint first.");
      return;
    }

    let windowStartMin: number | null;
    let windowEndMin: number | null;

    if (requiresWindow) {
      windowStartMin = hhmmToMinutes(startTime);
      windowEndMin = hhmmToMinutes(endTime);
      if (windowStartMin == null) {
        setError("Start time is required for this checkpoint.");
        return;
      }
      if (windowEndMin != null && windowEndMin <= windowStartMin) {
        setError("End time must be after the start time.");
        return;
      }
    } else {
      // Attendance-style: capture the moment the session opened.
      windowStartMin = nowMinutes();
      windowEndMin = null;
    }

    setSubmitting(true);
    setError(null);
    const res = await startSessionAction({
      festivalId,
      checkpointId: selectedId,
      date: todayString,
      windowStartMin,
      windowEndMin,
    });
    setSubmitting(false);

    if (!res.success || !res.session) {
      setError(res.error || "Failed to start the session.");
      return;
    }

    setOpen(false);
    resetForm();

    if (onStarted) {
      onStarted(res.session);
    } else {
      router.push(
        `${basePath}/${res.session.checkpointId}?session=${res.session.id}`,
      );
      router.refresh();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="w-1/2 sm:w-auto">
          <Play className="mr-2 h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start a session</DialogTitle>
          <DialogDescription>
            Open a scanning session. Food-style checkpoints need a time window;
            others are stamped when you start.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!fixedCheckpointId && (
            <div className="space-y-2">
              <Label>Checkpoint</Label>
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={pickerOpen}
                    className="w-full justify-between font-normal"
                  >
                    {selected?.name ?? "Select checkpoint"}
                    <Plus className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput
                      placeholder="Search or add checkpoint..."
                      value={query}
                      onValueChange={setQuery}
                    />
                    <CommandList>
                      <CommandEmpty>No checkpoint found.</CommandEmpty>
                      <CommandGroup>
                        {checkpoints.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={c.name}
                            onSelect={() => {
                              setSelectedId(c.id);
                              setPickerOpen(false);
                              setQuery("");
                            }}
                          >
                            {c.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      {canCreate && (
                        <CommandGroup>
                          <CommandItem
                            value={`__create_${query}`}
                            onSelect={handleCreateCheckpoint}
                            disabled={creating}
                          >
                            {creating ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Plus className="mr-2 h-4 w-4" />
                            )}
                            Add “{query.trim()}”
                          </CommandItem>
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {requiresWindow ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start time *</Label>
                <TimePicker value={startTime} onChange={setStartTime} />
              </div>
              <div className="space-y-2">
                <Label>End time</Label>
                <TimePicker value={endTime} onChange={setEndTime} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              The start time is recorded automatically when the session opens.
            </p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button onClick={handleStart} disabled={submitting || !selectedId}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
