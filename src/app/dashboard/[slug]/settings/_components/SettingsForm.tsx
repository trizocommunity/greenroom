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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    scoringSystem: festival.scoringSystem || "POSITION_BASED",
    maxResultScore:
      festival.maxResultScore != null
        ? String(festival.maxResultScore)
        : "10",
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
        scoringSystem: formData.scoringSystem as
          | "POSITION_BASED"
          | "SCORE_BASED",
        maxResultScore:
          formData.maxResultScore != null && formData.maxResultScore !== ""
            ? (() => {
                const n = parseInt(formData.maxResultScore, 10);
                return Number.isNaN(n) ? null : n;
              })()
            : null,
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
    <Card>
      <CardHeader>
        <CardTitle>Festival Configuration</CardTitle>
        <CardDescription>
          Manage dates, deadlines, and access controls.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid gap-2">
            <Label htmlFor="scoringSystem">Scoring System</Label>
            <div className="p-4 border rounded-lg space-y-4">
              <Select
                value={formData.scoringSystem}
                onValueChange={(value) =>
                  setFormData({ ...formData, scoringSystem: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Scoring System" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POSITION_BASED">
                    Position Based (Traditional)
                  </SelectItem>
                  <SelectItem value="SCORE_BASED">
                    Score Based (Points = Score)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {formData.scoringSystem === "POSITION_BASED"
                  ? "Points are awarded based on rank: 1st Place (10pts), 2nd (7pts), 3rd (5pts). Grade is always out of 10."
                  : "Points are equal to the judge's score. Set max score below so grades are calculated as a percentage (e.g. 80/80 = A+, 60/80 = B+)."}
              </p>
              {formData.scoringSystem === "SCORE_BASED" && (
                <div className="grid gap-2 pt-2">
                  <Label htmlFor="maxResultScore">
                    Max score (for grading)
                  </Label>
                  <Input
                    id="maxResultScore"
                    type="number"
                    min={1}
                    max={1000}
                    placeholder="10"
                    value={formData.maxResultScore}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxResultScore: e.target.value,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Judge enters scores from 0 to this value. Grade = (score ÷
                    max) × 100. E.g. max 80 → 80/80 = A+, 60/80 = B+, 29/80 =
                    C.
                  </p>
                </div>
              )}
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

          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
