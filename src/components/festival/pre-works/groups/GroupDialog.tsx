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
  const isEditing = !!group;
  const isLoading = isCreating || isUpdating;

  const [formData, setFormData] = useState({
    name: "",
    seriesStart: 100,
    color: "#2563eb",
  });

  const COLORS = [
    "#ef4444", // Red
    "#f97316", // Orange
    "#f599e0b", // Amber
    "#84cc16", // Lime
    "#10b981", // Emerald
    "#06b6d4", // Cyan
    "#3b82f6", // Blue
    "#6366f1", // Indigo
    "#8b5cf6", // Violet
    "#ec4899", // Pink
  ];

  useEffect(() => {
    if (open && group) {
      setFormData({
        name: group.name || "",
        seriesStart: group.seriesStart || 100,
        color: group.color || "#2563eb",
      });
    } else if (open && !group) {
      // Pick random default color for new group
      const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
      setFormData({ name: "", seriesStart: 100, color: randomColor });
    }
  }, [open, group]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && group) {
        await updateGroup({
          id: group.id,
          data: { ...formData, seriesStart: Number(formData.seriesStart) },
        });
      } else {
        await createGroup({
          ...formData,
          seriesStart: Number(formData.seriesStart),
        });
      }
      setOpen(false);
      // Reset is handled by useEffect on next open
    } catch (error) {
      // Handled hook
    }
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
      <DialogContent>
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
