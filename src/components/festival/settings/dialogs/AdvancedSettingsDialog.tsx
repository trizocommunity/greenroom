"use client";

import { Loader2, Lock, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateFestivalSettingsAction } from "@/features/festivals/actions/festival-crud.actions";

interface ChestNumberSettings {
  autoGenerate?: boolean;
  prefix?: string;
  padding?: number;
}

interface AdvancedSettingsDialogProps {
  festival: {
    id: string;
    scoringSystem?: "POSITION_BASED" | "SCORE_BASED" | null;
    publicDisplayMode?: "programme_results" | "team_standings" | null;
    chestNumberSettings?: ChestNumberSettings | null;
  };
  onSuccess?: () => void;
  trigger?: React.ReactNode;
  isFeatureEnabled?: boolean;
}

export function AdvancedSettingsDialog({
  festival,
  onSuccess,
  trigger,
  isFeatureEnabled = true,
}: AdvancedSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [scoringSystem, setScoringSystem] = useState<
    "POSITION_BASED" | "SCORE_BASED"
  >(festival.scoringSystem ?? "SCORE_BASED");
  const [publicDisplayMode, setPublicDisplayMode] = useState<
    "programme_results" | "team_standings"
  >(festival.publicDisplayMode ?? "programme_results");
  const [chestNumberPrefix, setChestNumberPrefix] = useState(
    festival.chestNumberSettings?.prefix ?? "",
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await updateFestivalSettingsAction(festival.id, {
        scoringSystem,
        publicDisplayMode,
        chestNumberSettings: {
          autoGenerate: true,
          prefix: chestNumberPrefix || "AHL-",
          padding: 3,
        },
      });

      if (res.success) {
        toast.success("Advanced settings updated");
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

  if (!isFeatureEnabled) {
    return (
      <div className="rounded-lg border border-dashed p-4 space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
          Advanced Settings
        </h4>
        <p className="text-sm text-muted-foreground">
          Additional options for your plan.
        </p>
      </div>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger ?? defaultTrigger}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Advanced Settings</DrawerTitle>
          <DrawerDescription>
            Configure scoring system and result display preferences.
          </DrawerDescription>
        </DrawerHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="scoringSystem">Scoring System</Label>
            <select
              id="scoringSystem"
              value={scoringSystem}
              onChange={(e) =>
                setScoringSystem(
                  e.target.value as "POSITION_BASED" | "SCORE_BASED",
                )
              }
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="SCORE_BASED">Score Based</option>
              <option value="POSITION_BASED">Position Based</option>
            </select>
            <p className="text-sm text-muted-foreground">
              How results are ranked and displayed.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="publicDisplayMode">Public Display Mode</Label>
            <select
              id="publicDisplayMode"
              value={publicDisplayMode}
              onChange={(e) =>
                setPublicDisplayMode(
                  e.target.value as "programme_results" | "team_standings",
                )
              }
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="programme_results">Programme Results</option>
              <option value="team_standings">Team Standings</option>
            </select>
            <p className="text-sm text-muted-foreground">
              How results appear on the public site.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="chestNumberPrefix">Chest Number Prefix</Label>
            <Input
              id="chestNumberPrefix"
              value={chestNumberPrefix}
              onChange={(e) => setChestNumberPrefix(e.target.value)}
              placeholder="AHL-"
            />
            <p className="text-sm text-muted-foreground">
              Prefix for auto-generated chest numbers (e.g., AHL-001).
            </p>
          </div>
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
