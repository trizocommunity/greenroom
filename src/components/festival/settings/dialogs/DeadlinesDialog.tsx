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
import { parseStoredInstant, toDateOrNull } from "@/core/utils/date-time";
import { updateFestivalSettingsAction } from "@/features/festivals/actions/festival-crud.actions";

interface DeadlinesDialogProps {
  festival: {
    id: string;
    programmeAssignmentDeadline?: Date | string | null;
    startDate?: Date | string | null;
    createdAt?: Date | string | null;
  };
  onSuccess?: () => void;
  trigger?: React.ReactNode;
  isFeatureEnabled?: boolean;
}

export function DeadlinesDialog({
  festival,
  onSuccess,
  trigger,
  isFeatureEnabled = true,
}: DeadlinesDialogProps) {
  const [open, setOpen] = useState(false);
  const [programmeAssignmentDeadline, setProgrammeAssignmentDeadline] =
    useState<Date | null>(
      festival.programmeAssignmentDeadline
        ? parseStoredInstant(festival.programmeAssignmentDeadline)
        : null,
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
    setIsSaving(true);
    try {
      const res = await updateFestivalSettingsAction(festival.id, {
        programmeAssignmentDeadline: programmeAssignmentDeadline
          ? programmeAssignmentDeadline.toISOString()
          : null,
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
            Set deadlines for programme assignments.
          </DrawerDescription>
        </DrawerHeader>

        <div className="grid gap-4 py-4">
          {isFeatureEnabled && (
            <div className="space-y-2">
              <Label htmlFor="programmeAssignmentDeadline">
                Programme Assignment Deadline
              </Label>
              <DateTimePicker
                id="programmeAssignmentDeadline"
                value={programmeAssignmentDeadline}
                onChange={(value) => {
                  if (festivalHasStarted) return;
                  setProgrammeAssignmentDeadline(value);
                }}
                placeholder="Pick deadline"
                from={durationStart}
                to={festivalStartDate ?? undefined}
                disabled={festivalHasStarted}
              />
              <p className="text-sm text-muted-foreground">
                Team Leaders cannot assign students to programmes after this
                time.
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
