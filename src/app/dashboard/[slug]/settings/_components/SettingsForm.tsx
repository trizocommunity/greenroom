"use client";

import { format } from "date-fns";
import { Loader2, Lock } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DateTimePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateFestivalSettingsAction } from "@/features/festivals/actions/festival-crud.actions";
import { useFestivalReadOnly } from "@/features/festivals/hooks/use-festival-read-only";
import { FeatureService } from "@/features/plan-features/services/features";
import { getResolvedTier } from "@/features/plan-features/services/tier";

interface SettingsFormProps {
  festival: any;
}

export function SettingsForm({ festival }: SettingsFormProps) {
  const { isReadOnly } = useFestivalReadOnly();
  const resolvedTier = getResolvedTier(festival.tier);
  const [isLoading, setIsLoading] = useState(false);
  // "Duration starts" for presets: the plan window starts when the festival is created.
  // (Used to keep presets within [durationStart, festival.startDate).)
  const [durationStart] = useState(() => {
    const createdAt = festival?.createdAt ? new Date(festival.createdAt) : null;
    return createdAt && !Number.isNaN(createdAt.getTime())
      ? createdAt
      : new Date();
  });
  const [nowAtPageOpen] = useState(() => new Date());
  const [formData, setFormData] = useState({
    programmeAssignmentDeadline: festival.programmeAssignmentDeadline
      ? new Date(festival.programmeAssignmentDeadline)
          .toISOString()
          .slice(0, 16)
      : "",
    teamLeaderLimit: Number(festival.teamLeaderLimit ?? 2),
  });

  const festivalStartDate = useMemo(() => {
    if (!festival?.startDate) return null;
    const d = new Date(festival.startDate);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [festival?.startDate]);

  const festivalHasStarted = useMemo(() => {
    if (!festivalStartDate) return false;
    // Disallow setting/changing deadlines once the festival start time has passed.
    return nowAtPageOpen >= festivalStartDate;
  }, [festivalStartDate, nowAtPageOpen]);

  const ensureDeadlineInRange = (next: Date): Date | null => {
    if (next < durationStart) {
      toast.error(
        `Deadline must be after the active start time (${format(durationStart, "MMM d, HH:mm")}).`,
      );
      return null;
    }

    if (festivalStartDate && next >= festivalStartDate) {
      toast.error(
        `Deadline must be before festival start (${format(festivalStartDate, "MMM d, HH:mm")}).`,
      );
      return null;
    }

    return next;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await updateFestivalSettingsAction(festival.id, {
        programmeAssignmentDeadline:
          formData.programmeAssignmentDeadline || null,
        teamLeaderLimit: formData.teamLeaderLimit,
      });

      if (res.success) {
        toast.success("Settings updated successfully");
      } else {
        toast.error("Failed to update settings");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-lg sm:text-xl">
          Festival Configuration
        </CardTitle>
        <CardDescription>Manage deadlines and access controls.</CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        <form onSubmit={handleSave} className="space-y-6">
          {FeatureService.isFeatureEnabled(
            getResolvedTier(festival.tier),
            "programmeAssignmentDeadline",
          ) && (
            <div className="grid gap-2">
              <Label htmlFor="programmeAssignment">
                Programme Assignment Deadline
              </Label>
              <DateTimePicker
                id="programmeAssignment"
                value={
                  formData.programmeAssignmentDeadline
                    ? new Date(formData.programmeAssignmentDeadline)
                    : null
                }
                onChange={(value) => {
                  if (!value) {
                    setFormData({
                      ...formData,
                      programmeAssignmentDeadline: "",
                    });
                    return;
                  }

                  if (festivalHasStarted) return;

                  const validated = ensureDeadlineInRange(value);
                  if (!validated) return;

                  setFormData({
                    ...formData,
                    programmeAssignmentDeadline: validated
                      .toISOString()
                      .slice(0, 16),
                  });
                }}
                placeholder="Pick deadline"
                from={durationStart}
                to={festivalStartDate ?? undefined}
                disabled={festivalHasStarted || isReadOnly}
              />
              <p className="text-sm text-muted-foreground">
                Team Leaders cannot assign students to programmes after this
                time.
              </p>
              {festivalStartDate && (
                <p className="text-xs text-muted-foreground">
                  Deadline must be between{" "}
                  <span className="font-medium text-foreground">
                    {format(durationStart, "MMM d, HH:mm")}
                  </span>{" "}
                  and{" "}
                  <span className="font-medium text-foreground">
                    {format(festivalStartDate, "MMM d, HH:mm")}
                  </span>{" "}
                  (before festival start).
                </p>
              )}
            </div>
          )}

          {resolvedTier !== "BASIC" && (
            <div className="grid gap-2">
              <Label htmlFor="teamLeaderLimit">
                Team Leader Limit Per Group
              </Label>
              <Input
                id="teamLeaderLimit"
                type="number"
                min={1}
                max={10}
                step={1}
                value={formData.teamLeaderLimit}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setFormData({
                    ...formData,
                    teamLeaderLimit: Number.isFinite(next)
                      ? Math.max(1, Math.min(10, next))
                      : 2,
                  });
                }}
                disabled={isReadOnly}
              />
              <p className="text-sm text-muted-foreground">
                Maximum number of team leaders allowed per group.
              </p>
            </div>
          )}

          {FeatureService.isFeatureEnabled(
            getResolvedTier(festival.tier),
            "advancedSettings",
          ) && (
            <div className="rounded-lg border border-dashed p-4 space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                Advanced settings
              </h4>
              <p className="text-sm text-muted-foreground">
                Additional options for your plan. More advanced controls may be
                added here.
              </p>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              type="submit"
              disabled={isLoading || isReadOnly}
              className="w-full sm:w-auto"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
