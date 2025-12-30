"use client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGroups } from "@/hooks/useGroups";
import { useParticipants } from "@/hooks/useParticipants";
import { Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";

interface GroupDialogProps {
  festivalId: string;
  group?: any;
  trigger?: React.ReactNode;
  readOnly?: boolean;
}

export function GroupDialog({
  festivalId,
  group,
  trigger,
  readOnly,
}: GroupDialogProps) {
  const [open, setOpen] = useState(false);
  const { createGroup, isCreating, updateGroup, isUpdating } =
    useGroups(festivalId);
  const { participants } = useParticipants(festivalId); // Fetch participants

  const isEditing = !!group;
  const isLoading = isCreating || isUpdating;

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

  // Derive group participants for UI
  const groupParticipants = isEditing
    ? participants.filter((p: any) => p.groupId === group.id)
    : [];

  useEffect(() => {
    if (open) {
      if (group) {
        // Find existing team leaders
        // We rely on participants list being loaded.
        // If participants are loading, this might set empty initially, but will update when participants change.
        const currentLeaders = participants
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
    // We add participants to dependency to ensure team leaders are set correctly if data loads after open
    // However, checking for user edits is tricky if we auto-update.
    // Ideally we only set initial state. But with Async data it's hard.
    // For now, let's assume if dialog JUST opened we set it.
    // But we need to handle "data arrival".
    // Let's stick to basic init. If participants load late, the user might see empty checkboxes then they appear checked?
    // Actually, if we depend on `participants`, it will overwrite user changes if they edit while fetching?
    // Participants fetch is usually fast and cached.
  }, [open, group, participants]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && group) {
        await updateGroup({
          id: group.id,
          data: {
            ...formData,
            seriesStart: Number(formData.seriesStart),
            teamLeaderIds: formData.teamLeaderIds,
          },
        });
      } else {
        await createGroup({
          ...formData, // teamLeaderIds ignored for create usually, or we can't assign yet
          seriesStart: Number(formData.seriesStart),
        });
      }
      setOpen(false);
      // Reset is handled by useEffect on next open
    } catch (error) {
      // Handled hook
    }
  };

  const toggleTeamLeader = (participantId: string) => {
    setFormData((prev) => {
      const isSelected = prev.teamLeaderIds.includes(participantId);
      if (isSelected) {
        return {
          ...prev,
          teamLeaderIds: prev.teamLeaderIds.filter(
            (id) => id !== participantId,
          ),
        };
      } else {
        // Limit to 2 team leaders? User said "Select one or two participants".
        // Let's allow flexible for now or maybe limit to 2?
        // "Select one or two participants from the group"
        if (prev.teamLeaderIds.length >= 2) {
          // Maybe show toasted warning or just don't add?
          // Let's just allow it for flexibility unless strict.
          return prev;
        }
        return {
          ...prev,
          teamLeaderIds: [...prev.teamLeaderIds, participantId],
        };
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Group
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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

          {!readOnly && isEditing && (
            <div className="space-y-2 border-t pt-4">
              <Label>Assign Team Leaders</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select up to 2 participants to be Team Leaders.
              </p>
              {groupParticipants.length === 0 ? (
                <div className="text-sm text-muted-foreground italic">
                  No participants in this group yet. Add participants first.
                </div>
              ) : (
                <div className="space-y-2 max-h-[150px] overflow-y-auto bg-muted/10 p-2 rounded border">
                  {groupParticipants.map((p: any) => (
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
                      {p.registrationNumber && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {p.registrationNumber}
                        </span>
                      )}
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
