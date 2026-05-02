"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Grid2X2,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/core/utils/cn";
import { useAssignments } from "@/features/assignments/hooks/use-assignments";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { useGroups } from "@/features/groups/hooks/use-groups";
import { useProgrammes } from "@/features/programmes/hooks/use-programmes";
import { useStudents } from "@/features/students/hooks/use-students";

interface AssignmentModalProps {
  festivalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isReadOnly?: boolean;
}

interface QueueItem {
  id: string; // temp id
  programmeId: string;
  programmeName: string;
  studentId: string;
  studentName: string;
  groupId?: string; // For reference
  groupName?: string;
  teamNumber: number;
  categoryName: string;
  isGroupType?: boolean;
}

type ModalView = "SELECTION" | "REVIEW";

export function AssignmentModal({
  festivalId,
  open,
  onOpenChange,
  isReadOnly = false,
}: AssignmentModalProps) {
  // Data Hooks
  const { categories } = useCategories(festivalId);
  const { groups } = useGroups(festivalId);
  const { programmes } = useProgrammes(festivalId);
  const { students } = useStudents(festivalId);
  const { bulkCreateAssignment, assignments } = useAssignments(festivalId);

  // State
  const [view, setView] = useState<ModalView>("SELECTION");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string>("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    new Set(),
  );
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derived Selection Objects
  const selectedProgramme = useMemo(
    () => programmes.find((p: any) => p.id === selectedProgrammeId),
    [programmes, selectedProgrammeId],
  );

  const selectedCategory = useMemo(
    () => categories.find((c: any) => c.id === selectedCategoryId),
    [categories, selectedCategoryId],
  );

  const selectedGroup = useMemo(
    () => groups.find((g: any) => g.id === selectedGroupId),
    [groups, selectedGroupId],
  );

  // Filtered Lists
  const filteredProgrammes = useMemo(() => {
    if (!selectedCategoryId) return [];
    return programmes.filter((p: any) => p.categoryId === selectedCategoryId);
  }, [programmes, selectedCategoryId]);

  const filteredStudents = useMemo(() => {
    if (!selectedGroupId) return [];

    let eligibleStudents = students.filter(
      (s: any) => s.groupId === selectedGroupId,
    );

    // If programme is selected, we need to sort/filter
    // Prioritize showing UNASSIGNED students at the top.
    // If assigned, we mark them differently.

    // We also need to consider category filtering IF the programme is not GENERAL.
    const isGeneralProgramme = selectedProgramme?.category?.type === "GENERAL";

    // Filter by Category matching if NOT general and strict mode (User said: first Group, then Category - implying filter)
    if (!isGeneralProgramme && selectedCategoryId) {
      eligibleStudents = eligibleStudents.filter(
        (s: any) => s.categoryId === selectedCategoryId,
      );
    }

    // Now adding status information to sorting
    return eligibleStudents
      .map((s: any) => {
        // Checking if already assigned to this programme (DB)
        const isAssignedDB = assignments.some(
          (a: any) =>
            a.programmeId === selectedProgrammeId && a.studentId === s.id,
        );
        // Checking if in Queue
        const isInQueue = queue.some(
          (q) => q.programmeId === selectedProgrammeId && q.studentId === s.id,
        );

        return { ...s, isAssigned: isAssignedDB || isInQueue };
      })
      .sort((a: any, b: any) => {
        // Unassigned first (false < true)
        return Number(a.isAssigned) - Number(b.isAssigned);
      });
  }, [
    students,
    assignments,
    queue,
    selectedGroupId,
    selectedCategoryId,
    selectedProgrammeId,
    selectedProgramme,
  ]);

  // Limits Logic
  type LimitInfo =
    | { type: "INDIVIDUAL"; max: number; label: string }
    | { type: "GROUP"; maxTeams: number; maxPerTeam: number; label: string };

  const limitInfo = useMemo<LimitInfo | null>(() => {
    if (!selectedProgramme) return null;

    if (selectedProgramme.type === "INDIVIDUAL") {
      return {
        type: "INDIVIDUAL",
        max: selectedProgramme.maxParticipantsPerGroup || 1,
        label: `Max Entries: ${selectedProgramme.maxParticipantsPerGroup || 1}`,
      };
    } else {
      return {
        type: "GROUP",
        maxTeams: selectedProgramme.maxTeamsPerGroup || 1,
        maxPerTeam: selectedProgramme.maxStudentsPerTeam || 1,
        label: `Max Teams: ${selectedProgramme.maxTeamsPerGroup || 1} | Size: ${selectedProgramme.maxStudentsPerTeam || 1}`,
      };
    }
  }, [selectedProgramme]);

  // -- AUTO-ASSIGNMENT & LIMIT LOGIC --
  // Calculate next available team or if limit reached.
  const assignmentState = useMemo(() => {
    if (!selectedProgramme || !limitInfo || !selectedGroupId)
      return { canAssign: false, message: "Select a group and programme" };

    // Existing DB Assignments for this Group & Programme
    // For Group Programme: Count by Team Number
    // For Individual: Count total

    const dbAssignments = assignments.filter(
      (a: any) =>
        a.programmeId === selectedProgrammeId &&
        (a.groupId === selectedGroupId ||
          a.student?.groupId === selectedGroupId),
    );

    const queueAssignments = queue.filter(
      (q) =>
        q.programmeId === selectedProgrammeId && q.groupId === selectedGroupId,
    );

    const currentSelectionCount = selectedStudentIds.size;
    const totalCurrentCount =
      dbAssignments.length + queueAssignments.length + currentSelectionCount;

    if (limitInfo.type === "INDIVIDUAL") {
      if (totalCurrentCount >= limitInfo.max) {
        // If we are selecting, we might have JUST reached it.
        // Logic: If selection > 0 and total == max, we are FULL but valid.
        // If selection == 0 and total == max, we cannot add more.
        // Actually simplest: Can we add 1 more?
        const potential =
          dbAssignments.length +
          queueAssignments.length +
          currentSelectionCount;
        // If potential >= max, then we can't select any MORE.
        // But existing selection is valid if potential == max.
        if (potential >= limitInfo.max) {
          return {
            canAssign: false,
            limitReached: true,
            message: `Group limit reached (${limitInfo.max}/${limitInfo.max})`,
          };
        }
      }
      return { canAssign: true, type: "INDIVIDUAL" }; // Individual doesn't need team number
    } else {
      // GROUP PROGRAMME LOGIC
      // We need to find the first available team slot (1..maxTeams)
      // A team is available if count < maxPerTeam.

      // 1. Map Usage per Team
      const teamUsage = new Map<number, number>();
      // Initialize 1..MaxTeams
      for (let i = 1; i <= limitInfo.maxTeams; i++) {
        teamUsage.set(i, 0);
      }

      // Fill from DB
      dbAssignments.forEach((a: any) => {
        const t = a.teamNumber || 1; // Default to 1 if missing
        teamUsage.set(t, (teamUsage.get(t) || 0) + 1);
      });

      // Fill from Queue
      queueAssignments.forEach((q) => {
        const t = q.teamNumber;
        teamUsage.set(t, (teamUsage.get(t) || 0) + 1);
      });

      // Current Selection: We haven't assigned them a team yet. They are just "pending".
      // They will take up the NEXT available slots.
      // We need to simulate placing them to see if we hit a wall.

      // How many slots do we need? = currentSelectionCount + 1 (for the next potential toggle)
      // Wait, for `canAssign` (rendering the list enabled/disabled), we just check if AT LEAST ONE slot exists
      // AFTER accounting for current selection.

      // Let's conceptually "fill" spots with selected students
      let pending = currentSelectionCount;

      let targetTeamForNext = -1;
      let isFull = true;

      // Simple Greedy Fill for validation:
      // Iterate teams 1..Max
      for (let i = 1; i <= limitInfo.maxTeams; i++) {
        let used = teamUsage.get(i) || 0;
        const capacity = limitInfo.maxPerTeam;
        const remaining = Math.max(0, capacity - used);

        if (pending > 0) {
          // Selected students take these spots
          const take = Math.min(pending, remaining);
          used += take;
          pending -= take;
        }

        // If after filling satisfied pending, is there STILL room for one more?
        if (pending === 0 && used < capacity) {
          // Found our target for the NEXT click
          if (targetTeamForNext === -1) targetTeamForNext = i;
          isFull = false;
          // We can stop? No, we need to know if FULL globally, so check all?
          // Actually if we found one open spot, we are good to go.
          break;
        }
      }

      if (pending > 0) {
        // We couldn't even fit the SELECTED students
        return {
          canAssign: false,
          limitReached: true,
          message: "Selection exceeds capacity",
        };
      }

      if (isFull) {
        return {
          canAssign: false,
          limitReached: true,
          message: "All teams are full",
        };
      }

      return { canAssign: true, type: "GROUP", nextTeam: targetTeamForNext };
    }
  }, [
    limitInfo,
    assignments,
    queue,
    selectedProgrammeId,
    selectedGroupId,
    selectedStudentIds.size,
    selectedProgramme,
  ]);

  // Handler for adding to queue - MUST USE AUTO-ASSIGN
  const handleAddToQueue = () => {
    if (isReadOnly) return;
    if (!selectedProgramme || selectedStudentIds.size === 0) return;
    if (
      !assignmentState.canAssign &&
      assignmentState.limitReached &&
      selectedStudentIds.size === 0
    )
      return;
    // Note: if selection exists but limit reached, we MIGHT be able to commit if valid?
    // Based on logic above, if 'limitReached' is true, it implies checking for +1.
    // But Render logic disables inputs. So if we have selection, it fits.

    const newItems: QueueItem[] = [];

    // We need to assign teams to the selected IDs cleanly.
    // Re-run the greedy placement just for these specific IDs to get their Team Numbers.

    // Copy of usage logic
    const dbAssignments = assignments.filter(
      (a: any) =>
        a.programmeId === selectedProgrammeId &&
        (a.groupId === selectedGroupId ||
          a.student?.groupId === selectedGroupId),
    );
    const queueAssignments = queue.filter(
      (q) =>
        q.programmeId === selectedProgrammeId && q.groupId === selectedGroupId,
    );

    const teamUsage = new Map<number, number>();
    if (limitInfo && limitInfo.type === "GROUP") {
      for (let i = 1; i <= limitInfo.maxTeams; i++) teamUsage.set(i, 0);
      dbAssignments.forEach((a: any) => {
        const t = a.teamNumber || 1;
        teamUsage.set(t, (teamUsage.get(t) || 0) + 1);
      });
      queueAssignments.forEach((q) => {
        const t = q.teamNumber;
        teamUsage.set(t, (teamUsage.get(t) || 0) + 1);
      });
    }

    Array.from(selectedStudentIds).forEach((sId) => {
      const student = students.find((s: any) => s.id === sId);
      if (!student) return;

      // Check if already in queue (sanity check)
      if (
        queue.some(
          (q) => q.programmeId === selectedProgrammeId && q.studentId === sId,
        )
      )
        return;

      // Determine Team
      let assignedTeam = 1;
      if (limitInfo?.type === "GROUP") {
        // Find first bucket with room
        let found = false;
        for (let i = 1; i <= limitInfo.maxTeams; i++) {
          const used = teamUsage.get(i) || 0;
          if (used < (limitInfo.maxPerTeam || 0)) {
            assignedTeam = i;
            teamUsage.set(i, used + 1); // Increment usage for next student in this batch
            found = true;
            break;
          }
        }
        if (!found) {
          // Should not happen if UI disabled correctly, but fail safe
          toast.error(
            `Could not auto-assign team for ${student.name}. Limits reached.`,
          );
          return;
        }
      }

      newItems.push({
        id: Math.random().toString(36).substr(2, 9),
        programmeId: selectedProgrammeId,
        programmeName: selectedProgramme.name,
        studentId: sId,
        studentName: student.name,
        groupId: selectedGroupId,
        groupName: selectedGroup?.name,
        teamNumber: assignedTeam, // Auto-assigned
        categoryName: selectedCategory?.name || "",
        isGroupType: limitInfo?.type === "GROUP",
      });
    });

    setQueue((prev) => [...prev, ...newItems]);
    setSelectedStudentIds(new Set()); // Clear selection
    toast.success(`Added ${newItems.length} to queue`);
  };

  const isLimitReached = assignmentState.limitReached || false;

  const handleRemoveFromQueue = (itemId: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleSave = async () => {
    if (isReadOnly) return;
    if (queue.length === 0) return;
    setIsSubmitting(true);
    try {
      await bulkCreateAssignment(
        queue.map((item) => ({
          programmeId: item.programmeId,
          studentId: item.studentId,
          teamNumber: item.teamNumber,
        })),
      );
      setQueue([]);
      onOpenChange(false);
      // Reset form
      setSelectedProgrammeId("");
      setSelectedStudentIds(new Set());
      setView("SELECTION");
    } catch (error) {
      console.error(error);
      // Error handled by hook toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStudent = (studentId: string) => {
    if (isReadOnly) return;
    const next = new Set(selectedStudentIds);
    if (next.has(studentId)) {
      next.delete(studentId);
    } else {
      if (isLimitReached) {
        // Double check: if unchecked, we can always uncheck.
        // Logic 'isLimitReached' renders the LIST disabled, checking is handled by onClick wrapper?
        // But if we are here, and limit reached, we simply don't add.
        return;
      }
      next.add(studentId);
    }
    setSelectedStudentIds(next);
  };

  // Reset helpers
  const resetFilters = () => {
    setSelectedCategoryId("");
    setSelectedProgrammeId("");
    setSelectedStudentIds(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-[calc(100%-1rem)] sm:w-[95vw] h-[95vh] max-h-dvh flex flex-col p-0 gap-0 border rounded-lg sm:rounded-xl mx-auto my-auto ring-0 outline-none overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-card z-10">
          <div>
            <DialogTitle className="text-xl">New Assignment</DialogTitle>
            <DialogDescription>
              {view === "SELECTION"
                ? "Select students and add to queue."
                : "Review and confirm assignments."}
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 mr-4">
              <div
                className={cn(
                  "h-2 w-2 rounded-full transition-colors",
                  view === "SELECTION" ? "bg-primary" : "bg-muted",
                )}
              ></div>
              <div
                className={cn(
                  "h-1 w-8 rounded-full transition-colors",
                  view === "REVIEW" ? "bg-primary" : "bg-muted",
                )}
              ></div>
              <div
                className={cn(
                  "h-2 w-2 rounded-full transition-colors",
                  view === "REVIEW" ? "bg-primary" : "bg-muted",
                )}
              ></div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* --- VIEW: SELECTION --- */}
        {view === "SELECTION" && (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Left Context Pane (Sidebar on Desktop, Top Bar on Mobile) */}
            <div className="w-full lg:w-[300px] border-b lg:border-b-0 lg:border-r flex flex-col bg-muted/10 shrink-0">
              <div className="p-6 space-y-6">
                {/* Step 1: Group (First Priority as requested) */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                      1
                    </div>
                    <span className="text-sm font-semibold">Group</span>
                  </div>
                  <Select
                    value={selectedGroupId}
                    onValueChange={(val) => {
                      setSelectedGroupId(val);
                      resetFilters(); // Reset everything when group changes naturally
                    }}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger className="w-full bg-background">
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

                <Separator />

                {/* Step 2: Category (Rearranged) */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                      2
                    </div>
                    <span className="text-sm font-semibold">Category</span>
                  </div>
                  <Select
                    value={selectedCategoryId}
                    onValueChange={(val) => {
                      setSelectedCategoryId(val);
                      setSelectedProgrammeId("");
                      setSelectedStudentIds(new Set());
                    }}
                    disabled={isReadOnly || !selectedGroupId}
                  >
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Separator />

                {/* Queue Status Widget */}
                <div className="mt-auto pt-6">
                  <div className="bg-card border rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Queue Status</span>
                      <Badge variant={queue.length > 0 ? "default" : "outline"}>
                        {queue.length}
                      </Badge>
                    </div>
                    <Button
                      variant="secondary"
                      className="w-full text-xs"
                      size="sm"
                      onClick={() => setView("REVIEW")}
                      disabled={isReadOnly || queue.length === 0}
                    >
                      Review & Submit <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Content Area */}
            <div className="flex-1 flex flex-col lg:grid lg:grid-cols-2 overflow-hidden bg-background">
              {/* Left Bar: Programmes */}
              <div className="h-full border-b lg:border-r w-full flex flex-col">
                <div className="px-6 h-14 border-b bg-muted/5 flex items-center gap-2">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                    3
                  </div>
                  <h3 className="text-sm font-semibold">Select Programme</h3>
                </div>
                <ScrollArea className="flex-1 p-6">
                  {!selectedCategoryId ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                      <Grid2X2 className="h-8 w-8 opacity-20" />
                      <p>Select a category to view programmes.</p>
                    </div>
                  ) : filteredProgrammes.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic text-center py-10">
                      No programmes found.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredProgrammes.map((p: any) => (
                        <button
                          type="button"
                          key={p.id}
                          disabled={isReadOnly}
                          onClick={() => {
                            if (isReadOnly) return;
                            setSelectedProgrammeId(p.id);
                            setSelectedStudentIds(new Set());
                          }}
                          className={cn(
                            "flex flex-col items-start text-left p-4 rounded-lg border transition-all hover:shadow-md",
                            selectedProgrammeId === p.id
                              ? "border-primary bg-primary/5 ring-1 ring-primary/50"
                              : "bg-card hover:bg-accent/50",
                            isReadOnly
                              ? "cursor-not-allowed opacity-60 hover:shadow-none"
                              : "",
                          )}
                        >
                          <div className="font-semibold text-sm mb-1">
                            {p.name}
                          </div>
                          <div className="flex flex-wrap gap-2 mt-auto pt-2">
                            {p.type === "INDIVIDUAL" ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] h-5"
                              >
                                Single
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="text-[10px] h-5"
                              >
                                Group
                              </Badge>
                            )}

                            {/* Limits Badges */}
                            {p.type === "INDIVIDUAL" ? (
                              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                Max: {p.maxParticipantsPerGroup}
                              </span>
                            ) : (
                              <div className="flex gap-1">
                                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  Teams: {p.maxTeamsPerGroup}
                                </span>
                                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  Size: {p.maxStudentsPerTeam}
                                </span>
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Right Bar: Students */}
              <div className="h-full flex flex-col min-h-0 border-t lg:border-t-0">
                <div className="px-6 py-3 gap-3 border-l-0 lg:border-l border-b flex bg-muted/5 flex-col xl:flex-row items-start xl:items-center justify-between w-full">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                        4
                      </div>
                      <h3 className="text-sm font-semibold">
                        {selectedProgramme?.type === "GROUP"
                          ? "Select members"
                          : "Select students"}
                      </h3>
                    </div>
                    {selectedProgramme?.type === "GROUP" &&
                      limitInfo &&
                      limitInfo.type === "GROUP" && (
                        <p className="text-xs text-muted-foreground pl-7">
                          Max {limitInfo.maxPerTeam} per team.
                        </p>
                      )}
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-4">
                    {isLimitReached && (
                      <div className="px-3 py-1 rounded-md text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20 animate-pulse">
                        {assignmentState.message || "Limit Reached"}
                      </div>
                    )}

                    {/* Auto-Assignment Indicator */}
                    {selectedProgramme?.type === "GROUP" && !isLimitReached && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 bg-muted px-2 py-1 rounded">
                        <span>Next:</span>
                        <span className="font-medium text-foreground">
                          Team {assignmentState.nextTeam || "?"}
                        </span>
                      </div>
                    )}

                    <Button
                      size="sm"
                      disabled={
                        isReadOnly ||
                        !selectedProgramme ||
                        selectedStudentIds.size === 0
                      }
                      onClick={handleAddToQueue}
                      className="h-8"
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add to Queue
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1 p-6">
                  {!selectedProgramme ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                      <Users className="h-8 w-8 opacity-20" />
                      <p>
                        Select a programme above to start selecting students.
                      </p>
                    </div>
                  ) : filteredStudents.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic text-center py-10">
                      No eligible students found in this group.
                    </p>
                  ) : (
                    <div className="flex flex-wrap w-full  gap-3">
                      {filteredStudents.map((s: any) => {
                        // Determine visual state
                        const isSelected = selectedStudentIds.has(s.id);
                        const isAssigned = s.isAssigned;
                        // Disabled if: (Limit reached AND not selected) OR (Already Assigned)
                        // Disabled if: (Limit reached AND not selected) OR (Already Assigned)
                        const isDisabled =
                          isReadOnly ||
                          isAssigned ||
                          (isLimitReached && !isSelected);

                        return (
                          <button
                            type="button"
                            key={s.id}
                            onClick={() => !isDisabled && toggleStudent(s.id)}
                            disabled={isDisabled}
                            className={cn(
                              "relative group p-3 rounded-md border text-sm transition-all cursor-pointer flex items-center justify-between gap-2 overflow-hidden w-full text-left",
                              isAssigned
                                ? "bg-destructive/5 border-destructive/20 text-muted-foreground opacity-60 cursor-not-allowed" // Assigned State (Red & Disabled)
                                : isReadOnly
                                  ? "bg-muted opacity-50 cursor-not-allowed"
                                  : isSelected
                                    ? "bg-primary/10 border-primary text-primary font-medium ring-1 ring-primary" // Selected State
                                    : isDisabled
                                      ? "bg-muted opacity-50 cursor-not-allowed" // Limit Reached Disabled
                                      : "bg-card hover:border-primary/50 hover:shadow-sm", // Default
                            )}
                          >
                            <span className="truncate">{s.name}</span>

                            {isSelected && (
                              <Check className="h-3 w-3 shrink-0 text-primary" />
                            )}

                            {isAssigned && (
                              <span className="text-[10px] text-destructive font-medium bg-destructive/10 px-1 rounded">
                                Assigned
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </div>
        )}

        {/* --- VIEW: REVIEW --- */}
        {view === "REVIEW" && (
          <div className="flex-1 flex flex-col bg-muted/5 animate-in slide-in-from-right-10 duration-200 overflow-hidden min-h-0">
            <div className="flex-1 flex justify-center p-8 overflow-hidden min-h-0">
              <div className="w-full max-w-4xl flex flex-col bg-background rounded-lg border h-full shadow-sm overflow-hidden">
                <div className="p-4 border-b flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">Review Queue</h3>
                    <p className="text-sm text-muted-foreground">
                      Verify assignments before saving.
                    </p>
                  </div>
                  <Button variant="ghost" onClick={() => setView("SELECTION")}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Selection
                  </Button>
                </div>

                <ScrollArea className="flex-1 overflow-y-scroll">
                  {queue.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                      <p>Queue is empty.</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {queue.map((item, idx) => (
                        <div
                          key={item.id}
                          className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground w-6 text-center">
                              {idx + 1}.
                            </span>
                            <div>
                              <p className="font-medium">{item.studentName}</p>
                              <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
                                <span>{item.programmeName}</span>
                                <span className="text-gray-300">•</span>
                                <span>{item.groupName}</span>
                                {item.isGroupType && (
                                  <>
                                    <span className="text-gray-300">•</span>
                                    <span className="text-primary font-medium">
                                      Team {item.teamNumber}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveFromQueue(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                <div className="p-4 border-t bg-muted/10 flex justify-between items-center">
                  <div className="text-sm font-medium">
                    Total: <span className="text-primary">{queue.length}</span>{" "}
                    assignments
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setView("SELECTION")}
                      disabled={isReadOnly}
                    >
                      Add More
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={
                        isReadOnly || isSubmitting || queue.length === 0
                      }
                    >
                      {isSubmitting && (
                        <AlertCircle className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Confirm All Assignments
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
