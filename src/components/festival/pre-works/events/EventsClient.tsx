"use client";

import { deleteEvent } from "@/server/actions/event.actions";
import type { Event } from "@prisma/client";

type EventWithSchedule = Event & {
  scheduleEntries?: {
    startTime: Date;
    endTime: Date | null;
    stageId: string | null;
    stage: { id: string; name: string } | null;
  }[];
};
import { Calendar, CalendarDays, Edit, MapPin, Mic2, Plus, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EventDialog } from "./EventDialog";

const EVENT_TYPE_LABELS: Record<string, string> = {
  GENERAL: "General",
  CEREMONY: "Ceremony",
  TALK: "Talk",
  CONCERT: "Concert",
};

type StageOption = { id: string; name: string; description?: string | null };
type DateOption = { value: string; label: string };

interface EventsClientProps {
  festivalId: string;
  initialEvents: EventWithSchedule[];
  stages?: StageOption[];
  dateOptions?: DateOption[];
}

export function EventsClient({
  festivalId,
  initialEvents,
  stages = [],
  dateOptions = [],
}: EventsClientProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<EventWithSchedule | null>(null);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCreate = () => {
    setEventToEdit(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (event: EventWithSchedule) => {
    setEventToEdit(event);
    setIsDialogOpen(true);
  };

  const handleSuccess = () => {
    router.refresh();
  };

  const handleDelete = async () => {
    if (!eventToDelete) return;
    setIsDeleting(true);
    const res = await deleteEvent(festivalId, eventToDelete);
    setIsDeleting(false);
    if (res.success) {
      toast.success("Session deleted.");
      setEventToDelete(null);
      router.refresh();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sessions</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Create sessions (talks, ceremonies, etc.). Assign them to the
            schedule from the Schedule page.
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Create session
        </Button>
      </div>

      {initialEvents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-primary/10 rounded-full mb-4">
              <CalendarDays className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">No sessions yet</h3>
            <p className="text-muted-foreground max-w-sm mt-1 mb-4">
              Create sessions here. Then add them to the schedule with
              date, time, and stage.
            </p>
            <Button onClick={handleCreate}>Create session</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
          {initialEvents.map((event) => {
            const first = event.scheduleEntries?.[0];
            const typeLabel = EVENT_TYPE_LABELS[event.type] ?? event.type;
            return (
              <Card
                key={event.id}
                className="relative group overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm transition-all duration-200 hover:shadow-md hover:border-border"
              >
                <div className="absolute top-3 right-3 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 rounded-lg shadow-sm hover:bg-primary/10 hover:text-primary"
                    onClick={() => handleEdit(event)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 rounded-lg shadow-sm hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setEventToDelete(event.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-5 pr-20">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    <Mic2 className="h-3.5 w-3.5" />
                    {typeLabel}
                  </span>
                  <h3 className="mt-3 text-lg font-bold tracking-tight text-foreground line-clamp-2">
                    {event.name}
                  </h3>
                  {event.description && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {event.description}
                    </p>
                  )}
                  {first && (
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(first.startTime).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                      {first.stage?.name && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {first.stage.name}
                        </span>
                      )}
                    </div>
                  )}
                  {event.speakers && (
                    <p className="mt-3 flex items-center gap-1.5 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      <span className="line-clamp-1">{event.speakers}</span>
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <EventDialog
        festivalId={festivalId}
        eventToEdit={eventToEdit}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handleSuccess}
        stages={stages}
        dateOptions={dateOptions}
      />

      <AlertDialog
        open={!!eventToDelete}
        onOpenChange={(open) => !open && setEventToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the session. If it is on the schedule, those
              entries will remain but the session details will be lost. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

