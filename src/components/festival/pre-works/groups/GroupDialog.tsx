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
import { useGroups } from "@/features/groups/hooks/use-groups";

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
  const setOpen =
    isControlled && setControlledOpen ? setControlledOpen : setInternalOpen;
  const { createGroup, isCreating, updateGroup, isUpdating } =
    useGroups(festivalId);

  const isEditing = !!group;
  const isLoading = isCreating || isUpdating;

  const [formData, setFormData] = useState<{
    name: string;
    seriesStart: number | string;
    color: string;
  }>({
    name: "",
    seriesStart: 100,
    color: "#2563eb",
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

  useEffect(() => {
    if (open) {
      if (group) {
        setFormData({
          name: group.name || "",
          seriesStart: group.seriesStart || 100,
          color: group.color || "#2563eb",
        });
      } else {
        // Pick random default color for new group
        const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
        setFormData({
          name: "",
          seriesStart: 100,
          color: randomColor,
        });
      }
    }
  }, [open, group]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && group) {
        await updateGroup({
          id: group.id,
          data: {
            ...formData,
            seriesStart: Number(formData.seriesStart),
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
      <DialogContent className="w-[calc(100%-2rem)] max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
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
