"use client";

import { Eye, Loader2, Pencil, Plus } from "lucide-react";
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
    type?: "INDIVIDUAL" | "GENERAL";
  };
  trigger?: React.ReactNode;
  readOnly?: boolean;
}

export function CategoryDialog({
  festivalId,
  category,
  trigger,
  readOnly,
}: CategoryDialogProps) {
  const [open, setOpen] = useState(false);
  const { createCategory, isCreating, updateCategory, isUpdating } =
    useCategories(festivalId);
  const isEditing = !!category;
  const isLoading = isCreating || isUpdating;

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    type: "INDIVIDUAL" | "GENERAL";
  }>({
    name: "",
    description: "",
    type: "INDIVIDUAL",
  });

  useEffect(() => {
    if (open && category) {
      setFormData({
        name: category.name || "",
        description: category.description || "",
        type: category.type || "INDIVIDUAL",
      });
    } else if (open && !category) {
      setFormData({ name: "", description: "", type: "INDIVIDUAL" });
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
        setFormData({ name: "", description: "", type: "INDIVIDUAL" });
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
            Create Category
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
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
              onValueChange={(value: "INDIVIDUAL" | "GENERAL") =>
                setFormData({ ...formData, type: value })
              }
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INDIVIDUAL">Individual</SelectItem>
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
