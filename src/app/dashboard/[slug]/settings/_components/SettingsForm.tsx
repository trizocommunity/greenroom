"use client";

import { Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { FeatureService } from "@/lib/features";
import { getResolvedTier } from "@/lib/tier";
import { updateFestivalSettingsAction } from "@/server/actions/festival.actions";
import { DatePicker, DateTimePicker } from "@/components/ui/date-picker";

interface SettingsFormProps {
  festival: any;
}

export function SettingsForm({ festival }: SettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    programmeAssignmentDeadline: festival.programmeAssignmentDeadline
      ? new Date(festival.programmeAssignmentDeadline)
          .toISOString()
          .slice(0, 16)
      : "",
    startDate: festival.startDate
      ? new Date(festival.startDate).toISOString().slice(0, 10)
      : "",
    endDate: festival.endDate
      ? new Date(festival.endDate).toISOString().slice(0, 10)
      : "",
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await updateFestivalSettingsAction(festival.id, {
        programmeAssignmentDeadline:
          formData.programmeAssignmentDeadline || null,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
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
        <CardTitle className="text-lg sm:text-xl">Festival Configuration</CardTitle>
        <CardDescription>
          Manage dates, deadlines, and access controls.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startDate">Start Date</Label>
              <DatePicker
                id="startDate"
                date={formData.startDate ? new Date(formData.startDate) : undefined}
                onChange={(date) =>
                  setFormData({
                    ...formData,
                    startDate: date ? date.toISOString().slice(0, 10) : "",
                  })
                }
                placeholder="Pick start date"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endDate">End Date</Label>
              <DatePicker
                id="endDate"
                date={formData.endDate ? new Date(formData.endDate) : undefined}
                onChange={(date) =>
                  setFormData({
                    ...formData,
                    endDate: date ? date.toISOString().slice(0, 10) : "",
                  })
                }
                placeholder="Pick end date"
              />
            </div>
          </div>

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
                onChange={(value) =>
                  setFormData({
                    ...formData,
                    programmeAssignmentDeadline: value
                      ? value.toISOString().slice(0, 16)
                      : "",
                  })
                }
                placeholder="Pick deadline"
              />
              <p className="text-sm text-muted-foreground">
                Team Leaders cannot assign students to programmes after this
                time.
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
                Additional options for your plan. More advanced controls may be added here.
              </p>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
