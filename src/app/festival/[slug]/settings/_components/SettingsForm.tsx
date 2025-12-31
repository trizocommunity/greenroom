"use client";

import { Loader2 } from "lucide-react";
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
import { updateFestivalDeadlinesAction } from "@/server/actions/festival.actions";

interface SettingsFormProps {
  festival: any;
}

export function SettingsForm({ festival }: SettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [deadlines, setDeadlines] = useState({
    studentCreationDeadline: festival.studentCreationDeadline
      ? new Date(festival.studentCreationDeadline).toISOString().slice(0, 16)
      : "",
    programmeAssignmentDeadline: festival.programmeAssignmentDeadline
      ? new Date(festival.programmeAssignmentDeadline)
          .toISOString()
          .slice(0, 16)
      : "",
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await updateFestivalDeadlinesAction(festival.id, {
        studentCreationDeadline: deadlines.studentCreationDeadline || null,
        programmeAssignmentDeadline:
          deadlines.programmeAssignmentDeadline || null,
      });

      if (res.success) {
        toast.success("Deadlines updated successfully");
      } else {
        toast.error("Failed to update deadlines");
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
        <CardTitle>Deadlines & Access Control</CardTitle>
        <CardDescription>
          Set sensitive deadlines. After these dates, Team Leaders will have
          Read-Only access.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="studentCreation">Student Creation Deadline</Label>
            <Input
              id="studentCreation"
              type="datetime-local"
              value={deadlines.studentCreationDeadline}
              onChange={(e) =>
                setDeadlines({
                  ...deadlines,
                  studentCreationDeadline: e.target.value,
                })
              }
            />
            <p className="text-sm text-muted-foreground">
              Team Leaders cannot create new students after this time.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="programmeAssignment">
              Programme Assignment Deadline
            </Label>
            <Input
              id="programmeAssignment"
              type="datetime-local"
              value={deadlines.programmeAssignmentDeadline}
              onChange={(e) =>
                setDeadlines({
                  ...deadlines,
                  programmeAssignmentDeadline: e.target.value,
                })
              }
            />
            <p className="text-sm text-muted-foreground">
              Team Leaders cannot assign students to programmes after this time.
            </p>
          </div>

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
