"use client";

import { Loader2, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-picker";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { parseInstant, toDateOrNull } from "@/core/datetime";
import { updateFestivalSettingsAction } from "@/features/festivals/actions/festival-crud.actions";

interface DeadlinesDialogProps {
  festival: {
    id: string;
    programmeAssignmentStartDate?: Date | string | null;
    programmeAssignmentDeadline?: Date | string | null;
    participantCreationStartDate?: Date | string | null;
    participantCreationDeadline?: Date | string | null;
    startDate?: Date | string | null;
    createdAt?: Date | string | null;
  };
  onSuccess?: () => void;
  trigger?: React.ReactNode;
  isFeatureEnabled?: boolean;
  isParticipantDeadlineFeatureEnabled?: boolean;
}

export function DeadlinesDialog({
  festival,
  onSuccess,
  trigger,
  isFeatureEnabled = true,
  isParticipantDeadlineFeatureEnabled = true,
}: DeadlinesDialogProps) {
  const [open, setOpen] = useState(false);
  const [programmeAssignmentStartDate, setProgrammeAssignmentStartDate] =
    useState<Date | null>(() =>
      parseInstant(festival.programmeAssignmentStartDate ?? null),
    );
  const [programmeAssignmentDeadline, setProgrammeAssignmentDeadline] =
    useState<Date | null>(() =>
      parseInstant(festival.programmeAssignmentDeadline ?? null),
    );
  const [participantCreationStartDate, setParticipantCreationStartDate] =
    useState<Date | null>(() =>
      parseInstant(festival.participantCreationStartDate ?? null),
    );
  const [participantCreationDeadline, setParticipantCreationDeadline] =
    useState<Date | null>(() =>
      parseInstant(festival.participantCreationDeadline ?? null),
    );
  const [isSaving, setIsSaving] = useState(false);

  const durationStart = festival.createdAt
    ? (toDateOrNull(festival.createdAt) ?? new Date())
    : new Date();

  const festivalStartDate = useMemo(() => {
    if (!festival.startDate) return null;
    const d = new Date(festival.startDate);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [festival.startDate]);

  const festivalHasStarted = useMemo(() => {
    if (!festivalStartDate) return false;
    return new Date() >= festivalStartDate;
  }, [festivalStartDate]);

  const handleSave = async () => {
    if (
      programmeAssignmentStartDate &&
      programmeAssignmentDeadline &&
      programmeAssignmentStartDate >= programmeAssignmentDeadline
    ) {
      toast.error("Programme assignments must open before they close");
      return;
    }
    if (
      participantCreationStartDate &&
      participantCreationDeadline &&
      participantCreationStartDate >= participantCreationDeadline
    ) {
      toast.error("Participant registration must open before it closes");
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateFestivalSettingsAction(festival.id, {
        programmeAssignmentStartDate:
          programmeAssignmentStartDate?.toISOString() ?? null,
        programmeAssignmentDeadline:
          programmeAssignmentDeadline?.toISOString() ?? null,
        participantCreationStartDate:
          participantCreationStartDate?.toISOString() ?? null,
        participantCreationDeadline:
          participantCreationDeadline?.toISOString() ?? null,
      });

      if (res.success) {
        toast.success("Deadlines updated");
        setOpen(false);
        onSuccess?.();
      } else {
        toast.error("Failed to update deadlines");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2">
      <Pencil className="h-4 w-4" />
      Edit
    </Button>
  );

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger ?? defaultTrigger}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Deadlines</DrawerTitle>
          <DrawerDescription>
            Set the windows during which Team Leaders can assign programmes and
            register participants.
          </DrawerDescription>
        </DrawerHeader>

        <div className="grid gap-6 py-4">
          {isFeatureEnabled && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="programmeAssignmentStartDate">
                  Programme Assignment Opens
                </Label>
                <DateTimePicker
                  id="programmeAssignmentStartDate"
                  value={programmeAssignmentStartDate}
                  onChange={(value) => {
                    if (festivalHasStarted) return;
                    setProgrammeAssignmentStartDate(value);
                  }}
                  placeholder="Pick start (optional)"
                  from={durationStart}
                  to={festivalStartDate ?? undefined}
                  disabled={festivalHasStarted}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="programmeAssignmentDeadline">
                  Programme Assignment Closes
                </Label>
                <DateTimePicker
                  id="programmeAssignmentDeadline"
                  value={programmeAssignmentDeadline}
                  onChange={(value) => {
                    if (festivalHasStarted) return;
                    setProgrammeAssignmentDeadline(value);
                  }}
                  placeholder="Pick deadline"
                  from={programmeAssignmentStartDate ?? durationStart}
                  to={festivalStartDate ?? undefined}
                  disabled={festivalHasStarted}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Team Leaders can assign participants to programmes only inside
                this window. Leave the start empty to open it immediately.
              </p>
            </div>
          )}
          {isParticipantDeadlineFeatureEnabled && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="participantCreationStartDate">
                  Participant Registration Opens
                </Label>
                <DateTimePicker
                  id="participantCreationStartDate"
                  value={participantCreationStartDate}
                  onChange={(value) => {
                    if (festivalHasStarted) return;
                    setParticipantCreationStartDate(value);
                  }}
                  placeholder="Pick start (optional)"
                  from={durationStart}
                  to={festivalStartDate ?? undefined}
                  disabled={festivalHasStarted}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="participantCreationDeadline">
                  Participant Registration Closes
                </Label>
                <DateTimePicker
                  id="participantCreationDeadline"
                  value={participantCreationDeadline}
                  onChange={(value) => {
                    if (festivalHasStarted) return;
                    setParticipantCreationDeadline(value);
                  }}
                  placeholder="Pick deadline"
                  from={participantCreationStartDate ?? durationStart}
                  to={festivalStartDate ?? undefined}
                  disabled={festivalHasStarted}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Team Leaders can add new participants only inside this window.
                Leave the start empty to open it immediately.
              </p>
            </div>
          )}
        </div>

        <DrawerFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
