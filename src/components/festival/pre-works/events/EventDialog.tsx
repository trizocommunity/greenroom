"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createEvent,
  updateEvent,
  type EventFormData,
} from "@/server/actions/event.actions";
import type { EventType } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: "GENERAL", label: "General" },
  { value: "CEREMONY", label: "Ceremony" },
  { value: "TALK", label: "Talk" },
  { value: "CONCERT", label: "Concert" },
];

const STAGE_NONE = "__none__";

type EventRow = {
  id: string;
  name: string;
  description: string | null;
  type: EventType;
  speakers: string | null;
  scheduleEntries?: {
    startTime: Date;
    endTime: Date | null;
    stageId: string | null;
    stage: { id: string; name: string } | null;
  }[];
};

type StageOption = { id: string; name: string; description?: string | null };
type DateOption = { value: string; label: string };

interface EventDialogProps {
  festivalId: string;
  eventToEdit?: EventRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  stages?: StageOption[];
  dateOptions?: DateOption[];
}

export function EventDialog({
  festivalId,
  eventToEdit,
  open,
  onOpenChange,
  onSuccess,
  stages = [],
  dateOptions = [],
}: EventDialogProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<EventType>("GENERAL");
  const [speakers, setSpeakers] = useState("");
  const [description, setDescription] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [startTimeStr, setStartTimeStr] = useState("09:00");
  const [endTimeStr, setEndTimeStr] = useState("");
  const [stageId, setStageId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (eventToEdit) {
        setName(eventToEdit.name);
        setType(eventToEdit.type);
        setSpeakers(eventToEdit.speakers ?? "");
        setDescription(eventToEdit.description ?? "");
        const first = eventToEdit.scheduleEntries?.[0];
        if (first) {
          const d = new Date(first.startTime);
          setDateStr(d.toISOString().slice(0, 10));
          setStartTimeStr(d.toTimeString().slice(0, 5));
          setEndTimeStr(
            first.endTime ? new Date(first.endTime).toTimeString().slice(0, 5) : "",
          );
          setStageId(first.stageId ?? "");
        } else {
          setDateStr(dateOptions[0]?.value ?? "");
          setStartTimeStr("09:00");
          setEndTimeStr("");
          setStageId("");
        }
      } else {
        setName("");
        setType("GENERAL");
        setSpeakers("");
        setDescription("");
        setDateStr(dateOptions[0]?.value ?? "");
        setStartTimeStr("09:00");
        setEndTimeStr("");
        setStageId("");
      }
    }
  }, [open, eventToEdit, dateOptions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Title is required");
      return;
    }

    const data: EventFormData = {
      name: name.trim(),
      type,
      speakers: speakers.trim() || null,
      description: description.trim() || null,
    };

    const hasScheduleFields = dateStr && startTimeStr;
    if (hasScheduleFields) {
      data.schedule = {
        startTime: new Date(`${dateStr}T${startTimeStr}`),
        endTime: endTimeStr ? new Date(`${dateStr}T${endTimeStr}`) : null,
        stageId: stageId && stageId !== STAGE_NONE ? stageId : null,
      };
    } else if (eventToEdit?.scheduleEntries?.length) {
      data.schedule = {};
    }

    setIsLoading(true);
    const res = eventToEdit
      ? await updateEvent(festivalId, eventToEdit.id, data)
      : await createEvent(festivalId, data);
    setIsLoading(false);

    if (res.success) {
      toast.success(eventToEdit ? "Session updated." : "Session created.");
      onSuccess();
      onOpenChange(false);
    } else {
      toast.error(res.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{eventToEdit ? "Edit session" : "Create session"}</DialogTitle>
          <DialogDescription>
            {eventToEdit
              ? "Update title, type, speakers, and description."
              : "Add a session. You can assign it to the schedule later."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="event-name">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="event-name"
              placeholder="e.g. Opening Ceremony"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as EventType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-speakers">Speakers (optional)</Label>
            <Input
              id="event-speakers"
              placeholder="e.g. Speaker One, Speaker Two"
              value={speakers}
              onChange={(e) => setSpeakers(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-description">Description (optional)</Label>
            <Textarea
              id="event-description"
              placeholder="Brief description of the session..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          {(dateOptions.length > 0 || stages.length > 0) && (
            <>
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">Schedule (optional)</p>
                <p className="text-xs text-muted-foreground mb-3">
                  {eventToEdit
                    ? "Change date, time, or stage. Clear date/time to remove from schedule."
                    : "Add date and time to show this session on the public schedule."}
                </p>
              </div>
              {dateOptions.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Select
                      value={dateStr || dateOptions[0]?.value}
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
                  </div>
                  <div className="space-y-2">
                    <Label>Start time</Label>
                    <input
                      type="time"
                      value={startTimeStr}
                      onChange={(e) => setStartTimeStr(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>End time (optional)</Label>
                  <input
                    type="time"
                    value={endTimeStr}
                    onChange={(e) => setEndTimeStr(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  />
                </div>
                {stages.length > 0 && (
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
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {eventToEdit ? "Update session" : "Create session"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
