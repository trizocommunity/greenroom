"use client";

import { Check, Hash, Loader2, Plus, User, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useCategories } from "@/hooks/useCategories";
import { useGroups } from "@/hooks/useGroups";
import { useStudents } from "@/hooks/useStudents";
import { cn } from "@/lib/utils";

interface StudentDialogProps {
  festivalId: string;
  student?: any;
  trigger?: React.ReactNode;
  readOnly?: boolean;
}

export function StudentDialog({
  festivalId,
  student,
  trigger,
  readOnly = false,
}: StudentDialogProps) {
  const [open, setOpen] = useState(false);
  const { createStudent, isCreating, updateStudent, isUpdating } =
    useStudents(festivalId);
  const { groups } = useGroups(festivalId);
  const { categories } = useCategories(festivalId);

  const isEditing = !!student;
  const isLoading = isCreating || isUpdating;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    groupId: "",
    categoryId: "",
    gender: "MALE",
    registrationNumber: "",
  });

  const [autoGenerateId, setAutoGenerateId] = useState(true);

  // Filter categories to only show INDIVIDUAL type for creation/editing
  const individualCategories = categories.filter(
    (c: any) => c.type === "INDIVIDUAL",
  );

  useEffect(() => {
    if (open) {
      if (student) {
        setFormData({
          name: student.name || "",
          email: student.email || "",
          phone: student.phone || "",
          groupId: student.groupId || "",
          categoryId: student.categoryId || "",
          gender: student.gender || "MALE",
          registrationNumber: student.registrationNumber || "",
        });
        setAutoGenerateId(!student.registrationNumber);
      } else {
        // Create Mode
        setFormData({
          name: "",
          email: "",
          phone: "",
          groupId: groups.length === 1 ? groups[0].id : "",
          categoryId: "",
          gender: "MALE",
          registrationNumber: "",
        });
        setAutoGenerateId(true);
      }
    }
  }, [open, student, groups]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    if (!formData.groupId || !formData.categoryId) return;

    try {
      const dataToSubmit = {
        ...formData,
        registrationNumber: autoGenerateId ? "" : formData.registrationNumber,
      };

      if (isEditing && student) {
        await updateStudent({ id: student.id, data: dataToSubmit });
      } else {
        await createStudent(dataToSubmit);
      }
      setOpen(false);
    } catch (error) {
      // Handled by hook
    }
  };

  const handleGroupSelect = (id: string) => {
    if (readOnly) return;
    setFormData({ ...formData, groupId: id });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button disabled={readOnly}>
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-xl flex items-center gap-2">
            {readOnly ? (
              <User className="h-5 w-5 text-muted-foreground" />
            ) : isEditing ? (
              <User className="h-5 w-5 text-primary" />
            ) : (
              <Plus className="h-5 w-5 text-primary" />
            )}
            {readOnly ? "Student Details" : isEditing ? "Edit Student" : "Add Student"}
          </DialogTitle>
          <DialogDescription>
            {readOnly
              ? "View full student information and allocation."
              : "Enter details and assign this student to a group and category."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-hidden flex flex-col"
        >
          <ScrollArea className="flex-1 p-6">
            <fieldset
              disabled={readOnly}
              className="grid md:grid-cols-2 gap-8 group-disabled:opacity-100"
            >
              {/* LEFT COLUMN: Personal Info */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <User className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-lg tracking-tight">
                    Personal Information
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs font-bold uppercase text-muted-foreground">
                      Full Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="e.g. Jane Doe"
                      className="h-10 text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Gender</Label>
                    <div className="flex flex-wrap gap-2">
                      {["MALE", "FEMALE", "OTHER"].map((gender) => (
                        <button
                          type="button"
                          key={gender}
                          onClick={() =>
                            !readOnly && setFormData({ ...formData, gender })
                          }
                          className={cn(
                            "flex-1 px-3 py-2 rounded-md border text-sm font-medium transition-all flex items-center justify-center gap-2",
                            formData.gender === gender
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background hover:bg-muted text-muted-foreground",
                            readOnly && "cursor-default opacity-80",
                          )}
                          disabled={readOnly}
                        >
                          {gender.charAt(0) + gender.slice(1).toLowerCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs font-bold uppercase text-muted-foreground">
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        placeholder="john@example.com"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-xs font-bold uppercase text-muted-foreground">
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        placeholder="+91..."
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Allocation */}
              <div className="space-y-6">
                 {/* Mobile Divider */}
                 <Separator className="md:hidden" />
                 
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-600">
                    <Users className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-lg tracking-tight">
                    Festival Allocation
                  </h3>
                </div>

                <div className="space-y-5">
                   {/* Group Selection */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">
                      Assign Group <span className="text-destructive">*</span>
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {groups.map((group: any) => (
                        <button
                          type="button"
                          key={group.id}
                          onClick={() => handleGroupSelect(group.id)}
                          className={cn(
                            "relative overflow-hidden cursor-pointer p-3 rounded-lg border text-sm transition-all flex items-center gap-3 hover:border-primary/40 text-left",
                            formData.groupId === group.id
                              ? "bg-primary/5 border-primary ring-1 ring-primary"
                              : "bg-background text-muted-foreground",
                            readOnly && "cursor-default opacity-80",
                          )}
                          disabled={readOnly}
                        >
                           <div 
                              className="absolute left-0 top-0 bottom-0 w-1" 
                              style={{ backgroundColor: group.color || "#2563eb" }} 
                           />
                           <span className="font-semibold text-foreground truncate pl-1">{group.name}</span>
                        </button>
                      ))}
                      {groups.length === 0 && (
                        <p className="text-sm text-destructive font-medium border border-destructive/20 bg-destructive/5 p-2 rounded-md">
                          No groups found. Please create groups first.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Category Selection */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">
                      Assign Category <span className="text-destructive">*</span>
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {individualCategories.map((cat: any) => (
                        <button
                          type="button"
                          key={cat.id}
                          onClick={() =>
                            !readOnly &&
                            setFormData({ ...formData, categoryId: cat.id })
                          }
                          className={cn(
                            "cursor-pointer p-2 px-3 rounded-lg border text-sm transition-all flex flex-col items-start gap-1 hover:border-primary/40 text-left h-full",
                            formData.categoryId === cat.id
                              ? "bg-primary/5 border-primary ring-1 ring-primary"
                              : "bg-background text-muted-foreground",
                            readOnly && "cursor-default opacity-80",
                          )}
                          disabled={readOnly}
                        >
                          <div className="flex w-full justify-between items-center">
                             <span className="font-semibold text-foreground">{cat.name}</span>
                             <Badge variant="secondary" className="text-[10px] h-4 px-1">{cat.code}</Badge>
                          </div>
                        </button>
                      ))}
                      {individualCategories.length === 0 && (
                        <p className="text-sm text-destructive font-medium border border-destructive/20 bg-destructive/5 p-2 rounded-md col-span-full">
                          No individual categories found.
                        </p>
                      )}
                    </div>
                  </div>

                   <Separator />

                  {/* Reg Number */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <Label htmlFor="auto-id" className="text-sm font-medium cursor-pointer">Auto-generate Student ID</Label>
                          {autoGenerateId && <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-600 border-emerald-200">Recommended</Badge>}
                       </div>
                       <Switch 
                          id="auto-id" 
                          checked={autoGenerateId} 
                          onCheckedChange={setAutoGenerateId}
                          disabled={readOnly}
                       />
                    </div>
                    
                    {!autoGenerateId && (
                      <div className="animate-in fade-in slide-in-from-top-2">
                         <Label htmlFor="registrationNumber" className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">
                            Custom ID <span className="text-destructive">*</span>
                         </Label>
                         <div className="relative">
                            <Hash className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="registrationNumber"
                              value={formData.registrationNumber}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  registrationNumber: e.target.value,
                                })
                              }
                              placeholder="e.g. STU-2024-001"
                              className="pl-9"
                              required={!autoGenerateId}
                            />
                         </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </fieldset>
          </ScrollArea>

          <DialogFooter className="p-4 bg-muted/20 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              {readOnly ? "Close" : "Cancel"}
            </Button>
            {!readOnly && (
              <Button
                type="submit"
                disabled={
                  isLoading || !formData.groupId || !formData.categoryId || (!autoGenerateId && !formData.registrationNumber)
                }
                className="min-w-[120px]"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Save Changes" : "Create Student"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
