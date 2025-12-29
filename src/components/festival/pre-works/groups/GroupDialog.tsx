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
    type: "SCHOOL",
    seriesStart: 100,
  });

  useEffect(() => {
    if (open && group) {
      setFormData({
        name: group.name || "",
        type: group.type || "SCHOOL",
        seriesStart: group.seriesStart || 100,
      });
    } else if (open && !group) {
      setFormData({ name: "", type: "SCHOOL", seriesStart: 100 });
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
      if (!isEditing)
        setFormData({ name: "", type: "SCHOOL", seriesStart: 100 });
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
            <Label htmlFor="seriesStart">Series Start</Label>
            <Input
              id="seriesStart"
              type="number"
              required
              value={formData.seriesStart}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  seriesStart: Number(e.target.value),
                })
              }
              placeholder="e.g. 100"
              disabled={readOnly}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select
              value={formData.type}
              onValueChange={(val) => setFormData({ ...formData, type: val })}
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SCHOOL">School</SelectItem>
                <SelectItem value="COLLEGE">College</SelectItem>
                <SelectItem value="MADRASA">Madrasa</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
              </SelectContent>
            </Select>
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
