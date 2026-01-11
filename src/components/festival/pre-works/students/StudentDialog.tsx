"use client";

import { Hash, Loader2, Plus, RefreshCw, Tag, User, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
import { useCategories } from "@/hooks/useCategories";
import { useGroups } from "@/hooks/useGroups";
import { useStudents } from "@/hooks/useStudents";
import { cn } from "@/lib/utils";

interface StudentDialogProps {
  festivalId: string;
  trigger?: React.ReactNode;
  studentToEdit?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    gender?: "MALE" | "FEMALE" | "OTHER";
    group: { id: string; name: string };
    category: { id: string; name: string };

    age?: number;
    standard?: string;
  };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function StudentDialog({
  festivalId,
  trigger,
  studentToEdit,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: StudentDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen =
    isControlled && setControlledOpen ? setControlledOpen : setInternalOpen;

  const isEditing = !!studentToEdit;
  const { groups } = useGroups(festivalId);
  const { categories } = useCategories(festivalId);
  const { createStudent, updateStudent } = useStudents(festivalId);

  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    groupId: "",
    categoryId: "" as string,
    gender: "MALE" as "MALE" | "FEMALE" | "OTHER",
    age: undefined as number | undefined,
    standard: "" as string | undefined,
  });

  // Derived State
  const readOnly = false; // Add Student is always editable for implemented fields
  const isValid = formData.name && formData.groupId && formData.categoryId;

  // Initialize form when editing or opening
  useEffect(() => {
    if (open) {
      if (studentToEdit) {
        setFormData({
          name: studentToEdit.name,
          email: studentToEdit.email || "",
          groupId: studentToEdit.group.id,
          categoryId: studentToEdit.category.id,
          gender: studentToEdit.gender || "MALE",
          age: studentToEdit.age,
          standard: studentToEdit.standard,
        });
      } else {
        // Reset for new entry
        setFormData({
          name: "",
          email: "",
          groupId: "",
          categoryId: "" as string,
          gender: "MALE",
          age: undefined,
          standard: "",
        });
      }
    }
  }, [open, studentToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsLoading(true);
    try {
      if (isEditing && studentToEdit) {
        await updateStudent({
          id: studentToEdit.id,
          data: {
            name: formData.name,
            email: formData.email || undefined,
            groupId: formData.groupId,
            categoryId: formData.categoryId,
            gender: formData.gender,
            age: formData.age,
            standard: formData.standard,
          },
        });
        toast.success("Student updated successfully");
      } else {
        await createStudent({
          name: formData.name,
          email: formData.email || undefined,
          groupId: formData.groupId,
          categoryId: formData.categoryId,
          gender: formData.gender,
          age: formData.age,
          standard: formData.standard || undefined,
        });
        // Success toast handled by hook/query usually, but adding redundant safety
        toast.success("Student added successfully");
      }
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(
        isEditing ? "Failed to update student" : "Failed to create student",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Filter Categories: Only allow "SINGLE" type categories for individual students
  const allowedCategories = categories.filter((c) => c.type === "SINGLE");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden sm:rounded-2xl border-none shadow-2xl">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col h-full min-h-0 bg-background/95 backdrop-blur-sm"
        >
          {/* Header */}
          <DialogHeader className="px-8 py-6 border-b bg-muted/20 flex-shrink-0">
            <DialogTitle className="text-2xl font-semibold tracking-tight">
              {readOnly
                ? "Student Details"
                : isEditing
                  ? "Edit Student"
                  : "Add Student"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground/80">
              {readOnly
                ? "View student information."
                : "Enter the details below."}
            </DialogDescription>
          </DialogHeader>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8 min-h-0">
            {!isEditing && groups.length === 0 && (
              <div className="bg-destructive/10 text-destructive p-4 rounded-xl mb-4 text-sm font-medium flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Please create
                groups first.
              </div>
            )}

            {/* Personal Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="name"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. Jane Doe"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  autoFocus={!isEditing}
                  className="h-10 text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="age"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    Age
                  </Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="e.g. 18"
                    value={formData.age || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        age: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="standard"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    Class/Standard
                  </Label>
                  <Input
                    id="standard"
                    placeholder="e.g. 12-A"
                    value={formData.standard || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, standard: e.target.value })
                    }
                    className="h-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Gender
                </Label>
                <div className="flex flex-wrap gap-2">
                  {["MALE", "FEMALE", "OTHER"].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, gender: g as any })
                      }
                      className={cn(
                        "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border",
                        formData.gender === g
                          ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105"
                          : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:bg-muted/50",
                      )}
                    >
                      {g.charAt(0) + g.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Email (Optional)
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jane@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="h-10"
                />
              </div>
            </div>

            {/* Group & Category */}
            <div className="grid gap-6 sm:grid-cols-1">
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Users className="h-3 w-3" /> Group{" "}
                  <span className="text-destructive">*</span>
                </Label>
                {groups.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {groups.map((group) => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, groupId: group.id })
                        }
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-sm transition-all border",
                          formData.groupId === group.id
                            ? "bg-indigo-500 text-white border-indigo-600 shadow-md font-medium"
                            : "bg-surface text-muted-foreground border-border hover:border-indigo-200 hover:bg-indigo-50/50",
                        )}
                      >
                        {group.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No groups found.
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Tag className="h-3 w-3" /> Category{" "}
                  <span className="text-destructive">*</span>
                </Label>
                {allowedCategories.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {allowedCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, categoryId: cat.id })
                        }
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-sm transition-all border",
                          formData.categoryId === cat.id
                            ? "bg-rose-500 text-white border-rose-600 shadow-md font-medium"
                            : "bg-surface text-muted-foreground border-border hover:border-rose-200 hover:bg-rose-50/50",
                        )}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No individual categories found.
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="px-8 py-6 border-t bg-muted/10 flex-shrink-0">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setOpen(false)}
              className="hover:bg-muted/50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isLoading}
              className="min-w-[120px] rounded-full shadow-lg hover:shadow-xl transition-all"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Add Student"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
