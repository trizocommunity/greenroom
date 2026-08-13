import { useMemo, useState, useCallback, useEffect } from "react";
import { Check, Crown, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AppEmptyState, StatusPill } from "@/components/app/AppSection";
import { toast } from "@/lib/toast";
import { cn } from "@/core/utils/cn";
import type { CategoryType, StageType } from "@/core/types/app-enums";
import type { ProgrammeForAssignment, MyParticipantForAssignment } from "../types";

function stageTypeLabel(stageType?: StageType | null): string {
  return stageType === "NON_STAGE" ? "Off stage" : "On stage";
}

interface AssignProgrammeDrawerProps {
  festivalId: string;
  leaderGroupId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProgramme: ProgrammeForAssignment | null;
  myParticipants: MyParticipantForAssignment[];
  assignments: any[];
  canAssign: boolean;
  canRemove: boolean;
  isProgrammeEditable: boolean;
  requiresTeamLead: boolean;
  existingTeamLeads: Record<string, { participantId: string; name: string }>;
  bulkCreateAssignments: any;
  deleteAssignment: any;
  deleteTeamAssignment: any;
  programmeCategoryOptions: { id: string; name: string; type: CategoryType | null }[];
}

export function AssignProgrammeDrawer({
  festivalId,
  leaderGroupId,
  open,
  onOpenChange,
  selectedProgramme,
  myParticipants,
  assignments,
  canAssign,
  canRemove,
  isProgrammeEditable,
  requiresTeamLead,
  existingTeamLeads,
  bulkCreateAssignments,
  deleteAssignment,
  deleteTeamAssignment,
  programmeCategoryOptions,
}: AssignProgrammeDrawerProps) {
  const [participantSearch, setParticipantSearch] = useState<string>("");
  const [participantFilter, setParticipantFilter] = useState<"ALL" | "AVAILABLE" | "ASSIGNED">("ALL");
  const [participantCategoryFilter, setParticipantCategoryFilter] = useState<string>("ALL");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [removedParticipantIds, setRemovedParticipantIds] = useState<string[]>([]);
  const [teamLeadChoice, setTeamLeadChoice] = useState<Record<number, string>>({});
  const [isEditingAssignments, setIsEditingAssignments] = useState(false);

  useEffect(() => {
    if (selectedProgramme?.id || !selectedProgramme?.id) {
      setSelectedParticipantIds([]);
      setRemovedParticipantIds([]);
      setTeamLeadChoice({});
      setIsEditingAssignments(false);
      setParticipantSearch("");
      setParticipantFilter("ALL");
    }
  }, [selectedProgramme?.id]);

  const clearSelection = () => {
    setSelectedParticipantIds([]);
    setRemovedParticipantIds([]);
    setTeamLeadChoice({});
  };

  const participantsForSelectedProgramme = useMemo(() => {
    if (!selectedProgramme) return myParticipants;
    if (selectedProgramme.category.type === "GENERAL") return myParticipants;
    return myParticipants.filter(
      (s) => s.categoryId === selectedProgramme.category.id,
    );
  }, [myParticipants, selectedProgramme]);

  const participantByIdLookup = useMemo(() => {
    return new Map<string, MyParticipantForAssignment>(
      myParticipants.map((s) => [s.id, s]),
    );
  }, [myParticipants]);

  const filteredParticipants = useMemo(() => {
    let filtered = participantsForSelectedProgramme;

    const q = participantSearch.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((s) => {
        const name = s.name.toLowerCase();
        const chest = (s.chestNumber ?? "").toLowerCase();
        return name.includes(q) || chest.includes(q);
      });
    }

    if (participantCategoryFilter !== "ALL") {
      filtered = filtered.filter(
        (s) => s.categoryId === participantCategoryFilter,
      );
    }

    return filtered;
  }, [participantsForSelectedProgramme, participantSearch, participantCategoryFilter]);

  const alreadyAssignedParticipantIdsForSelectedProgramme = useMemo(() => {
    if (!selectedProgramme) return new Set<string>();
    const set = new Set<string>();
    for (const a of assignments as any[]) {
      if (a?.programme?.id !== selectedProgramme.id) continue;
      const assignmentGroupId =
        a?.group?.id ?? a?.participant?.groupId ?? a?.participant?.group?.id;
      if (assignmentGroupId !== leaderGroupId) continue;
      if (!a?.participant?.id) continue;
      set.add(a.participant.id);
    }
    return set;
  }, [assignments, selectedProgramme, leaderGroupId]);

  const visibleParticipants = useMemo(() => {
    if (participantFilter === "ALL") return filteredParticipants;
    return filteredParticipants.filter((s) => {
      const isAssigned = alreadyAssignedParticipantIdsForSelectedProgramme.has(s.id);
      return participantFilter === "ASSIGNED" ? isAssigned : !isAssigned;
    });
  }, [filteredParticipants, participantFilter, alreadyAssignedParticipantIdsForSelectedProgramme]);

  const selectedNewParticipantIdsToAssign = useMemo(() => {
    if (!selectedProgramme) return [];
    return selectedParticipantIds.filter(
      (id) => !alreadyAssignedParticipantIdsForSelectedProgramme.has(id),
    );
  }, [selectedProgramme, selectedParticipantIds, alreadyAssignedParticipantIdsForSelectedProgramme]);

  const selectedNewCount = selectedNewParticipantIdsToAssign.length;
  const assignedCountForSelected = alreadyAssignedParticipantIdsForSelectedProgramme.size;

  type LimitTracking =
    | {
        type: "INDIVIDUAL";
        max: number;
        existingMembersCount: number;
        remaining: number;
      }
    | {
        type: "GROUP";
        maxTeams: number;
        maxPerTeam: number;
        existingMembersCount: number;
        remainingSlots: number;
      };

  const limitTracking = useMemo<LimitTracking | null>(() => {
    if (!selectedProgramme) return null;

    const getProgrammeId = (a: any) => a?.programmeId ?? a?.programme?.id;
    const getGroupId = (a: any) =>
      a?.groupId ??
      a?.group?.id ??
      a?.participant?.groupId ??
      a?.participant?.group?.id;

    const dbAssignmentsForProgrammeInLeaderGroup = (assignments as any[]).filter((a) => {
      return (
        getProgrammeId(a) === selectedProgramme.id &&
        getGroupId(a) === leaderGroupId
      );
    });

    const existingMembersCount = dbAssignmentsForProgrammeInLeaderGroup.length;
    const activeExistingCount =
      existingMembersCount - removedParticipantIds.length;

    if (selectedProgramme.type === "INDIVIDUAL") {
      const max = selectedProgramme.maxParticipantsPerGroup ?? 1;
      return {
        type: "INDIVIDUAL",
        max,
        existingMembersCount: activeExistingCount,
        remaining: max - activeExistingCount - selectedNewCount,
      };
    }

    const maxTeams = selectedProgramme.maxTeamsPerGroup ?? 1;
    const maxPerTeam = selectedProgramme.maxParticipantsPerTeam ?? 1;
    const totalCapacity = maxTeams * maxPerTeam;
    return {
      type: "GROUP",
      maxTeams,
      maxPerTeam,
      existingMembersCount: activeExistingCount,
      remainingSlots: totalCapacity - activeExistingCount - selectedNewCount,
    };
  }, [assignments, selectedProgramme, leaderGroupId, selectedNewCount, removedParticipantIds]);

  const isOverLimit =
    limitTracking?.type === "INDIVIDUAL"
      ? (limitTracking.remaining ?? 0) < 0
      : limitTracking?.type === "GROUP"
        ? (limitTracking.remainingSlots ?? 0) < 0
        : false;

  const isCapacityFull =
    limitTracking?.type === "INDIVIDUAL"
      ? (limitTracking.remaining ?? 0) <= 0
      : limitTracking?.type === "GROUP"
        ? (limitTracking.remainingSlots ?? 0) <= 0
        : false;

  const capacityLabel =
    limitTracking?.type === "GROUP"
      ? `${limitTracking.existingMembersCount}/${limitTracking.maxTeams * limitTracking.maxPerTeam}`
      : limitTracking?.type === "INDIVIDUAL"
        ? `${limitTracking.existingMembersCount}/${limitTracking.max}`
        : "—";

  const remainingLabel =
    limitTracking?.type === "GROUP"
      ? Math.max(0, limitTracking.remainingSlots)
      : limitTracking?.type === "INDIVIDUAL"
        ? Math.max(0, limitTracking.remaining)
        : 0;

  const toggleParticipant = (participantId: string) => {
    if (alreadyAssignedParticipantIdsForSelectedProgramme.has(participantId)) {
      setRemovedParticipantIds((prev) => {
        if (prev.includes(participantId))
          return prev.filter((id) => id !== participantId);
        return [...prev, participantId];
      });
      return;
    }

    setSelectedParticipantIds((prev) => {
      const has = prev.includes(participantId);
      if (has) return prev.filter((id) => id !== participantId);
      return [...prev, participantId];
    });
  };

  const allocateTeamsForGroupProgramme = useCallback(
    (
      programme: ProgrammeForAssignment,
      participantIds: string[],
    ): { programmeId: string; participantId: string; teamNumber: number }[] => {
      const maxTeams = programme.maxTeamsPerGroup ?? 1;
      const maxPerTeam = programme.maxParticipantsPerTeam ?? 1;

      const existingAssignments = (assignments as any[]).filter((a) => {
        const assignmentProgrammeId = a?.programme?.id ?? a?.programmeId;
        const assignmentGroupId = a?.group?.id ?? a?.participant?.groupId;
        return (
          assignmentProgrammeId === programme.id &&
          assignmentGroupId === leaderGroupId &&
          a?.teamNumber != null &&
          !removedParticipantIds.includes(a?.participant?.id)
        );
      });

      const teamCounts = new Map<number, number>();
      const existingTeams = new Set<number>();

      for (const a of existingAssignments) {
        const tn = a.teamNumber ?? 1;
        existingTeams.add(tn);
        teamCounts.set(tn, (teamCounts.get(tn) || 0) + 1);
      }

      const allocateOneParticipant = (): number | null => {
        const existingOrdered = [...existingTeams].sort((x, y) => x - y);
        for (const tn of existingOrdered) {
          const count = teamCounts.get(tn) || 0;
          if (count < maxPerTeam) return tn;
        }

        if (existingTeams.size >= maxTeams) return null;
        for (let tn = 1; tn <= maxTeams; tn++) {
          if (existingTeams.has(tn)) continue;
          return tn;
        }
        return null;
      };

      const result: {
        programmeId: string;
        participantId: string;
        teamNumber: number;
      }[] = [];
      for (const participantId of participantIds) {
        const teamNumber = allocateOneParticipant();
        if (!teamNumber) {
          return [];
        }
        existingTeams.add(teamNumber);
        teamCounts.set(teamNumber, (teamCounts.get(teamNumber) || 0) + 1);
        result.push({ programmeId: programme.id, participantId, teamNumber });
      }

      return result;
    },
    [assignments, leaderGroupId, removedParticipantIds],
  );

  const groupTeamPreview = useMemo(() => {
    if (!selectedProgramme || selectedProgramme.type !== "GROUP") return null;

    const maxTeams = selectedProgramme.maxTeamsPerGroup ?? 1;
    const maxPerTeam = selectedProgramme.maxParticipantsPerTeam ?? 1;

    const teamToExistingParticipantIds = new Map<number, Set<string>>();
    const teamToNewParticipantIds = new Map<number, Set<string>>();
    const participantIdToTeamNumber = new Map<string, number>();

    for (let tn = 1; tn <= maxTeams; tn++) {
      teamToExistingParticipantIds.set(tn, new Set());
      teamToNewParticipantIds.set(tn, new Set());
    }

    for (const a of assignments as any[]) {
      const assignmentProgrammeId = a?.programme?.id ?? a?.programmeId;
      const assignmentGroupId =
        a?.group?.id ?? a?.participant?.groupId ?? a?.participant?.group?.id;

      if (assignmentProgrammeId !== selectedProgramme.id) continue;
      if (assignmentGroupId !== leaderGroupId) continue;
      if (!a?.participant?.id) continue;
      if (a?.teamNumber == null) continue;

      const tn = Number(a.teamNumber) || 1;
      if (tn < 1 || tn > maxTeams) continue;

      if (removedParticipantIds.includes(a.participant.id)) continue;

      teamToExistingParticipantIds.get(tn)!.add(a.participant.id);
      participantIdToTeamNumber.set(a.participant.id, tn);
    }

    const payloadPreview = allocateTeamsForGroupProgramme(
      selectedProgramme,
      selectedNewParticipantIdsToAssign,
    );

    for (const item of payloadPreview) {
      const tn = item.teamNumber;
      teamToNewParticipantIds.get(tn)!.add(item.participantId);
      participantIdToTeamNumber.set(item.participantId, tn);
    }

    const teams = Array.from({ length: maxTeams }, (_, i) => i + 1).map(
      (tn) => {
        const existingIds = Array.from(
          teamToExistingParticipantIds.get(tn) || [],
        );
        const newIds = Array.from(teamToNewParticipantIds.get(tn) || []);
        const used = existingIds.length + newIds.length;
        const remaining = Math.max(0, maxPerTeam - used);
        return {
          teamNumber: tn,
          existingIds,
          newIds,
          used,
          remaining,
          isFull: remaining <= 0,
        };
      },
    );

    return { maxTeams, maxPerTeam, teams, participantIdToTeamNumber };
  }, [
    selectedProgramme,
    assignments,
    leaderGroupId,
    allocateTeamsForGroupProgramme,
    selectedNewParticipantIdsToAssign,
    removedParticipantIds,
  ]);

  const teamsNeedingLead = useMemo(() => {
    if (!requiresTeamLead) return [];
    if (!selectedProgramme || selectedProgramme.type !== "GROUP") return [];
    if (!groupTeamPreview) return [];

    return groupTeamPreview.teams
      .filter((t) => [...t.existingIds, ...t.newIds].length > 0)
      .map((t) => ({
        teamNumber: t.teamNumber,
        candidateIds: [...t.existingIds, ...t.newIds],
      }));
  }, [requiresTeamLead, selectedProgramme, groupTeamPreview]);

  const missingTeamLead = teamsNeedingLead.some((t) => {
    const chosenId = teamLeadChoice[t.teamNumber];
    const existingLead =
      existingTeamLeads[`${selectedProgramme?.id}:${t.teamNumber}`];
    const isExistingLeadRemoved =
      existingLead &&
      removedParticipantIds.includes(existingLead.participantId);

    if (chosenId) return false;
    if (existingLead && !isExistingLeadRemoved) return false;
    return true;
  });

  const onAssign = async () => {
    if (!canAssign) return;
    if (!selectedProgramme) return;
    if (selectedNewCount === 0 && removedParticipantIds.length === 0) {
      toast.error("No changes to save");
      return;
    }

    if (removedParticipantIds.length > 0) {
      const assignmentsToDelete = (assignments as any[]).filter((a) => {
        const assignmentProgrammeId = a?.programme?.id ?? a?.programmeId;
        const assignmentGroupId =
          a?.group?.id ?? a?.participant?.groupId ?? a?.participant?.group?.id;
        return (
          assignmentProgrammeId === selectedProgramme.id &&
          assignmentGroupId === leaderGroupId &&
          removedParticipantIds.includes(a.participant?.id)
        );
      });

      if (assignmentsToDelete.length > 0) {
        try {
          await Promise.all(
            assignmentsToDelete.map((a) =>
              deleteAssignment.mutateAsync({ festivalId, assignmentId: a.id }),
            ),
          );
        } catch (e) {
          toast.error("Failed to remove some assignments");
          return;
        }
      }
    }

    if (selectedNewCount === 0) {
      toast.success("Assignments updated");
      clearSelection();
      setIsEditingAssignments(false);
      return;
    }

    const selectedParticipantsList = participantsForSelectedProgramme.filter((s) => selectedParticipantIds.includes(s.id));
    
    const participantIdsToAssign = selectedParticipantsList
      .map((s) => s.id)
      .filter(
        (id) => !alreadyAssignedParticipantIdsForSelectedProgramme.has(id),
      );

    if (participantIdsToAssign.length === 0) {
      toast.error(
        "All selected participants are already assigned to this programme",
      );
      return;
    }

    let bulkPayload: {
      programmeId: string;
      participantId: string;
      teamNumber?: number;
    }[] = [];

    if (selectedProgramme.type === "GROUP") {
      const payload = allocateTeamsForGroupProgramme(
        selectedProgramme,
        participantIdsToAssign,
      );
      if (payload.length === 0) {
        toast.error("Not enough team capacity for the selected participants");
        return;
      }
      bulkPayload = payload;
    } else {
      bulkPayload = participantIdsToAssign.map((participantId) => ({
        programmeId: selectedProgramme.id,
        participantId,
      }));
    }

    let teamLeadsByTeam: Record<string, string> | undefined;
    if (requiresTeamLead && selectedProgramme.type === "GROUP") {
      teamLeadsByTeam = {};
      for (const t of teamsNeedingLead) {
        const chosenId = teamLeadChoice[t.teamNumber];
        const existingLead = existingTeamLeads[`${selectedProgramme.id}:${t.teamNumber}`];
        const isExistingLeadRemoved = existingLead && removedParticipantIds.includes(existingLead.participantId);

        if (chosenId) {
          teamLeadsByTeam[`${selectedProgramme.id}:${leaderGroupId}:${t.teamNumber}`] = chosenId;
        } else if (existingLead && !isExistingLeadRemoved) {
          teamLeadsByTeam[`${selectedProgramme.id}:${leaderGroupId}:${t.teamNumber}`] = existingLead.participantId;
        } else {
           toast.error(`Choose a team lead for Team ${t.teamNumber}`);
           return;
        }
      }
    }

    await bulkCreateAssignments.mutateAsync({
      festivalId,
      data: { assignments: bulkPayload as any[], teamLeadsByTeam },
    });
    clearSelection();
    setIsEditingAssignments(false);
  };

  const onClearProgrammeAssignments = async () => {
    if (!canRemove || !selectedProgramme) return;

    if (selectedProgramme.type === "GROUP") {
      const teamNumbers = Array.from(
        new Set(
          (assignments as any[])
            .filter(
              (a) => (a.programme?.id ?? a.programmeId) === selectedProgramme.id
            )
            .map((a) => a.teamNumber)
        )
      );

      if (teamNumbers.length === 0) return;

      try {
        await Promise.all(
          teamNumbers.map((tn) =>
            deleteTeamAssignment.mutateAsync({
              festivalId,
              programmeId: selectedProgramme.id,
              groupId: leaderGroupId,
              teamNumber: tn,
            })
          )
        );
        toast.success("Assignments cleared");
      } catch (e) {
        toast.error("Failed to clear some assignments");
      }
      return;
    }

    const assignmentsToDelete = (assignments as any[]).filter((a) => {
      const assignmentProgrammeId = a?.programme?.id ?? a?.programmeId;
      const assignmentGroupId =
        a?.group?.id ?? a?.participant?.groupId ?? a?.participant?.group?.id;
      return (
        assignmentProgrammeId === selectedProgramme.id &&
        assignmentGroupId === leaderGroupId
      );
    });

    if (assignmentsToDelete.length === 0) return;

    try {
      await Promise.all(
        assignmentsToDelete.map((a) =>
          deleteAssignment.mutateAsync({ festivalId, assignmentId: a.id }),
        ),
      );
      toast.success("Assignments cleared");
    } catch (e) {
      toast.error("Failed to clear some assignments");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-6 sm:max-w-xl"
      >
        {selectedProgramme ? (
          <>
            <SheetHeader className="space-y-0 border-b border-border py-5 text-left">
              <SheetTitle className="truncate text-lg font-semibold tracking-tight text-heading">
                {selectedProgramme.name}
              </SheetTitle>
              <SheetDescription className="text-xs">
                {selectedProgramme.category.name} ·{" "}
                {stageTypeLabel(selectedProgramme.stageType)} ·{" "}
                {selectedProgramme.type === "GROUP"
                  ? "Team programme"
                  : "Individual programme"}
              </SheetDescription>

              <div className="flex flex-wrap items-center gap-1.5 pt-3">
                <StatusPill tone={isCapacityFull ? "danger" : "muted"}>
                  Capacity {capacityLabel}
                </StatusPill>
                <StatusPill tone={remainingLabel > 0 ? "ready" : "muted"}>
                  {remainingLabel} left
                </StatusPill>
                {selectedNewCount > 0 && (
                  <StatusPill tone="ready">
                    {selectedNewCount} selected
                  </StatusPill>
                )}
                {isOverLimit && (
                  <StatusPill tone="danger">Limit exceeded</StatusPill>
                )}
              </div>
            </SheetHeader>

            <div className="min-h-0 flex-1 overflow-y-auto py-5">
              {/* Team preview */}
              {selectedProgramme.type === "GROUP" && groupTeamPreview && (
                <div className="mb-6">
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Teams
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {groupTeamPreview.teams.map((t) => (
                      <div
                        key={t.teamNumber}
                        className={cn(
                          "rounded-xl border border-border p-3",
                          t.isFull && "bg-muted/40",
                        )}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-medium text-heading">
                            Team {t.teamNumber}
                          </span>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {t.used}/{groupTeamPreview.maxPerTeam}
                          </span>
                        </div>
                        {requiresTeamLead && t.used > 0 && (isEditingAssignments || t.newIds.length > 0) ? (
                          <div className="mt-3">
                            <Select
                              value={
                                teamLeadChoice[t.teamNumber] ??
                                existingTeamLeads[`${selectedProgramme.id}:${t.teamNumber}`]?.participantId ??
                                ""
                              }
                              onValueChange={(v) =>
                                setTeamLeadChoice((prev) => ({
                                  ...prev,
                                  [t.teamNumber]: v,
                                }))
                              }
                            >
                              <SelectTrigger className="h-8 w-full rounded-md border-border text-xs shadow-none">
                                <div className="flex min-w-0 items-center gap-1.5">
                                  <Crown className="h-3.5 w-3.5 shrink-0 text-primary" />
                                  <span className="truncate">
                                    <SelectValue placeholder="Select team lead" />
                                  </span>
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                {[...t.existingIds, ...t.newIds].map((id) => (
                                  <SelectItem key={id} value={id}>
                                    {participantByIdLookup.get(id)?.name ?? id}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : existingTeamLeads[
                            `${selectedProgramme.id}:${t.teamNumber}`
                          ] ? (
                          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Crown className="h-3 w-3 text-primary" />
                            Lead:{" "}
                            {
                              existingTeamLeads[
                                `${selectedProgramme.id}:${t.teamNumber}`
                              ].name
                            }
                          </p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {[...t.existingIds, ...t.newIds].length === 0 ? (
                            <span className="text-xs text-muted-foreground">
                              Empty
                            </span>
                          ) : (
                            [...t.existingIds, ...t.newIds].map((id) => {
                              const isLead = id === (teamLeadChoice[t.teamNumber] ?? existingTeamLeads[`${selectedProgramme.id}:${t.teamNumber}`]?.participantId);
                              return (
                              <span
                                key={id}
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]",
                                  isLead
                                    ? "border border-primary/30 bg-primary/20 font-medium text-primary"
                                    : t.newIds.includes(id)
                                      ? "bg-primary/12 text-primary"
                                      : "bg-muted text-muted-foreground",
                                )}
                              >
                                {isLead && <Crown className="h-2.5 w-2.5" />}
                                {participantByIdLookup.get(id)?.name ?? id}
                              </span>
                            )})
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {assignedCountForSelected > 0 && !isEditingAssignments ? (
                selectedProgramme.type === "INDIVIDUAL" && (
                  <div className="mb-6">
                    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Assigned Participants
                    </h3>
                    <ul className="divide-y divide-border rounded-2xl border border-border">
                      {Array.from(
                        alreadyAssignedParticipantIdsForSelectedProgramme,
                      ).map((id) => {
                        const s = participantByIdLookup.get(id);
                        if (!s) return null;
                        return (
                          <li
                            key={s.id}
                            className="flex items-center gap-3 px-3.5 py-3"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-heading">
                                {s.name}
                              </span>
                              <span className="block truncate text-[11px] text-muted-foreground">
                                {s.chestNumber ?? "No chest number"}
                              </span>
                            </span>
                            <StatusPill tone="live" icon={Check}>
                              Assigned
                            </StatusPill>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )
              ) : (
                <>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Your participants
                    </h3>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {assignedCountForSelected} already assigned
                    </span>
                  </div>

                  <div className="mb-3 flex flex-col gap-2">
                    <div className="flex gap-2 flex-1">
                      <Input
                        value={participantSearch}
                        onChange={(e) => setParticipantSearch(e.target.value)}
                        placeholder="Search name or chest number"
                        className="h-9 flex-1 rounded-full text-sm min-w-0"
                      />
                      {selectedProgramme.category.type === "GENERAL" && (
                        <Select
                          value={participantCategoryFilter}
                          onValueChange={setParticipantCategoryFilter}
                        >
                          <SelectTrigger className="h-9 w-[140px] shrink-0 rounded-full text-sm">
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">All categories</SelectItem>
                            {programmeCategoryOptions.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {(["ALL", "AVAILABLE", "ASSIGNED"] as const).map(
                        (f) => (
                          <button
                            key={f}
                            type="button"
                            aria-pressed={participantFilter === f}
                            onClick={() => setParticipantFilter(f)}
                            className={cn(
                              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                              participantFilter === f
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {f === "ALL"
                              ? "All"
                              : f === "AVAILABLE"
                                ? "Available"
                                : "Assigned"}
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  {visibleParticipants.length === 0 ? (
                    <AppEmptyState
                      title="No participants"
                      description={
                        participantFilter === "ASSIGNED"
                          ? "Nobody from your group is assigned to this programme yet."
                          : "No participants match this search or category."
                      }
                    />
                  ) : (
                    <ul className="divide-y divide-border rounded-2xl border border-border">
                      {visibleParticipants.map((s) => {
                        const isAssignedDB =
                          alreadyAssignedParticipantIdsForSelectedProgramme.has(
                            s.id,
                          );
                        const isRemoved = removedParticipantIds.includes(
                          s.id,
                        );
                        const isNewSelected = selectedParticipantIds.includes(
                          s.id,
                        );

                        const checked = isAssignedDB
                          ? !isRemoved
                          : isNewSelected;

                        const disableForLimit = !checked && isCapacityFull;
                        const teamNumber =
                          selectedProgramme.type === "GROUP"
                            ? groupTeamPreview?.participantIdToTeamNumber.get(
                                s.id,
                              )
                            : undefined;

                        return (
                          <li key={s.id}>
                            <label
                              className={cn(
                                "flex items-center gap-3 px-3.5 py-3 transition-colors",
                                checked && "bg-primary/[0.06]",
                                isAssignedDB && !isRemoved && "bg-muted/40",
                                disableForLimit && "opacity-45",
                                !(isAssignedDB && !isRemoved) &&
                                  !disableForLimit &&
                                  canAssign &&
                                  "cursor-pointer",
                              )}
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4 shrink-0 accent-[var(--primary)]"
                                checked={checked}
                                onChange={() => toggleParticipant(s.id)}
                                disabled={
                                  !isProgrammeEditable ||
                                  !canAssign ||
                                  (!isAssignedDB && disableForLimit) ||
                                  (isAssignedDB && !canRemove)
                                }
                              />

                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-heading">
                                  {s.name}
                                </span>
                                <span className="block truncate text-[11px] text-muted-foreground">
                                  {s.chestNumber ?? "No chest number"}
                                </span>
                              </span>

                              {isAssignedDB && !isRemoved && (
                                <StatusPill tone="live" icon={Check}>
                                  Assigned
                                </StatusPill>
                              )}
                              {teamNumber != null && !isRemoved && (
                                <StatusPill tone="muted">
                                  Team {teamNumber}
                                </StatusPill>
                              )}
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              )}
            </div>

            {/* Sticky action bar */}
            <div className="flex items-center justify-between gap-3 border-t border-border py-4">
              {assignedCountForSelected > 0 && !isEditingAssignments ? (
                <>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={
                          !canRemove ||
                          !isProgrammeEditable ||
                          deleteAssignment.isPending
                        }
                        className="h-10 rounded-full px-5"
                      >
                        Clear Assignments
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Clear all assignments?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to clear all assignments for{" "}
                          {selectedProgramme.name}? This action cannot be
                          undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={onClearProgrammeAssignments}
                        >
                          Clear assignments
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button
                    onClick={() => {
                      setIsEditingAssignments(true);
                      setTeamLeadChoice({});
                    }}
                    disabled={!canRemove || !isProgrammeEditable}
                    className="h-10 rounded-full px-7"
                  >
                    Edit Assignments
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (isEditingAssignments && selectedNewCount === 0) {
                        setIsEditingAssignments(false);
                        clearSelection();
                      } else {
                        clearSelection();
                      }
                    }}
                    disabled={
                      !isEditingAssignments &&
                      (!canAssign || !isProgrammeEditable)
                    }
                    className="h-10 px-5 rounded-full"
                  >
                    {isEditingAssignments && selectedNewCount === 0
                      ? "Cancel"
                      : "Clear"}
                  </Button>

                  <Button
                    onClick={onAssign}
                    disabled={
                      !canAssign ||
                      !isProgrammeEditable ||
                      (selectedNewCount === 0 &&
                        removedParticipantIds.length === 0) ||
                      isOverLimit ||
                      missingTeamLead ||
                      bulkCreateAssignments.isPending ||
                      deleteAssignment.isPending
                    }
                    className="h-10 rounded-full px-7"
                  >
                    {(bulkCreateAssignments.isPending ||
                      deleteAssignment.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {isEditingAssignments
                      ? "Save Changes"
                      : `Assign${selectedNewCount > 0 ? ` ${selectedNewCount}` : ""}`}
                  </Button>
                </>
              )}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
