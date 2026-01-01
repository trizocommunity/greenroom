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
import { useProgrammes } from "@/hooks/useProgrammes";
import { useStudents } from "@/hooks/useStudents";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface GeneralAssignmentDialogProps {
  festivalId: string;
  trigger?: React.ReactNode;
}

export function GeneralAssignmentDialog({
  festivalId,
  trigger,
}: GeneralAssignmentDialogProps) {
  const [open, setOpen] = useState(false);
  const { createAssignment, isCreating, assignments } =
    useAssignments(festivalId);
  const { students } = useStudents(festivalId);
  const { programmes } = useProgrammes(festivalId);
  const { groups } = useGroups(festivalId);

  const [formData, setFormData] = useState({
    programmeId: "",
    groupId: "",
  });
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Reset when opening
  useEffect(() => {
    if (open) {
      setFormData({ programmeId: "", groupId: "" });
      setSelectedStudentIds([]);
    }
  }, [open]);

  // 1. Programmes: Only GENERAL
  const generalProgrammes = programmes.filter(
    (p: any) => p.category?.type === "GENERAL",
  );

  // Selected Programme Details
  const selectedProgramme = programmes.find(
    (p: any) => p.id === formData.programmeId,
  );

  // 2. Filter Students by Group & Availability
  const availableStudents = students.filter((s: any) => {
    if (!formData.groupId) return false;
    if (s.groupId !== formData.groupId) return false;

    // Check if duplicate assignment
    if (formData.programmeId) {
      const isAssigned = assignments.some(
        (a: any) =>
          a.programmeId === formData.programmeId && a.studentId === s.id,
      );
      if (isAssigned) return false;
    }

    return true;
  });

  const maxLimit = selectedProgramme?.maxEntries || 1000;
  // TODO: Check if per-group limit logic is more complex, but generally this refers to 'max entries per group'.
  // We need to count how many students from THIS group are already assigned to this programme.
  const currentlyAssignedFromGroup = assignments.filter(
    (a: any) =>
      a.programmeId === formData.programmeId &&
      (a.student?.groupId === formData.groupId ||
        a.group?.id === formData.groupId),
  ).length;

  const remainingSlots = Math.max(0, maxLimit - currentlyAssignedFromGroup);

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((pid) => pid !== id);
      } else {
        if (prev.length >= remainingSlots) return prev;
        return [...prev, id];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.programmeId || selectedStudentIds.length === 0) return;

    try {
      await Promise.all(
        selectedStudentIds.map((studentId) =>
          createAssignment({
            programmeId: formData.programmeId,
            studentId: studentId,
          }),
        ),
      );
      toast.success(
        `Successfully assigned ${selectedStudentIds.length} students`,
      );
      setOpen(false);
    } catch (error) {
      // Hook handles
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="secondary">
            <Plus className="mr-2 h-4 w-4" />
            New General
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>General Assignment</DialogTitle>
          <DialogDescription>
            Assign students to general programmes (e.g. Rally, Common Events).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Programme Selection */}
          <div className="space-y-2">
            <Label>General Programme</Label>
            <Select
              value={formData.programmeId}
              onValueChange={(val) => {
                setFormData({ programmeId: val, groupId: "" });
                setSelectedStudentIds([]);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Programme" />
              </SelectTrigger>
              <SelectContent>
                {generalProgrammes.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Group Selection */}
          <div className="space-y-2">
            <Label>Group</Label>
            <Select
              value={formData.groupId}
              onValueChange={(val) => {
                setFormData((prev) => ({ ...prev, groupId: val }));
                setSelectedStudentIds([]);
              }}
              disabled={!formData.programmeId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Group" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g: any) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. Students Bulk Selection */}
          {formData.groupId && selectedProgramme && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Select Students</Label>
                <Badge variant={remainingSlots === 0 ? "secondary" : "outline"}>
                  {selectedStudentIds.length} / {remainingSlots} slots
                </Badge>
              </div>

              <ScrollArea className="h-[200px] rounded-md border p-2">
                <div className="space-y-1">
                  {availableStudents.map((s: any) => {
                    const isSelected = selectedStudentIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        className={cn(
                          "w-full flex items-center justify-between p-2 rounded-sm cursor-pointer hover:bg-muted transition-colors border text-left",
                          isSelected
                            ? "bg-primary/5 border-primary"
                            : "border-transparent",
                        )}
                        onClick={() => toggleStudent(s.id)}
                      >
                        <span className="text-sm font-medium">{s.name}</span>
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </button>
                    );
                  })}
                  {availableStudents.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground p-4">
                      No eligible students found (or all assigned).
                    </div>
                  )}
                </div>
              </ScrollArea>
              {remainingSlots === 0 && (
                <p className="text-xs text-destructive">
                  Limit reached for this group.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || selectedStudentIds.length === 0}
            >
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign{" "}
              {selectedStudentIds.length > 0
                ? `(${selectedStudentIds.length})`
                : ""}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
