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
import { useCategories } from "@/hooks/useCategories";
import { useProgrammes } from "@/hooks/useProgrammes";
import { Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";

interface ProgrammeDialogProps {
  festivalId: string;
  programme?: any;
  trigger?: React.ReactNode;
  readOnly?: boolean;
}

export function ProgrammeDialog({
  festivalId,
  programme,
  trigger,
  readOnly = false,
}: ProgrammeDialogProps) {
  const [open, setOpen] = useState(false);
  const { createProgramme, isCreating, updateProgramme, isUpdating } =
    useProgrammes(festivalId);
  const { categories } = useCategories(festivalId);

  const isEditing = !!programme;
  const isLoading = isCreating || isUpdating;

  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    type: "INDIVIDUAL",
    stageType: "STAGE",
    maxEntries: 1,
  });

  useEffect(() => {
    if (open && programme) {
      setFormData({
        name: programme.name || "",
        categoryId: programme.categoryId || "",
        type: programme.type || "INDIVIDUAL",
        stageType: programme.stageType || "STAGE",
        maxEntries: programme.maxEntries || 1,
      });
    } else if (open && !programme) {
      setFormData({
        name: "",
        categoryId: "",
        type: "INDIVIDUAL",
        stageType: "STAGE",
        maxEntries: 1,
      });
    }
  }, [open, programme]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    try {
      if (isEditing && programme) {
        await updateProgramme({ id: programme.id, data: formData });
      } else {
        await createProgramme(formData);
      }
      setOpen(false);
      if (!isEditing) {
        setFormData({
          name: "",
          categoryId: "",
          type: "INDIVIDUAL",
          stageType: "STAGE",
          maxEntries: 1,
        });
      }
    } catch (error) {
      // Handled by hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Programme
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {readOnly
              ? "Programme Details"
              : isEditing
                ? "Edit Programme"
                : "Create Programme"}
          </DialogTitle>
          <DialogDescription>
            {readOnly
              ? "View programme details."
              : isEditing
                ? "Update programme details."
                : "Add a new programme."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              required
              value={formData.categoryId}
              onValueChange={(val) =>
                setFormData({ ...formData, categoryId: val })
              }
              disabled={readOnly || isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat: any) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Programme Name</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g. Recitation"
              disabled={readOnly || isLoading}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(val) => setFormData({ ...formData, type: val })}
                disabled={readOnly || isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                  <SelectItem value="GROUP">Group</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stageType">Stage Type</Label>
              <Select
                value={formData.stageType}
                onValueChange={(val) =>
                  setFormData({ ...formData, stageType: val })
                }
                disabled={readOnly || isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STAGE">Stage</SelectItem>
                  <SelectItem value="NON_STAGE">Non-Stage</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxEntries">Max Entries (per Group)</Label>
            <Input
              id="maxEntries"
              type="number"
              min={1}
              required
              value={formData.maxEntries}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  maxEntries: parseInt(e.target.value, 10),
                })
              }
              disabled={readOnly || isLoading}
            />
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
