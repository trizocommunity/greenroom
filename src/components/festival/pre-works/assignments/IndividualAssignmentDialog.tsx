"use client";

import { Check, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQueryClient } from "@tanstack/react-query";
import { useAssignments } from "@/hooks/useAssignments";
import { useCategories } from "@/hooks/useCategories";
import { useGroups } from "@/hooks/useGroups";
import { useProgrammes } from "@/hooks/useProgrammes";
import { useStudents } from "@/hooks/useStudents";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { bulkCreateAssignmentAction } from "@/server/actions/assignment.actions";

interface IndividualAssignmentDialogProps {
  festivalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
}

type AssignmentDraft = {
  studentId: string;
  programmeId: string;
  studentName: string;
  programmeName: string;
};

export function IndividualAssignmentDialog({
  festivalId,
  open,
  onOpenChange,
  trigger,
}: IndividualAssignmentDialogProps) {
  const queryClient = useQueryClient();
  const { categories } = useCategories(festivalId);
  const { students } = useStudents(festivalId);
  const { groups } = useGroups(festivalId);
  const { programmes } = useProgrammes(festivalId);
  const { assignments } = useAssignments(festivalId);

  const [step, setStep] = useState<"SETUP" | "REVIEW">("SETUP");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("ALL");

  // Selection State
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [activeProgrammeId, setActiveProgrammeId] = useState<string | null>(
    null,
  );

  // Staging State
  const [draftAssignments, setDraftAssignments] = useState<AssignmentDraft[]>(
    [],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter Data based on Category
  // Filter Data based on Category
  const categoryStudents = students.filter(
    (s: any) =>
      s.categoryId === selectedCategoryId &&
      (selectedGroupId === "ALL" || s.groupId === selectedGroupId),
  );

  const categoryProgrammes = programmes.filter(
    (p: any) => p.categoryId === selectedCategoryId,
  );

  // Reset when dialog/category changes
  useEffect(() => {
    if (!open) {
      setStep("SETUP");
      setSelectedCategoryId("");
      setSelectedGroupId("ALL");
      setSelectedStudentIds([]);
      setActiveProgrammeId(null);
      setDraftAssignments([]);
      setIsSubmitting(false);
    }
  }, [open]);

  const handleAddToDraft = () => {
    if (!activeProgrammeId) return;

    const programme = programmes.find((p: any) => p.id === activeProgrammeId);
    if (!programme) return;

    const newDrafts: AssignmentDraft[] = [];

    // Only iterate selected students for the ACTIVE programme
    selectedStudentIds.forEach((studentId) => {
      const student = students.find((s: any) => s.id === studentId);
      if (student) {
        newDrafts.push({
          studentId,
          programmeId: activeProgrammeId,
          studentName: student.name,
          programmeName: programme.name,
        });
      }
    });

    setDraftAssignments((prev) => [...prev, ...newDrafts]);
    setSelectedStudentIds([]);
    toast.success(`Added ${newDrafts.length} assignments to queue`);
  };

  const handleRemoveDraft = (index: number) => {
    setDraftAssignments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (draftAssignments.length === 0) return;

    setIsSubmitting(true);
    try {
      const payload = draftAssignments.map((d) => ({
        studentId: d.studentId,
        programmeId: d.programmeId,
      }));

      await bulkCreateAssignmentAction(festivalId, payload);

      await queryClient.invalidateQueries({
        queryKey: ["assignments", festivalId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["programmes", festivalId],
      });
      toast.success(`Successfully created ${payload.length} assignments`);
      onOpenChange(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to create assignments");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSelection = (
    id: string,
    currentList: string[],
    setter: (l: string[]) => void,
  ) => {
    if (currentList.includes(id)) {
      setter(currentList.filter((item) => item !== id));
    } else {
      setter([...currentList, id]);
    }
  };

  // --- LIVE VALIDATION HELPER ---
  const isStudentDisabled = (studentId: string) => {
    if (!activeProgrammeId) return true; // Disable if no programme selected

    const programme = programmes.find((p: any) => p.id === activeProgrammeId);
    const student = students.find((s: any) => s.id === studentId);
    if (!programme || !student) return true;

    // 1. DUPLICATE: Check DB + Draft + Current Selection (already handled by 'includes', but needed for disable logic?)
    // Actually, if selected, it shouldn't be disabled, it should be toggleable.
    // But if ALREADY in DB or Draft, it MUST be disabled.

    const inDb = assignments.some(
      (a: any) =>
        a.programmeId === activeProgrammeId && a.studentId === studentId,
    );
    const inDraft = draftAssignments.some(
      (d) => d.programmeId === activeProgrammeId && d.studentId === studentId,
    );
    if (inDb || inDraft) return true;

    // 2. GLOBAL & GROUP SPECIFIC LIMITS
    const isSelected = selectedStudentIds.includes(studentId);

    if (programme.type === "GROUP") {
      // GROUP LOGIC
      // Limit 1: Max Teams (maxEntries) -> Max Distinct Groups
      // Limit 2: Team Size (maxTeamSize) -> Max Students per Group

      if (!student.groupId) return false; // Or true if strict? Assume false (valid) for now if no group.

      const dbGroupCount = assignments.filter(
        (a: any) =>
          a.programmeId === activeProgrammeId &&
          (a.groupId === student.groupId ||
            a.student?.groupId === student.groupId),
      ).length;

      const draftGroupCount = draftAssignments.filter(
        (d) =>
          d.programmeId === activeProgrammeId &&
          students.find((s: any) => s.id === d.studentId)?.groupId ===
            student.groupId,
      ).length;

      const selectedGroupCount = selectedStudentIds.filter((id) => {
        const s = students.find((st: any) => st.id === id);
        return s && s.groupId === student.groupId;
      }).length;

      // CHECK TEAM SIZE
      // We do NOT subtract 'isSelected' here because checking if *adding* one more is valid.
      // If selected, they are part of count. If unselected, we see if room.
      // Wait, 'isStudentDisabled' is for rendering the checkbox state.

      const currentTeamSize =
        dbGroupCount + draftGroupCount + selectedGroupCount;

      if (!isSelected) {
        if (currentTeamSize >= programme.maxStudentsPerTeam) {
          return true; // Team Full
        }
      }

      // CHECK MAX TEAMS
      // We need to count *distinct groups* in DB/Draft/Selected
      // This is expensive to calc every render item?
      // Optimize? It's fine for <100 students.

      // If this student's group is NEW (not in DB/Draft/Selected), do we have room?

      // Is group present in DB?
      const groupInDb = assignments.some(
        (a: any) =>
          a.programmeId === activeProgrammeId &&
          (a.groupId === student.groupId ||
            a.student?.groupId === student.groupId),
      );
      // Is group present in Draft?
      const groupInDraft = draftAssignments.some(
        (d) =>
          d.programmeId === activeProgrammeId &&
          students.find((s: any) => s.id === d.studentId)?.groupId ===
            student.groupId,
      );
      // Is group present in Selected (other than self)?
      const groupInSelected = selectedStudentIds.some(
        (id) =>
          students.find((st: any) => st.id === id)?.groupId === student.groupId,
      );

      const isNewGroup = !groupInDb && !groupInDraft && !groupInSelected;

      if (isNewGroup) {
        // Calculate current distinct groups count
        const distinctGroups = new Set<string>();

        assignments
          .filter((a: any) => a.programmeId === activeProgrammeId)
          .forEach((a: any) => {
            if (a.groupId) distinctGroups.add(a.groupId);
            else if (a.student?.groupId) distinctGroups.add(a.student.groupId);
          });

        draftAssignments
          .filter((d) => d.programmeId === activeProgrammeId)
          .forEach((d) => {
            const s = students.find((st: any) => st.id === d.studentId);
            if (s?.groupId) distinctGroups.add(s.groupId);
          });

        selectedStudentIds.forEach((id) => {
          const s = students.find((st: any) => st.id === id);
          if (s?.groupId) distinctGroups.add(s.groupId);
        });

        if (distinctGroups.size >= programme.maxTeamsPerGroup) {
          return true; // Max Teams Reached
        }
      }
    } else {
      // INDIVIDUAL LOGIC
      const currentDbCount = programme._count?.assignments || 0;
      const currentDraftCount = draftAssignments.filter(
        (d) => d.programmeId === activeProgrammeId,
      ).length;
      const currentSelectedCount = selectedStudentIds.length;

      if (!isSelected) {
        // Global Limit Removed
        // if (
        //   currentDbCount + currentDraftCount + currentSelectedCount >=
        //   programme.maxEntries
        // ) {
        //   return true; // Global Full
        // }
      }

      // GROUP LIMIT
      if (student.groupId && programme.maxParticipantsPerGroup) {
        const groupLimit = programme.maxParticipantsPerGroup;

        const dbGroupCount = assignments.filter(
          (a: any) =>
            a.programmeId === activeProgrammeId &&
            (a.groupId === student.groupId ||
              a.student?.groupId === student.groupId),
        ).length;

        const draftGroupCount = draftAssignments.filter(
          (d) =>
            d.programmeId === activeProgrammeId &&
            students.find((s: any) => s.id === d.studentId)?.groupId ===
              student.groupId,
        ).length;

        const selectedGroupCount = selectedStudentIds.filter((id) => {
          const s = students.find((st: any) => st.id === id);
          return s && s.groupId === student.groupId;
        }).length;

        if (!isSelected) {
          if (
            dbGroupCount + draftGroupCount + selectedGroupCount >=
            groupLimit
          ) {
            return true;
          }
        }
      }
    }

    return false;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {
        trigger /* Render trigger if provided, though typically controlled externally */
      }
      <DialogContent className="max-w-4xl flex flex-col h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            Individual Assignment {step === "REVIEW" && "- Review"}
          </DialogTitle>
          <DialogDescription>
            {step === "SETUP"
              ? "Select a Programme, then select Students to assign."
              : "Review your assignments before submitting."}
          </DialogDescription>
        </DialogHeader>

        {step === "SETUP" && (
          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            {/* Category Selector */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={selectedCategoryId}
                  onValueChange={(val) => {
                    setSelectedCategoryId(val);
                    setSelectedGroupId("ALL");
                    setSelectedStudentIds([]);
                    setActiveProgrammeId(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter((c: any) => c.type === "SINGLE")
                      .map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Group Filter</Label>
                <Select
                  value={selectedGroupId}
                  onValueChange={(val) => {
                    setSelectedGroupId(val);
                    setSelectedStudentIds([]);
                  }}
                  disabled={!selectedCategoryId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Groups" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Groups</SelectItem>
                    {groups.map((g: any) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedCategoryId && (
              <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
                {/* LEFT: Programmes Column (Single Select) */}
                <div className="border rounded-md flex flex-col overflow-hidden bg-muted/10">
                  <div className="p-2 border-b bg-muted/40 flex items-center justify-between">
                    <span className="font-medium text-sm">
                      1. Select Programme
                    </span>
                  </div>
                  <ScrollArea className="flex-1 p-2">
                    <div className="space-y-1">
                      {categoryProgrammes.map((p: any) => {
                        // DB COUNTS
                        let currentDbUsage = 0;
                        if (p.type === "GROUP") {
                          // For Group, we count distinct GROUPS in DB assignments
                          const distinctGroups = new Set();
                          assignments
                            .filter((a: any) => a.programmeId === p.id)
                            .forEach((a: any) => {
                              if (a.groupId) distinctGroups.add(a.groupId);
                              else if (a.student?.groupId)
                                distinctGroups.add(a.student.groupId);
                            });
                          currentDbUsage = distinctGroups.size;
                        } else {
                          // For Individual, count assignments
                          currentDbUsage = p._count?.assignments || 0;
                        }

                        // DRAFT COUNTS
                        let currentDraftUsage = 0;
                        if (p.type === "GROUP") {
                          const distinctDraftGroups = new Set();
                          draftAssignments
                            .filter((d) => d.programmeId === p.id)
                            .forEach((d) => {
                              const s = students.find(
                                (st: any) => st.id === d.studentId,
                              );
                              if (s?.groupId)
                                distinctDraftGroups.add(s.groupId);
                            });
                          // Note: This simple add doesn't dedup against DB if the group is same.
                          // But usually we treat draft as *additional* unless we do complex intersection.
                          // For display "Q: X", let's just show draft count.
                          // Total is estimated.
                          currentDraftUsage = distinctDraftGroups.size;
                        } else {
                          currentDraftUsage = draftAssignments.filter(
                            (d) => d.programmeId === p.id,
                          ).length;
                        }

                        // Valid 'Total' for Limit Comparison (Rough approximation for display)
                        // Precise logic is in 'isStudentDisabled'
                        // Here we just want to avoid showing "Assignments: 50" for a "Max Teams: 5" limit.

                        const maxLimit =
                          p.type === "GROUP"
                            ? p.maxTeamsPerGroup
                            : p.maxParticipantsPerGroup;
                        const isFull =
                          p.type === "GROUP"
                            ? currentDbUsage + currentDraftUsage >= maxLimit
                            : false; // Only show full if limit hit (Logic simplistic here)

                        return (
                          <button
                            type="button"
                            key={p.id}
                            onClick={() => {
                              if (activeProgrammeId !== p.id) {
                                setActiveProgrammeId(p.id);
                                setSelectedStudentIds([]);
                              }
                            }}
                            className={cn(
                              "w-full flex items-center gap-2 p-2 rounded cursor-pointer text-sm transition-colors text-left border",
                              activeProgrammeId === p.id
                                ? "bg-background border-primary shadow-sm"
                                : "hover:bg-background/50 border-transparent",
                            )}
                          >
                            <div
                              className={cn(
                                "h-4 w-4 rounded-full border flex items-center justify-center transition-colors px-0 py-0 shrink-0",
                                activeProgrammeId === p.id
                                  ? "border-primary bg-primary/20"
                                  : "border-muted-foreground",
                              )}
                            >
                              {activeProgrammeId === p.id && (
                                <div className="h-2 w-2 rounded-full bg-primary" />
                              )}
                            </div>

                            <div className="flex flex-col flex-1 overflow-hidden">
                              <div className="flex justify-between items-center">
                                <span className="truncate font-medium">
                                  {p.name}
                                </span>
                                {p.type === "GROUP" && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] h-4 leading-none px-1"
                                  >
                                    GROUP
                                  </Badge>
                                )}
                              </div>

                              {p.type === "GROUP" ? (
                                <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                                  <span>
                                    Teams: {currentDbUsage}{" "}
                                    {currentDraftUsage > 0 &&
                                      `+ ${currentDraftUsage}`}
                                  </span>
                                  <span
                                    className={cn(
                                      isFull
                                        ? "text-amber-600 font-medium"
                                        : "",
                                    )}
                                  >
                                    Max: {maxLimit}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                                  <span>
                                    DB: {currentDbUsage} | Q:{" "}
                                    {currentDraftUsage}
                                  </span>
                                  <span
                                    className={cn(
                                      isFull
                                        ? "text-amber-600 font-medium"
                                        : "",
                                    )}
                                  >
                                    Total: {currentDbUsage + currentDraftUsage}/
                                    {maxLimit}
                                  </span>
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                      {categoryProgrammes.length === 0 && (
                        <p className="text-xs text-muted-foreground p-2">
                          No programmes found.
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* RIGHT: Students Column (Multi Select) */}
                <div className="border rounded-md flex flex-col overflow-hidden bg-background">
                  <div className="p-2 border-b bg-muted/40 flex items-center justify-between h-[52px]">
                    <span className="font-medium text-sm">
                      2. Select Students
                    </span>
                  </div>

                  {!activeProgrammeId ? (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                      Select a programme first
                    </div>
                  ) : (
                    <ScrollArea className="flex-1 p-2">
                      <div className="space-y-1">
                        {categoryStudents.map((s: any) => {
                          const disabled = isStudentDisabled(s.id);
                          const selected = selectedStudentIds.includes(s.id);

                          return (
                            <button
                              type="button"
                              key={s.id}
                              disabled={disabled && !selected} // If selected, allow unselect
                              onClick={() =>
                                toggleSelection(
                                  s.id,
                                  selectedStudentIds,
                                  setSelectedStudentIds,
                                )
                              }
                              className={cn(
                                "w-full flex items-center gap-2 p-2 rounded cursor-pointer text-sm transition-colors text-left",
                                selected
                                  ? "bg-primary/10 text-primary"
                                  : "hover:bg-muted",
                                disabled &&
                                  !selected &&
                                  "opacity-40 cursor-not-allowed bg-muted/20",
                              )}
                            >
                              <div
                                className={cn(
                                  "h-4 w-4 border rounded flex items-center justify-center transition-colors px-0 py-0 shrink-0",
                                  selected
                                    ? "bg-primary border-primary"
                                    : "border-muted-foreground",
                                )}
                              >
                                {selected && (
                                  <Check className="h-3 w-3 text-primary-foreground" />
                                )}
                              </div>
                              <div className="flex flex-col flex-1 overflow-hidden">
                                <div className="flex justify-between items-center w-full">
                                  <span className="truncate">{s.name}</span>
                                  {selected ? (
                                    <span className="text-[10px] text-primary font-bold">
                                      SELECTED
                                    </span>
                                  ) : (
                                    disabled && (
                                      <span className="text-[10px]">NA</span>
                                    )
                                  )}
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                  {s.group?.name || "No Group"}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                        {categoryStudents.length === 0 && (
                          <p className="text-xs text-muted-foreground p-2">
                            No students found.
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t mt-auto">
              {activeProgrammeId ? (
                <div className="text-sm font-medium">
                  {(() => {
                    const p = programmes.find(
                      (px: any) => px.id === activeProgrammeId,
                    );
                    if (!p) return null;
                    const db = p._count?.assignments || 0;
                    const q = draftAssignments.filter(
                      (d) => d.programmeId === activeProgrammeId,
                    ).length;
                    const sel = selectedStudentIds.length;
                    return (
                      <span>
                        {p.name}: {db + q + sel}/
                        {p.type === "GROUP"
                          ? p.maxTeamsPerGroup
                          : p.maxParticipantsPerGroup}{" "}
                        Assignments
                      </span>
                    );
                  })()}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  {draftAssignments.length} in total queue
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={
                    !activeProgrammeId || selectedStudentIds.length === 0
                  }
                  onClick={handleAddToDraft}
                >
                  Add Selection to Queue
                </Button>
                <Button
                  onClick={() => setStep("REVIEW")}
                  disabled={draftAssignments.length === 0}
                >
                  Review ({draftAssignments.length})
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "REVIEW" && (
          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            <ScrollArea className="flex-1 border rounded-md">
              <div className="p-4 space-y-2">
                {draftAssignments.map((draft, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded border bg-muted/20"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">
                        {draft.studentName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        → {draft.programmeName}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleRemoveDraft(idx)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setStep("SETUP")}>
                Back to Selection
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Confirm {draftAssignments.length} Assignments
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
