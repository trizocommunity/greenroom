"use client";

import { Loader2, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateFestivalSettingsAction } from "@/features/festivals/actions/festival-crud.actions";

interface TeamResultsDialogProps {
  festival: {
    id: string;
    teamLeaderLimit?: number | null;
    announcerResultsPerStandings?: number | null;
  };
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function TeamResultsDialog({
  festival,
  onSuccess,
  trigger,
}: TeamResultsDialogProps) {
  const [open, setOpen] = useState(false);
  const [teamLeaderLimit, setTeamLeaderLimit] = useState<number>(
    festival.teamLeaderLimit ?? 2,
  );
  const [announcerResultsPerStandings, setAnnouncerResultsPerStandings] =
    useState<number>(festival.announcerResultsPerStandings ?? 10);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (teamLeaderLimit < 1 || teamLeaderLimit > 10) {
      toast.error("Team leader limit must be between 1 and 10.");
      return;
    }
    if (
      announcerResultsPerStandings < 1 ||
      announcerResultsPerStandings > 100
    ) {
      toast.error("Results per standings must be between 1 and 100.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateFestivalSettingsAction(festival.id, {
        teamLeaderLimit,
        announcerResultsPerStandings,
      });

      if (res.success) {
        toast.success("Team & Results settings updated");
        setOpen(false);
        onSuccess?.();
      } else {
        toast.error("Failed to update settings");
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Team &amp; Results</DialogTitle>
          <DialogDescription>
            Configure team limits and result display settings.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="teamLeaderLimit">Team Leader Limit Per Group</Label>
            <Input
              id="teamLeaderLimit"
              type="number"
              min={1}
              max={10}
              value={teamLeaderLimit}
              onChange={(e) => setTeamLeaderLimit(Number(e.target.value))}
            />
            <p className="text-sm text-muted-foreground">
              Max team leaders per group (1-10).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="announcerResultsPerStandings">
              Number of results
            </Label>
            <Input
              id="announcerResultsPerStandings"
              type="number"
              min={1}
              max={100}
              value={announcerResultsPerStandings}
              onChange={(e) =>
                setAnnouncerResultsPerStandings(Number(e.target.value))
              }
            />
            <p className="text-sm text-muted-foreground">
              After this many results are announced on-air (per block), publish
              group standings to the public site before the next batch.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
