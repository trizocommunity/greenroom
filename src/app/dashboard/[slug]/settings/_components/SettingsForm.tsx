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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FeatureService } from "@/lib/features";
import { getResolvedTier } from "@/lib/tier";
import { updateFestivalSettingsAction } from "@/server/actions/festival.actions";

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
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
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
              <Input
                id="programmeAssignment"
                type="datetime-local"
                value={formData.programmeAssignmentDeadline}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    programmeAssignmentDeadline: e.target.value,
                  })
                }
              />
              <p className="text-sm text-muted-foreground">
                Team Leaders cannot assign students to programmes after this
                time.
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
