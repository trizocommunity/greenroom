"use client";

import { Loader2, Pencil } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DateRangePicker,
  type DateRangeValue,
} from "@/components/ui/date-picker";
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
import { parseInstant } from "@/core/datetime";
import { toast } from "@/lib/toast";

interface DeadlinesDialogProps {
  festival: {
    id: string;
    startDate?: string | null | undefined;
    createdAt?: string | null | undefined;
    programmeAssignmentStartDate?: string | null;
    programmeAssignmentDeadline?: string | null;
    programmeAssignmentCanAdd?: boolean | null;
    programmeAssignmentCanDelete?: boolean | null;
    participantCreationStartDate?: string | null;
    participantCreationDeadline?: string | null;
    participantCreationCanAdd?: boolean | null;
    participantCreationCanEdit?: boolean | null;
  };
  trigger?: React.ReactNode;
  onSaved?: () => void;
  isFeatureEnabled?: boolean;
  isParticipantDeadlineFeatureEnabled?: boolean;
}

export function DeadlinesDialog({
  festival,
  trigger,
  onSaved,
  isFeatureEnabled = true,
  isParticipantDeadlineFeatureEnabled = true,
}: DeadlinesDialogProps) {
  const [open, setOpen] = useState(false);
  const [programmeAssignment, setProgrammeAssignment] =
    useState<DateRangeValue>(() => ({
      from:
        parseInstant(festival.programmeAssignmentStartDate ?? null) ??
        undefined,
      to:
        parseInstant(festival.programmeAssignmentDeadline ?? null) ?? undefined,
    }));
  const [participantCreation, setParticipantCreation] =
    useState<DateRangeValue>(() => ({
      from:
        parseInstant(festival.participantCreationStartDate ?? null) ??
        undefined,
      to:
        parseInstant(festival.participantCreationDeadline ?? null) ?? undefined,
    }));
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

  const validateDates = () => {
    if (
      isFeatureEnabled &&
      (!programmeAssignment.from || !programmeAssignment.to)
    ) {
      toast.error(
        "Pick both an open and a close date for the programme assignment window.",
      );
      return false;
    }
    if (
      isParticipantDeadlineFeatureEnabled &&
      (!participantCreation.from || !participantCreation.to)
    ) {
      toast.error(
        "Pick both an open and a close date for the participant registration window.",
      );
      return false;
    }
    if (
      programmeAssignment.from &&
      programmeAssignment.to &&
      programmeAssignment.from >= programmeAssignment.to
    ) {
      toast.error("Assignment close must be after open.");
      return false;
    }
    if (
      participantCreation.from &&
      participantCreation.to &&
      participantCreation.from >= participantCreation.to
    ) {
      toast.error("Registration close must be after open.");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateDates()) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/v1/festivals/${festival.id}/deadlines`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programmeAssignmentStartDate:
            programmeAssignment.from?.toISOString() ?? null,
          programmeAssignmentDeadline:
            programmeAssignment.to?.toISOString() ?? null,
          participantCreationStartDate:
            participantCreation.from?.toISOString() ?? null,
          participantCreationDeadline:
            participantCreation.to?.toISOString() ?? null,
          programmeAssignmentCanAdd: assignmentCanAdd,
          programmeAssignmentCanDelete: assignmentCanDelete,
          participantCreationCanAdd: participantCanAdd,
          participantCreationCanEdit: participantCanEdit,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? "Failed to update deadlines");
      }
      toast.success("Deadline windows updated.");
      setOpen(false);
      onSaved?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update deadlines",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2">
      <Pencil className="h-4 w-4" />
      Edit deadlines
    </Button>
  );

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger ?? defaultTrigger}</DrawerTrigger>
      <DrawerContent className="p-0 sm:p-0 gap-0">
        <div className="mx-auto w-full max-w-2xl flex flex-col h-full overflow-hidden">
          <DrawerHeader className="shrink-0 py-4 sm:py-6 pb-2 border-b">
            <DrawerTitle>Deadline windows</DrawerTitle>
            <DrawerDescription>
              When team leaders can assign programmes and register new
              participants.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="programmeAssignmentRange">
                  Programme Assignment Window{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <DateRangePicker
                  id="programmeAssignmentRange"
                  value={programmeAssignment}
                  onChange={(value) => setProgrammeAssignment(value)}
                  placeholder="Pick open and close dates"
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
                />
                <PermissionToggle
                  id="assignmentCanDelete"
                  label="Allow removing"
                  description="Team Leaders can remove assignments."
                  checked={assignmentCanDelete}
                  onCheckedChange={setAssignmentCanDelete}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="participantCreationRange">
                  Participant Registration Window{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <DateRangePicker
                  id="participantCreationRange"
                  value={participantCreation}
                  onChange={(value) => setParticipantCreation(value)}
                  placeholder="Pick open and close dates"
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
                />
                <PermissionToggle
                  id="participantCanEdit"
                  label="Allow editing"
                  description="Team Leaders can edit their participants."
                  checked={participantCanEdit}
                  onCheckedChange={setParticipantCanEdit}
                />
              </div>
            </div>
          </div>

          <DrawerFooter className="shrink-0 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </DrawerFooter>
        </div>
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
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="cursor-pointer">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
