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
import { Loader2, Plus, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

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
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<
    string[]
  >([]);

  useEffect(() => {
    if (open && assignment) {
      setFormData({
        programmeId: assignment.programmeId || "",
        participantId: assignment.participantId || "",
      });
      setSelectedParticipantIds([assignment.participantId].filter(Boolean));
    } else if (open && !assignment) {
      setFormData({
        programmeId: "",
        participantId: "",
      });
      setSelectedParticipantIds([]);
    }
  }, [open, assignment]);

  // Logic to determine Category Type
  const selectedProgramme = programmes.find(
    (p: any) => p.id === formData.programmeId,
  );
  const isGeneral = selectedProgramme?.category?.type === "GENERAL";

  const filteredParticipants = selectedProgramme
    ? isGeneral
      ? participants // List all participants for General
      : participants.filter(
          (p: any) => p.categoryId === selectedProgramme.categoryId,
        )
    : participants;

  // Max Limit Logic
  const maxLimit = selectedProgramme?.maxEntries || 1;
  const currentCount = selectedProgramme?._count?.assignments || 0;
  const remainingSlots = Math.max(0, maxLimit - currentCount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;

    try {
      if (isEditing && assignment) {
        // Update Single Assignment (Multi-select not supported for Update flow usually, or complex)
        await updateAssignment({ id: assignment.id, data: formData });
      } else {
        // Create Flow
        if (isGeneral) {
          // Bulk Create
          if (selectedParticipantIds.length === 0) return;
          if (selectedParticipantIds.length > remainingSlots) {
            // Basic validation, though UI should prevent this or show error
            return;
          }
          await Promise.all(
            selectedParticipantIds.map((pid) =>
              createAssignment({
                programmeId: formData.programmeId,
                participantId: pid,
              }),
            ),
          );
        } else {
          // Single Create
          await createAssignment(formData);
        }
      }
      setOpen(false);
      if (!isEditing) {
        setFormData({ programmeId: "", participantId: "" });
        setSelectedParticipantIds([]);
      }
    } catch (error) {
      // Handled by hook
    }
  };

  const toggleParticipant = (id: string) => {
    setSelectedParticipantIds((prev) => {
      const isSelected = prev.includes(id);
      if (isSelected) {
        return prev.filter((p) => p !== id);
      } else {
        if (prev.length >= remainingSlots) return prev; // Prevent selecting more than allowed
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
            <Label>Participant(s)</Label>
            {isGeneral && !isEditing ? (
              <div className="rounded-md border p-2">
                <div className="mb-2 flex items-center justify-between px-2">
                  <span className="text-sm font-medium">
                    Select Participants
                  </span>
                  <Badge variant="secondary">
                    {selectedParticipantIds.length} / {remainingSlots} selected
                  </Badge>
                </div>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2 p-2">
                    {filteredParticipants.map((part: any) => {
                      const isSelected = selectedParticipantIds.includes(
                        part.id,
                      );
                      return (
                        <button
                          type="button"
                          key={part.id}
                          className={`flex w-full cursor-pointer items-center justify-between rounded-sm border p-2 text-sm transition-colors hover:bg-muted ${
                            isSelected ? "bg-primary/5 border-primary" : ""
                          }`}
                          onClick={() => toggleParticipant(part.id)}
                        >
                          <span className="font-medium">{part.name}</span>
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </button>
                      );
                    })}
                    {filteredParticipants.length === 0 && (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No participants found
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            ) : (
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
                    <SelectItem value="none" disabled>
                      No matching participants found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
            {selectedProgramme && !isGeneral && (
              <div className="text-xs text-muted-foreground text-right">
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
