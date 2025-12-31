"use client";

import { Check, Loader2, Plus } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAssignments } from "@/hooks/useAssignments";
import { useGroups } from "@/hooks/useGroups";
import { useStudents } from "@/hooks/useStudents";
import { useProgrammes } from "@/hooks/useProgrammes";

interface AssignmentDialogProps {
  festivalId: string;
  assignment?: any;
  trigger?: React.ReactNode;
  readOnly?: boolean;
}

export function AssignmentDialog({
  festivalId,
  assignment,
  trigger,
  readOnly = false,
}: AssignmentDialogProps) {
  const [open, setOpen] = useState(false);
  const {
    createAssignment,
    isCreating,
    updateAssignment,
    isUpdating,
    assignments, // Need existing assignments to filter duplicates
  } = useAssignments(festivalId);
  const { students } = useStudents(festivalId);
  const { programmes } = useProgrammes(festivalId);
  const { groups } = useGroups(festivalId);

  const isEditing = !!assignment;
  const isLoading = isCreating || isUpdating;

  // New State: Selected Group ID
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    assignment?.group?.id || assignment?.student?.group?.id || "",
  );

  const [formData, setFormData] = useState({
    programmeId: "",
    studentId: "",
  });
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  useEffect(() => {
    if (open && assignment) {
      setFormData({
        programmeId: assignment.programmeId || "",
        studentId: assignment.studentId || "",
      });
      // For editing, pre-fill group if available (though usually derived)
      const grpId = assignment.group?.id || assignment.student?.group?.id || "";
      setSelectedGroupId(grpId);
      setSelectedStudentIds([assignment.studentId].filter(Boolean));
    } else if (open && !assignment) {
      setFormData({ programmeId: "", studentId: "" });
      setSelectedGroupId("");
      setSelectedStudentIds([]);
    }
  }, [open, assignment]);

  // Derived Info
  const selectedProgramme = programmes.find(
    (p: any) => p.id === formData.programmeId,
  );
  // Is this a "General" programme (Group Entry) or Individual?
  const isGeneral = selectedProgramme?.category?.type === "GENERAL";

  // Filter Logic
  // 1. Must belong to Selected Group (if group selected)
  // 2. Must match Category of Programme (unless General which usually allows all?)
  // 3. Must NOT be already assigned to this Programme.

  const filteredStudents = students.filter((student: any) => {
    // 1. Group Filter
    if (selectedGroupId && student.groupId !== selectedGroupId) {
      return false;
    }

    // 2. Category Eligibility
    // If NOT General, student must match category.
    if (!isGeneral) {
      if (
        selectedProgramme &&
        student.categoryId !== selectedProgramme.categoryId
      ) {
        return false;
      }
    }

    // 3. Duplicate Check
    // Exclude if already assigned to THIS programme
    // Check `assignments` list.
    const isAssigned = assignments.some(
      (a: any) =>
        a.programmeId === formData.programmeId &&
        a.studentId === student.id &&
        // If editing, exclude current assignment from check (allow keeping same)
        (isEditing ? a.id !== assignment.id : true),
    );
    if (isAssigned) return false;

    return true;
  });

  // Max Limit Logic
  const maxLimit = selectedProgramme?.maxEntries || 1;
  const currentCount = selectedProgramme?._count?.assignments || 0;
  const remainingSlots = Math.max(0, maxLimit - currentCount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    try {
      if (isEditing && assignment) {
        await updateAssignment({ id: assignment.id, data: formData });
      } else {
        if (isGeneral) {
          if (selectedStudentIds.length === 0) return;
          await Promise.all(
            selectedStudentIds.map((pid) =>
              createAssignment({
                programmeId: formData.programmeId,
                studentId: pid,
              }),
            ),
          );
        } else {
          await createAssignment(formData);
        }
      }
      setOpen(false);
      if (!isEditing) {
        setFormData({ programmeId: "", studentId: "" });
        setSelectedGroupId("");
        setSelectedStudentIds([]);
      }
    } catch (error) {
      // Handled hook
    }
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const isSelected = prev.includes(id);
      if (isSelected) {
        return prev.filter((p) => p !== id);
      } else {
        if (prev.length >= remainingSlots) return prev;
        return [...prev, id];
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Assignment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {readOnly
              ? "Assignment Details"
              : isEditing
                ? "Edit Assignment"
                : "New Assignment"}
          </DialogTitle>
          <DialogDescription>
            {readOnly
              ? "View assignment details."
              : isEditing
                ? "Modify assignment details."
                : "Assign a student to a programme."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Programme Selection */}
          <div className="space-y-2">
            <Label htmlFor="programme">Programme</Label>
            <Select
              required
              value={formData.programmeId}
              onValueChange={(val) => {
                setFormData((prev) => ({
                  ...prev,
                  programmeId: val,
                  studentId: "",
                }));
                setSelectedStudentIds([]);
              }}
              disabled={readOnly || isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select programme" />
              </SelectTrigger>
              <SelectContent>
                {programmes.map((prog: any) => (
                  <SelectItem key={prog.id} value={prog.id}>
                    {prog.name} ({prog.category?.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Group Selection (Enabled after Programme selected) */}
          <div className="space-y-2">
            <Label>Group</Label>
            <Select
              value={selectedGroupId}
              onValueChange={(val) => {
                setSelectedGroupId(val);
                setFormData((prev) => ({ ...prev, studentId: "" })); // Reset student
                setSelectedStudentIds([]);
              }}
              disabled={readOnly || !formData.programmeId || isLoading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !formData.programmeId
                      ? "Select programme first"
                      : "Select Group"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group: any) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              Filter students by group.
            </p>
          </div>

          {/* 3. Student Selection */}
          <div className="space-y-2">
            <Label>Student(s)</Label>
            {!selectedGroupId ? (
              <div className="rounded-md border p-4 text-center text-sm text-muted-foreground bg-muted/20">
                Select a Group to view eligible students.
              </div>
            ) : isGeneral && !isEditing ? (
              <div className="rounded-md border p-2">
                <div className="mb-2 flex items-center justify-between px-2">
                  <span className="text-sm font-medium">Select Students</span>
                  <Badge variant="secondary">
                    {selectedStudentIds.length} / {remainingSlots} selected
                  </Badge>
                </div>
                <ScrollArea className="h-[150px]">
                  <div className="space-y-1 p-2">
                    {filteredStudents.map((stud: any) => {
                      const isSelected = selectedStudentIds.includes(stud.id);
                      return (
                        <button
                          type="button"
                          key={stud.id}
                          className={`flex w-full cursor-pointer items-center justify-between rounded-sm border p-2 text-sm transition-colors hover:bg-muted ${
                            isSelected ? "bg-primary/5 border-primary" : ""
                          }`}
                          onClick={() => toggleStudent(stud.id)}
                        >
                          <span className="font-medium">{stud.name}</span>
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </button>
                      );
                    })}
                    {filteredStudents.length === 0 && (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No eligible students found in this group.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <Select
                required
                value={formData.studentId}
                onValueChange={(val) =>
                  setFormData({ ...formData, studentId: val })
                }
                disabled={readOnly || isLoading || !selectedGroupId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !selectedGroupId ? "Select Group first" : "Select student"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {filteredStudents.map((stud: any) => (
                    <SelectItem key={stud.id} value={stud.id}>
                      {stud.name}
                    </SelectItem>
                  ))}
                  {filteredStudents.length === 0 && (
                    <SelectItem value="none" disabled>
                      No eligible students found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
            {selectedProgramme && !isGeneral && (
              <div className="text-xs text-muted-foreground text-right mt-1">
                Slots remaining: {remainingSlots}
              </div>
            )}
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
                {isEditing ? "Save Changes" : "Assign"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
