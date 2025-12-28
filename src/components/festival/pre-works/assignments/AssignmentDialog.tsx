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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAssignments } from "@/hooks/useAssignments";
import { useParticipants } from "@/hooks/useParticipants";
import { useProgrammes } from "@/hooks/useProgrammes";
import { Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";

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
  const { createAssignment, isCreating, updateAssignment, isUpdating } =
    useAssignments(festivalId);
  const { participants } = useParticipants(festivalId);
  const { programmes } = useProgrammes(festivalId);

  const isEditing = !!assignment;
  const isLoading = isCreating || isUpdating;

  const [formData, setFormData] = useState({
    programmeId: "",
    participantId: "",
  });

  useEffect(() => {
    if (open && assignment) {
      setFormData({
        programmeId: assignment.programmeId || "",
        participantId: assignment.participantId || "",
      });
    } else if (open && !assignment) {
      setFormData({
        programmeId: "",
        participantId: "",
      });
    }
  }, [open, assignment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    try {
      if (isEditing && assignment) {
        await updateAssignment({ id: assignment.id, data: formData });
      } else {
        await createAssignment(formData);
      }
      setOpen(false);
      if (!isEditing) {
        setFormData({
          programmeId: "",
          participantId: "",
        });
      }
    } catch (error) {
      // Handled by hook
    }
  };

  // Filter participants/programmes based on selection?
  // E.g. If programme selected, filter participants by matching category.
  const selectedProgramme = programmes.find(
    (p: any) => p.id === formData.programmeId,
  );

  const filteredParticipants = selectedProgramme
    ? participants.filter(
        (p: any) => p.categoryId === selectedProgramme.categoryId,
      )
    : participants;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Assign Participant
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
                : "Assign a participant to a programme."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="programme">Programme</Label>
            <Select
              required
              value={formData.programmeId}
              onValueChange={
                (val) =>
                  setFormData({
                    ...formData,
                    programmeId: val,
                    participantId: "",
                  }) // Reset participant on programme change if mismatched
              }
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

          <div className="space-y-2">
            <Label htmlFor="participant">Participant</Label>
            <Select
              required
              value={formData.participantId}
              onValueChange={(val) =>
                setFormData({ ...formData, participantId: val })
              }
              disabled={readOnly || isLoading || !formData.programmeId}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    formData.programmeId
                      ? "Select participant"
                      : "Select programme first"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {filteredParticipants.map((part: any) => (
                  <SelectItem key={part.id} value={part.id}>
                    {part.name}
                  </SelectItem>
                ))}
                {filteredParticipants.length === 0 && (
                  <SelectItem value="" disabled>
                    No matching participants found
                  </SelectItem>
                )}
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
                {isEditing ? "Save Changes" : "Assign"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
