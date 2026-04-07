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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories } from "@/hooks/useCategories";

interface CategoryDialogProps {
  festivalId: string;
  category?: {
    id: string;
    name: string;
    description?: string | null;
    type?: "SINGLE" | "GENERAL";
  };
  trigger?: React.ReactNode;
  readOnly?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CategoryDialog({
  festivalId,
  category,
  trigger,
  readOnly,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: CategoryDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen =
    isControlled && setControlledOpen ? setControlledOpen : setInternalOpen;
  const { createCategory, isCreating, updateCategory, isUpdating } =
    useCategories(festivalId);
  const isEditing = !!category;
  const isLoading = isCreating || isUpdating;

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    type: "SINGLE" | "GENERAL";
  }>({
    name: "",
    description: "",
    type: "SINGLE",
  });

  useEffect(() => {
    if (open && category) {
      setFormData({
        name: category.name || "",
        description: category.description || "",
        type: (category.type as "SINGLE" | "GENERAL") || "SINGLE",
      });
    } else if (open && !category) {
      setFormData({ name: "", description: "", type: "SINGLE" });
    }
  }, [open, category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && category) {
        await updateCategory({ id: category.id, data: formData });
      } else {
        await createCategory(formData);
      }
      setOpen(false);
      if (!isEditing)
        setFormData({ name: "", description: "", type: "SINGLE" });
    } catch (error) {
      // Handled by hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Category
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="w-[calc(100%-2rem)] max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>
            {readOnly
              ? "Category Details"
              : isEditing
                ? "Edit Category"
                : "Create Category"}
          </DialogTitle>
          <DialogDescription>
            {readOnly
              ? "View category details."
              : isEditing
                ? "Update category details."
                : "Add a new category."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Category Name</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g. Juniors"
              disabled={readOnly}
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value: "SINGLE" | "GENERAL") =>
                setFormData({ ...formData, type: value })
              }
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SINGLE">Single</SelectItem>
                <SelectItem value="GENERAL">General</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="e.g. For students below 12 years"
              disabled={readOnly}
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
