"use client";

import { Loader2, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DateRangePicker,
  type DateRangeValue,
} from "@/components/ui/date-range-picker";
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
import { Switch } from "@/components/ui/switch";
import { parseInstant, toDateOrNull } from "@/core/datetime";
import { updateFestivalSettingsAction } from "@/features/festivals/actions/festival-crud.actions";
import { toast } from "@/lib/toast";

interface DeadlinesDialogProps {
  festival: {
    id: string;
    programmeAssignmentStartDate?: Date | string | null;
    programmeAssignmentDeadline?: Date | string | null;
    participantCreationStartDate?: Date | string | null;
    participantCreationDeadline?: Date | string | null;
    programmeAssignmentCanAdd?: boolean | null;
    programmeAssignmentCanDelete?: boolean | null;
    participantCreationCanAdd?: boolean | null;
    participantCreationCanEdit?: boolean | null;
    startDate?: Date | string | null;
    createdAt?: Date | string | null;
    /**
     * IANA timezone the picked wall-clock is anchored to. Required so the
     * stored UTC instant round-trips correctly regardless of the admin's
     * browser TZ. Falls back to `DEFAULT_TZ` (`"UTC"`) when absent (e.g.
     * for legacy festivals created before the migration).
     */
    timezone?: string | null;
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
  const [programmeAssignment, setProgrammeAssignment] =
    useState<DateRangeValue>(() => ({
      start: parseInstant(festival.programmeAssignmentStartDate ?? null),
      end: parseInstant(festival.programmeAssignmentDeadline ?? null),
    }));
  const [participantCreation, setParticipantCreation] =
    useState<DateRangeValue>(() => ({
      start: parseInstant(festival.participantCreationStartDate ?? null),
      end: parseInstant(festival.participantCreationDeadline ?? null),
    }));
  // Per-window team-leader permissions. Default `true` so a window with no
  // stored flag (legacy festivals) keeps today's full-access behaviour.
  const [assignmentCanAdd, setAssignmentCanAdd] = useState(
    festival.programmeAssignmentCanAdd !== false,
  );
  const [assignmentCanDelete, setAssignmentCanDelete] = useState(
    festival.programmeAssignmentCanDelete !== false,
  );
  const [participantCanAdd, setParticipantCanAdd] = useState(
    festival.participantCreationCanAdd !== false,
  );
  const [participantCanEdit, setParticipantCanEdit] = useState(
    festival.participantCreationCanEdit !== false,
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
      isFeatureEnabled &&
      (!programmeAssignment.start || !programmeAssignment.end)
    ) {
      toast.error(
        "Pick both an open and a close date for the programme assignment window.",
      );
      return;
    }
    if (
      isParticipantDeadlineFeatureEnabled &&
      (!participantCreation.start || !participantCreation.end)
    ) {
      toast.error(
        "Pick both an open and a close date for the participant registration window.",
      );
      return;
    }
    if (
      programmeAssignment.start &&
      programmeAssignment.end &&
      programmeAssignment.start >= programmeAssignment.end
    ) {
      toast.error("Programme assignments must open before they close");
      return;
    }
    if (
      participantCreation.start &&
      participantCreation.end &&
      participantCreation.start >= participantCreation.end
    ) {
      toast.error("Participant registration must open before it closes");
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateFestivalSettingsAction(festival.id, {
        programmeAssignmentStartDate:
          programmeAssignment.start?.toISOString() ?? null,
        programmeAssignmentDeadline:
          programmeAssignment.end?.toISOString() ?? null,
        participantCreationStartDate:
          participantCreation.start?.toISOString() ?? null,
        participantCreationDeadline:
          participantCreation.end?.toISOString() ?? null,
        programmeAssignmentCanAdd: assignmentCanAdd,
        programmeAssignmentCanDelete: assignmentCanDelete,
        participantCreationCanAdd: participantCanAdd,
        participantCreationCanEdit: participantCanEdit,
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
                <Label htmlFor="programmeAssignmentRange">
                  Programme Assignment Window{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <DateRangePicker
                  id="programmeAssignmentRange"
                  value={programmeAssignment}
                  onChange={(value) => {
                    if (festivalHasStarted) return;
                    setProgrammeAssignment(value);
                  }}
                  placeholder="Pick open and close dates"
                  from={durationStart}
                  to={festivalStartDate ?? undefined}
                  disabled={festivalHasStarted}
                  tz={festival.timezone ?? undefined}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Team Leaders can assign participants to programmes only inside
                this window. Both an open and close date are required.
              </p>
              <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                <PermissionToggle
                  id="assignmentCanAdd"
                  label="Allow assigning"
                  description="Team Leaders can assign programmes."
                  checked={assignmentCanAdd}
                  onCheckedChange={setAssignmentCanAdd}
                  disabled={festivalHasStarted}
                />
                <PermissionToggle
                  id="assignmentCanDelete"
                  label="Allow removing"
                  description="Team Leaders can remove assignments."
                  checked={assignmentCanDelete}
                  onCheckedChange={setAssignmentCanDelete}
                  disabled={festivalHasStarted}
                />
              </div>
            </div>
          )}
          {isParticipantDeadlineFeatureEnabled && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="participantCreationRange">
                  Participant Registration Window{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <DateRangePicker
                  id="participantCreationRange"
                  value={participantCreation}
                  onChange={(value) => {
                    if (festivalHasStarted) return;
                    setParticipantCreation(value);
                  }}
                  placeholder="Pick open and close dates"
                  from={durationStart}
                  to={festivalStartDate ?? undefined}
                  disabled={festivalHasStarted}
                  tz={festival.timezone ?? undefined}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Team Leaders can add new participants only inside this window.
                Both an open and close date are required.
              </p>
              <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                <PermissionToggle
                  id="participantCanAdd"
                  label="Allow adding"
                  description="Team Leaders can add participants."
                  checked={participantCanAdd}
                  onCheckedChange={setParticipantCanAdd}
                  disabled={festivalHasStarted}
                />
                <PermissionToggle
                  id="participantCanEdit"
                  label="Allow editing"
                  description="Team Leaders can edit their participants."
                  checked={participantCanEdit}
                  onCheckedChange={setParticipantCanEdit}
                  disabled={festivalHasStarted}
                />
              </div>
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

function PermissionToggle({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="cursor-pointer">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}
