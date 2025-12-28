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
import { useState } from "react";

interface CreateProgrammeDialogProps {
  festivalId: string;
}

export function CreateProgrammeDialog({
  festivalId,
}: CreateProgrammeDialogProps) {
  const [open, setOpen] = useState(false);
  const { createProgramme, isCreating } = useProgrammes(festivalId);
  const { categories } = useCategories(festivalId);

  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    type: "INDIVIDUAL",
    stageType: "STAGE",
    maxEntries: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProgramme(formData);
      setOpen(false);
      setFormData({
        name: "",
        categoryId: "",
        type: "INDIVIDUAL",
        stageType: "STAGE",
        maxEntries: 1,
      });
    } catch (error) {
      // Handled by hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Programme
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Programme</DialogTitle>
          <DialogDescription>
            Add a new programme to the festival.
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
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(val) => setFormData({ ...formData, type: val })}
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
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
