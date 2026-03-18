"use client";

import { Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
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
import { useFeature } from "@/hooks/useFeature";
import { useGroups } from "@/hooks/useGroups";
import { useStudents } from "@/hooks/useStudents";

interface GroupDialogProps {
  festivalId: string;
  group?: any;
  trigger?: React.ReactNode;
  readOnly?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function GroupDialog({
  festivalId,
  group,
  trigger,
  readOnly,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: GroupDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled && setControlledOpen ? setControlledOpen : setInternalOpen;
  const { createGroup, isCreating, updateGroup, isUpdating } =
    useGroups(festivalId);
  const { students } = useStudents(festivalId); // Fetch students

  const isEditing = !!group;
  const isLoading = isCreating || isUpdating;
  const canAssignTeamLeaders = useFeature("members");

  const [formData, setFormData] = useState<{
    name: string;
    seriesStart: number | string;
    color: string;
    teamLeaderIds: string[];
  }>({
    name: "",
    seriesStart: 100,
    color: "#2563eb",
    teamLeaderIds: [],
  });

  const COLORS = [
    "#ef4444", // Red
    "#f97316", // Orange
    "#f59e0b", // Amber
    "#84cc16", // Lime
    "#10b981", // Emerald
    "#06b6d4", // Cyan
    "#3b82f6", // Blue
    "#6366f1", // Indigo
    "#8b5cf6", // Violet
    "#ec4899", // Pink
  ];

  // Derive group students for UI
  const groupStudents = isEditing
    ? students.filter((p: any) => p.groupId === group.id)
    : [];

  useEffect(() => {
    if (open) {
      if (group) {
        // Find existing team leaders
        // We rely on students list being loaded.
        const currentLeaders = students
          .filter((p: any) => p.groupId === group.id && p.isTeamLeader)
          .map((p: any) => p.id);

        setFormData({
          name: group.name || "",
          seriesStart: group.seriesStart || 100,
          color: group.color || "#2563eb",
          teamLeaderIds: currentLeaders,
        });
      } else {
        // Pick random default color for new group
        const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
        setFormData({
          name: "",
          seriesStart: 100,
          color: randomColor,
          teamLeaderIds: [],
        });
      }
    }
  }, [open, group, students]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && group) {
        await updateGroup({
          id: group.id,
          data: {
            ...formData,
            seriesStart: Number(formData.seriesStart),
            teamLeaderIds: canAssignTeamLeaders
              ? formData.teamLeaderIds
              : undefined,
          },
        });
      } else {
        await createGroup({
          name: formData.name,
          seriesStart: Number(formData.seriesStart),
          color: formData.color,
        });
      }
      setOpen(false);
    } catch (error) {
      // Handled hook
    }
  };

  const toggleTeamLeader = (studentId: string) => {
    if (!canAssignTeamLeaders) return;
    setFormData((prev) => {
      const isSelected = prev.teamLeaderIds.includes(studentId);
      if (isSelected) {
        return {
          ...prev,
          teamLeaderIds: prev.teamLeaderIds.filter((id) => id !== studentId),
        };
      } else {
        if (prev.teamLeaderIds.length >= 2) {
          return prev;
        }
        return {
          ...prev,
          teamLeaderIds: [...prev.teamLeaderIds, studentId],
        };
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Group
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="w-[calc(100%-2rem)] max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>
            {readOnly
              ? "Group Details"
              : isEditing
                ? "Edit Group"
                : "Create Group"}
          </DialogTitle>
          <DialogDescription>
            {readOnly
              ? "View group details."
              : isEditing
                ? "Update group details."
                : "Add a new group (School/College)."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g. Model School"
              disabled={readOnly}
            />
          </div>

          <div className="space-y-2">
            <Label>Group Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  disabled={readOnly}
                  onClick={() => setFormData({ ...formData, color: c })}
                  className={`h-8 w-8 rounded-full border-2 transition-all ${
                    formData.color === c
                      ? "border-primary scale-110 shadow-sm"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>

          {!readOnly && isEditing && canAssignTeamLeaders && (
            <div className="space-y-2 border-t pt-4">
              <Label>Assign Team Leaders</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select up to 2 students to be Team Leaders.
              </p>
              {groupStudents.length === 0 ? (
                <div className="text-sm text-muted-foreground italic">
                  No students in this group yet. Add students first.
                </div>
              ) : (
                <div className="space-y-2 max-h-[150px] overflow-y-auto bg-muted/10 p-2 rounded border">
                  {groupStudents.map((p: any) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={formData.teamLeaderIds.includes(p.id)}
                        onChange={() => toggleTeamLeader(p.id)}
                        disabled={
                          !formData.teamLeaderIds.includes(p.id) &&
                          formData.teamLeaderIds.length >= 2
                        }
                      />
                      <span className="flex-1">{p.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              {readOnly ? "Close" : "Cancel"}
            </Button>
            {!readOnly && (
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Save Changes" : "Create"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
