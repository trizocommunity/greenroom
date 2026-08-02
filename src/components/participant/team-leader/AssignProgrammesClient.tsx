"use client";

import { format } from "date-fns";
import {
  Check,
  ChevronRight,
  Crown,
  Loader2,
  Mail,
  Phone,
  Plus,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useAssignments,
  useBulkCreateAssignments,
  useDeleteAssignment,
} from "@/api/client/assignments";
import { AppEmptyState, StatusPill } from "@/components/app/AppSection";
import { ProgrammeStatusBadge } from "@/components/festival/ProgrammeStatusBadge";
import { AssignmentModal } from "@/components/festival/pre-event-works/assignments/AssignmentModal";
import { DeadlineWindowGate } from "@/components/festival/pre-event-works/DeadlineWindowGate";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  CategoryType,
  ProgrammeStatus,
  ProgrammeType,
} from "@/core/types/app-enums";
import { cn } from "@/core/utils/cn";
import { useDeadlineWindow } from "@/features/festivals/hooks/use-deadline-window";
import { getProgrammeStatusPriorityRank } from "@/features/programmes/services/programme-status-priority";

type ProgrammeForAssignment = {
  id: string;
  name: string;
  type: ProgrammeType;
  status: ProgrammeStatus;
  maxTeamsPerGroup: number;
  maxParticipantsPerTeam: number;
  maxParticipantsPerGroup: number;
  category: { id: string; name: string; type: CategoryType | null };
};

type MyParticipantForAssignment = {
  id: string;
  name: string;
  chestNumber: string | null;
  categoryId: string;
};

export function AssignProgrammesClient({
  festivalId,
  leaderGroupId,
  leaderCategoryId,
  isReadOnly,
  windowStart,
  deadline,
  managerName,
  managerEmail,
  managerPhone,
  groupCount,
  programmes,
  myParticipants,
  requiresTeamLead = false,
  existingTeamLeads = {},
}: {
  festivalId: string;
  leaderGroupId: string;
  leaderCategoryId: string;
  isReadOnly: boolean;
  windowStart?: string | Date | null;
  deadline?: string | Date | null;
  managerName?: string | null;
  managerEmail?: string | null;
  managerPhone?: string | null;
  groupCount: number;
  programmes: ProgrammeForAssignment[];
  myParticipants: MyParticipantForAssignment[];
  /** PRO festivals reject GROUP assignments unless every new team names a lead. */
  requiresTeamLead?: boolean;
  /** Keyed `${programmeId}:${teamNumber}` for this leader's group. */
  existingTeamLeads?: Record<string, { participantId: string; name: string }>;
}) {
  const {
    isLocked,
    isUpcoming,
    justLocked,
    start: windowStartDate,
    end: windowEndDate,
  } = useDeadlineWindow(windowStart ?? null, deadline ?? null);
  const runtimeIsReadOnly = isReadOnly || isLocked;

  const { data: assignments = [], refetch } = useAssignments(festivalId);
  const bulkCreateAssignments = useBulkCreateAssignments();
  const deleteAssignment = useDeleteAssignment();

  const sortedProgrammes = useMemo(() => {
    return [...programmes].sort(
      (a, b) =>
        getProgrammeStatusPriorityRank(a.status) -
        getProgrammeStatusPriorityRank(b.status),
    );
  }, [programmes]);

  const programmeCategoryOptions = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; type: CategoryType | null }
    >();
    for (const p of programmes) {
      if (!p.category?.id) continue;
      map.set(p.category.id, {
        id: p.category.id,
        name: p.category.name,
        type: p.category.type ?? null,
      });
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [programmes]);

  // Category filter: choose which (non-GENERAL) programme category to show.
  // GENERAL programmes are always allowed for any participant selection.
  const [selectedProgrammeCategoryId, setSelectedProgrammeCategoryId] =
    useState<string>(leaderCategoryId);

  const selectedProgrammeCategoryType = useMemo(() => {
    return (
      programmeCategoryOptions.find((c) => c.id === selectedProgrammeCategoryId)
        ?.type ?? null
    );
  }, [programmeCategoryOptions, selectedProgrammeCategoryId]);

  // Type filter: GROUP / INDIVIDUAL (capacity rules differ).
  const [selectedProgrammeType, setSelectedProgrammeType] = useState<
    "ALL" | "GROUP" | "INDIVIDUAL"
  >("ALL");

  // Polling: keep assignments fresh while admins assign in another session.
  useEffect(() => {
    if (!festivalId) return;
    const intervalId = window.setInterval(() => {
      void refetch();
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [festivalId, refetch]);

  useEffect(() => {
    if (!programmeCategoryOptions.length) return;
    if (
      programmeCategoryOptions.some((c) => c.id === selectedProgrammeCategoryId)
    ) {
      return;
    }
    setSelectedProgrammeCategoryId(programmeCategoryOptions[0]?.id);
  }, [programmeCategoryOptions, selectedProgrammeCategoryId]);

  const eligibleProgrammes = useMemo(() => {
    return sortedProgrammes.filter((p) => {
      if (selectedProgrammeType !== "ALL" && p.type !== selectedProgrammeType)
        return false;

      // Category-type rules:
      // - If selected category is SINGLE -> show only that zone category programmes (no GENERAL programmes).
      // - If selected category is GENERAL -> show only GENERAL category-type programmes.
      if (selectedProgrammeCategoryType === "GENERAL") {
        return p.category.type === "GENERAL";
      }

      // default to SINGLE behaviour
      return p.category.id === selectedProgrammeCategoryId;
    });
  }, [
    sortedProgrammes,
    selectedProgrammeCategoryId,
    selectedProgrammeType,
    selectedProgrammeCategoryType,
  ]);

  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string | null>(
    eligibleProgrammes[0]?.id ?? null,
  );

  useEffect(() => {
    if (!eligibleProgrammes.length) {
      setSelectedProgrammeId(null);
      return;
    }
    if (
      selectedProgrammeId &&
      eligibleProgrammes.some((p) => p.id === selectedProgrammeId)
    ) {
      return;
    }
    setSelectedProgrammeId(eligibleProgrammes[0]?.id ?? null);
  }, [eligibleProgrammes, selectedProgrammeId]);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<
    string[]
  >([]);

  const [assignProgrammesTab, setAssignProgrammesTab] = useState<
    "ASSIGN" | "ASSIGNMENTS"
  >("ASSIGN");
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);

  // AssignmentModal expects a top-level `categoryId` on each programme (this
  // component's ProgrammeForAssignment only nests it under `category.id`).
  const assignmentModalProgrammes = useMemo(
    () => programmes.map((p) => ({ ...p, categoryId: p.category.id })),
    [programmes],
  );

  useEffect(() => {
    if (!justLocked) return;
    toast.error("Deadline passed. Assignments are closed.");
  }, [justLocked]);

  const deadlineLabel = useMemo(() => {
    if (!deadline) return null;
    const d = deadline instanceof Date ? deadline : new Date(deadline);
    if (Number.isNaN(d.getTime())) return null;
    return format(d, "PPpp");
  }, [deadline]);

  const startLabel = useMemo(() => {
    if (!windowStart) return null;
    const d = windowStart instanceof Date ? windowStart : new Date(windowStart);
    if (Number.isNaN(d.getTime())) return null;
    return format(d, "PPpp");
  }, [windowStart]);

  // Switching programmes changes capacity + already-assigned set.
  // Clear selection so the UI can't carry invalid picks across programmes.
  useEffect(() => {
    if (selectedProgrammeId || !selectedProgrammeId) {
      setSelectedParticipantIds([]);
      setTeamLeadChoice({});
    }
  }, [selectedProgrammeId]);

  const selectedProgramme = useMemo(() => {
    return eligibleProgrammes.find((p) => p.id === selectedProgrammeId) ?? null;
  }, [eligibleProgrammes, selectedProgrammeId]);

  const participantsForSelectedProgramme = useMemo(() => {
    if (!selectedProgramme) return myParticipants;
    // GENERAL programmes accept any participant category.
    if (selectedProgramme.category.type === "GENERAL") return myParticipants;
    // Otherwise, only participants matching the programme category can be assigned.
    return myParticipants.filter(
      (s) => s.categoryId === selectedProgramme.category.id,
    );
  }, [myParticipants, selectedProgramme]);

  const selectedParticipants = useMemo(() => {
    const set = new Set(selectedParticipantIds);
    return participantsForSelectedProgramme.filter((s) => set.has(s.id));
  }, [participantsForSelectedProgramme, selectedParticipantIds]);

  const participantByIdLookup = useMemo(() => {
    return new Map<string, MyParticipantForAssignment>(
      myParticipants.map((s) => [s.id, s]),
    );
  }, [myParticipants]);

  // Picker controls: free-text search plus an assigned/available filter, so a
  // leader can see who is already in without hunting through faded rows.
  const [participantSearch, setParticipantSearch] = useState<string>("");
  const [participantFilter, setParticipantFilter] = useState<
    "ALL" | "AVAILABLE" | "ASSIGNED"
  >("ALL");

  /** Team number -> chosen lead participantId, for the programme being edited. */
  const [teamLeadChoice, setTeamLeadChoice] = useState<Record<number, string>>(
    {},
  );
  const filteredParticipants = useMemo(() => {
    const q = participantSearch.trim().toLowerCase();
    if (!q) return participantsForSelectedProgramme;
    return participantsForSelectedProgramme.filter((s) => {
      const name = s.name.toLowerCase();
      const chest = (s.chestNumber ?? "").toLowerCase();
      return name.includes(q) || chest.includes(q);
    });
  }, [participantsForSelectedProgramme, participantSearch]);

  // NOTE: we display remaining capacity based on only "new" selections
  // (participants not already assigned for the selected programme).

  const clearSelection = () => {
    if (runtimeIsReadOnly) return;
    setSelectedParticipantIds([]);
  };

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

  const selectedNewParticipantIdsToAssign = useMemo(() => {
    if (!selectedProgramme) return [];
    return selectedParticipantIds.filter(
      (id) => !alreadyAssignedParticipantIdsForSelectedProgramme.has(id),
    );
  }, [
    selectedProgramme,
    selectedParticipantIds,
    alreadyAssignedParticipantIdsForSelectedProgramme,
  ]);

  const selectedNewCount = selectedNewParticipantIdsToAssign.length;

  const assignmentCountByProgrammeId = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assignments as any[]) {
      const programmeId = a?.programme?.id ?? a?.programmeId;
      if (!programmeId) continue;
      map.set(programmeId, (map.get(programmeId) || 0) + 1);
    }
    return map;
  }, [assignments]);

  const getUiProgrammeStatus = (
    programme: ProgrammeForAssignment,
  ): ProgrammeStatus => {
    const assignmentCount = assignmentCountByProgrammeId.get(programme.id) || 0;
    const expectedPerGroup =
      programme.type === "INDIVIDUAL"
        ? (programme.maxParticipantsPerGroup ?? 1)
        : (programme.maxTeamsPerGroup ?? 1) *
          (programme.maxParticipantsPerTeam ?? 1);
    const expectedTotal = groupCount * expectedPerGroup;
    const isFullyAssignedAcrossAllGroups =
      assignmentCount >= expectedTotal && expectedTotal > 0;

    // Only override between READY <-> ASSIGNED; other statuses come from backend logic.
    if (programme.status === "READY" || programme.status === "ASSIGNED") {
      return isFullyAssignedAcrossAllGroups ? "ASSIGNED" : "READY";
    }

    return programme.status;
  };

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

    const dbAssignmentsForProgrammeInLeaderGroup = (
      assignments as any[]
    ).filter((a) => {
      return (
        getProgrammeId(a) === selectedProgramme.id &&
        getGroupId(a) === leaderGroupId
      );
    });

    const existingMembersCount = dbAssignmentsForProgrammeInLeaderGroup.length;

    if (selectedProgramme.type === "INDIVIDUAL") {
      const max = selectedProgramme.maxParticipantsPerGroup ?? 1;
      return {
        type: "INDIVIDUAL",
        max,
        existingMembersCount,
        remaining: max - existingMembersCount - selectedNewCount,
      };
    }

    const maxTeams = selectedProgramme.maxTeamsPerGroup ?? 1;
    const maxPerTeam = selectedProgramme.maxParticipantsPerTeam ?? 1;
    const totalCapacity = maxTeams * maxPerTeam;
    return {
      type: "GROUP",
      maxTeams,
      maxPerTeam,
      existingMembersCount,
      remainingSlots: totalCapacity - existingMembersCount - selectedNewCount,
    };
  }, [assignments, selectedProgramme, leaderGroupId, selectedNewCount]);

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

  const toggleParticipant = (participantId: string) => {
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

      // Existing team sizes for this programme+group.
      const existingAssignments = (assignments as any[]).filter((a) => {
        const assignmentProgrammeId = a?.programme?.id ?? a?.programmeId;
        const assignmentGroupId = a?.group?.id ?? a?.participant?.groupId;
        return (
          assignmentProgrammeId === programme.id &&
          assignmentGroupId === leaderGroupId &&
          a?.teamNumber != null
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
        // Prefer existing teams with free space.
        const existingOrdered = [...existingTeams].sort((x, y) => x - y);
        for (const tn of existingOrdered) {
          const count = teamCounts.get(tn) || 0;
          if (count < maxPerTeam) return tn;
        }

        // Otherwise, create new teams in ascending order (within maxTeamsPerGroup).
        if (existingTeams.size >= maxTeams) return null;
        for (let tn = 1; tn <= maxTeams; tn++) {
          if (existingTeams.has(tn)) continue;
          // We can safely create the teamNumber here; bulkCreate will enforce too.
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
    [assignments, leaderGroupId],
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

    // Existing DB assignments in this leader group for this programme.
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

      teamToExistingParticipantIds.get(tn)!.add(a.participant.id);
      participantIdToTeamNumber.set(a.participant.id, tn);
    }

    // Preview newly-selected participants using the same greedy allocation logic as submit.
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
  ]);

  const leaderAssignments = useMemo(() => {
    return (assignments as any[]).filter((a) => {
      const gid =
        a?.group?.id ??
        a?.groupId ??
        a?.participant?.group?.id ??
        a?.participant?.groupId ??
        null;
      return gid === leaderGroupId;
    });
  }, [assignments, leaderGroupId]);

  const groupTeamRows = useMemo(() => {
    const map = new Map<
      string,
      {
        programmeId: string;
        programme: any;
        groupId: string;
        teamNumber: number;
        createdByName?: string | null;
        createdByEmail?: string | null;
        assignedAt?: Date;
        assignments: any[];
      }
    >();

    for (const a of leaderAssignments) {
      if (a?.programme?.type !== "GROUP") continue;

      const programmeId = a?.programme?.id ?? a?.programmeId;
      const groupId = a?.group?.id ?? a?.groupId ?? a?.participant?.group?.id;
      if (!programmeId || !groupId) continue;

      const teamNumber = Number(a?.teamNumber ?? 1);
      const key = `${programmeId}-${groupId}-${teamNumber}`;

      if (!map.has(key)) {
        map.set(key, {
          programmeId,
          programme: a.programme,
          groupId,
          teamNumber,
          createdByName: a.createdByName ?? null,
          createdByEmail: a.createdByEmail ?? null,
          assignedAt: a.assignedAt ? new Date(a.assignedAt) : undefined,
          assignments: [],
        });
      }

      map.get(key)!.assignments.push(a);
    }

    return Array.from(map.values()).sort((x, y) => {
      const a = x.assignedAt?.getTime() ?? 0;
      const b = y.assignedAt?.getTime() ?? 0;
      return b - a;
    });
  }, [leaderAssignments]);

  const individualAssignments = useMemo(() => {
    return leaderAssignments
      .filter((a) => a?.programme?.type === "INDIVIDUAL" && a?.participant?.id)
      .sort((a, b) => {
        const ta = a.assignedAt ? new Date(a.assignedAt).getTime() : 0;
        const tb = b.assignedAt ? new Date(b.assignedAt).getTime() : 0;
        return tb - ta;
      });
  }, [leaderAssignments]);

  const onRemoveIndividualAssignment = async (assignmentId: string) => {
    if (runtimeIsReadOnly) return;
    const ok = window.confirm("Remove this assignment?");
    if (!ok) return;
    await deleteAssignment.mutateAsync({ festivalId, assignmentId });
  };

  const onRemoveTeamAssignment = async (params: {
    programmeId: string;
    groupId: string;
    teamNumber: number;
  }) => {
    if (runtimeIsReadOnly) return;
    const ok = window.confirm(
      `Remove Team ${params.teamNumber} from this programme?`,
    );
    if (!ok) return;
    const assignment = (assignments as any[]).find(
      (a) =>
        (a.programme?.id ?? a.programmeId) === params.programmeId &&
        (a.group?.id ??
          a.groupId ??
          a.participant?.groupId ??
          a.participant?.group?.id) === params.groupId &&
        a.teamNumber === params.teamNumber,
    );
    if (!assignment) {
      toast.error("Assignment not found");
      return;
    }
    await deleteAssignment.mutateAsync({
      festivalId,
      assignmentId: assignment.id,
    });
  };

  /* ── Team leads (PRO) ────────────────────────────────────────────────
     `AssignmentService.bulkCreate` refuses a GROUP assignment when a team
     that gains members has no lead on record, so the leader has to name one
     here. Teams that already have a lead are left alone — the server skips
     them too. */
  const teamsNeedingLead = useMemo(() => {
    if (!requiresTeamLead) return [];
    if (!selectedProgramme || selectedProgramme.type !== "GROUP") return [];
    if (!groupTeamPreview) return [];

    return groupTeamPreview.teams
      .filter((t) => t.newIds.length > 0)
      .filter(
        (t) => !existingTeamLeads[`${selectedProgramme.id}:${t.teamNumber}`],
      )
      .map((t) => ({
        teamNumber: t.teamNumber,
        candidateIds: [...t.existingIds, ...t.newIds],
      }));
  }, [
    requiresTeamLead,
    selectedProgramme,
    groupTeamPreview,
    existingTeamLeads,
  ]);

  const missingTeamLead = teamsNeedingLead.some(
    (t) => !teamLeadChoice[t.teamNumber],
  );

  const onAssign = async () => {
    if (runtimeIsReadOnly) return;
    if (!selectedProgramme) return;
    if (selectedNewCount === 0) {
      toast.error("Select at least one participant");
      return;
    }

    const participantIdsToAssign = selectedParticipants
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

    /* The server keys leads by `${programmeId}:${groupId}:${teamNumber}`. Only
       teams that actually gain members need one. */
    let teamLeadsByTeam: Record<string, string> | undefined;
    if (requiresTeamLead && selectedProgramme.type === "GROUP") {
      const missing = teamsNeedingLead.find(
        (t) => !teamLeadChoice[t.teamNumber],
      );
      if (missing) {
        toast.error(`Choose a team lead for Team ${missing.teamNumber}`);
        return;
      }
      teamLeadsByTeam = {};
      for (const t of teamsNeedingLead) {
        teamLeadsByTeam[
          `${selectedProgramme.id}:${leaderGroupId}:${t.teamNumber}`
        ] = teamLeadChoice[t.teamNumber];
      }
    }

    await bulkCreateAssignments.mutateAsync({
      festivalId,
      data: { assignments: bulkPayload as any[], teamLeadsByTeam },
    });
    setSelectedParticipantIds([]);
    setTeamLeadChoice({});
  };

  /* ── Per-programme capacity for this leader's group ─────────────────
     `limitTracking` only covers the programme currently being edited, but
     the programme list and the drawer both need to know whether a given
     programme still has room. */
  const groupCapacityByProgrammeId = useMemo(() => {
    const getProgrammeId = (a: any) => a?.programmeId ?? a?.programme?.id;
    const getGroupId = (a: any) =>
      a?.groupId ??
      a?.group?.id ??
      a?.participant?.groupId ??
      a?.participant?.group?.id;

    const usedByProgramme = new Map<string, number>();
    for (const a of assignments as any[]) {
      if (getGroupId(a) !== leaderGroupId) continue;
      const pid = getProgrammeId(a);
      if (!pid) continue;
      usedByProgramme.set(pid, (usedByProgramme.get(pid) ?? 0) + 1);
    }

    const map = new Map<
      string,
      { used: number; total: number; isFull: boolean }
    >();
    for (const p of programmes) {
      const total =
        p.type === "INDIVIDUAL"
          ? (p.maxParticipantsPerGroup ?? 1)
          : (p.maxTeamsPerGroup ?? 1) * (p.maxParticipantsPerTeam ?? 1);
      const used = usedByProgramme.get(p.id) ?? 0;
      map.set(p.id, { used, total, isFull: total > 0 && used >= total });
    }
    return map;
  }, [programmes, assignments, leaderGroupId]);

  /** Props carry the full category; assignment payloads may not. */
  const programmeDetailsById = useMemo(
    () => new Map(programmes.map((p) => [p.id, p])),
    [programmes],
  );

  /* ── Assignments, grouped by programme ──────────────────────────────
     The tab used to render one row per team and one per individual
     assignment, so a programme with four teams looked like four unrelated
     entries. Grouping by programme gives one row per programme, with the
     members behind a drawer. */
  const programmeAssignmentRows = useMemo(() => {
    const map = new Map<
      string,
      {
        programmeId: string;
        programme: any;
        assignments: any[];
        teams: Map<number, any[]>;
        lastAssignedAt: number;
      }
    >();

    for (const a of leaderAssignments) {
      const programmeId = a?.programme?.id ?? a?.programmeId;
      if (!programmeId) continue;

      if (!map.has(programmeId)) {
        map.set(programmeId, {
          programmeId,
          programme: a.programme,
          assignments: [],
          teams: new Map(),
          lastAssignedAt: 0,
        });
      }

      const entry = map.get(programmeId)!;
      entry.assignments.push(a);

      const assignedAt = a?.assignedAt ? new Date(a.assignedAt).getTime() : 0;
      if (assignedAt > entry.lastAssignedAt) entry.lastAssignedAt = assignedAt;

      if (a?.programme?.type === "GROUP") {
        const teamNumber = Number(a?.teamNumber ?? 1);
        if (!entry.teams.has(teamNumber)) entry.teams.set(teamNumber, []);
        entry.teams.get(teamNumber)!.push(a);
      }
    }

    return Array.from(map.values()).sort(
      (x, y) => y.lastAssignedAt - x.lastAssignedAt,
    );
  }, [leaderAssignments]);

  const [drawerProgrammeId, setDrawerProgrammeId] = useState<string | null>(
    null,
  );

  const drawerRow = useMemo(
    () =>
      programmeAssignmentRows.find(
        (r) => r.programmeId === drawerProgrammeId,
      ) ?? null,
    [programmeAssignmentRows, drawerProgrammeId],
  );

  /* The Assign flow is a drawer at every width — picking a programme from a
     list and assigning into it are one task, so they belong in one surface
     instead of two columns that only fit on a desktop. */
  const [assignDrawerOpen, setAssignDrawerOpen] = useState(false);

  const openAssignDrawer = useCallback((programmeId: string) => {
    setSelectedProgrammeId(programmeId);
    setParticipantSearch("");
    setParticipantFilter("ALL");
    setAssignDrawerOpen(true);
  }, []);

  /** Jump from the assignments drawer into the assign drawer. */
  const editProgrammeAssignments = useCallback(
    (programme: any) => {
      if (programme?.category?.id) {
        setSelectedProgrammeCategoryId(programme.category.id);
      }
      setSelectedProgrammeType("ALL");
      setDrawerProgrammeId(null);
      setAssignProgrammesTab("ASSIGN");
      openAssignDrawer(programme?.id);
    },
    [openAssignDrawer],
  );

  const onRemoveAssignment = useCallback(
    async (assignmentId: string, label: string) => {
      if (runtimeIsReadOnly) return;
      if (!window.confirm(`Remove ${label} from this programme?`)) return;
      await deleteAssignment.mutateAsync({ festivalId, assignmentId });
    },
    [runtimeIsReadOnly, deleteAssignment, festivalId],
  );

  const visibleParticipants = useMemo(() => {
    if (participantFilter === "ALL") return filteredParticipants;
    return filteredParticipants.filter((s) => {
      const isAssigned = alreadyAssignedParticipantIdsForSelectedProgramme.has(
        s.id,
      );
      return participantFilter === "ASSIGNED" ? isAssigned : !isAssigned;
    });
  }, [
    filteredParticipants,
    participantFilter,
    alreadyAssignedParticipantIdsForSelectedProgramme,
  ]);

  const assignedCountForSelected =
    alreadyAssignedParticipantIdsForSelectedProgramme.size;

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

  const drawerCapacity = drawerRow
    ? groupCapacityByProgrammeId.get(drawerRow.programmeId)
    : undefined;

  // Nothing on this screen is usable before the window opens, so the gate
  // takes over the whole section rather than disabling controls one by one.
  if (isUpcoming) {
    return (
      <div className="pt-5">
        <DeadlineWindowGate
          title="Programme assignments haven't opened yet"
          description="You'll be able to assign your participants to programmes as soon as the window opens."
          start={windowStartDate}
          end={windowEndDate}
        />
      </div>
    );
  }

  return (
    <div className="pt-5">
      <AssignmentModal
        festivalId={festivalId}
        open={assignmentModalOpen}
        onOpenChange={setAssignmentModalOpen}
        isReadOnly={runtimeIsReadOnly}
        fixedGroupId={leaderGroupId}
        categories={programmeCategoryOptions}
        programmes={assignmentModalProgrammes}
        participants={myParticipants}
        assignments={assignments}
        requiresTeamLead={requiresTeamLead}
      />

      <Tabs
        value={assignProgrammesTab}
        onValueChange={(v) =>
          setAssignProgrammesTab(v as "ASSIGN" | "ASSIGNMENTS")
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList className="justify-start gap-1">
            <TabsTrigger value="ASSIGN">Assign</TabsTrigger>
            <TabsTrigger value="ASSIGNMENTS">
              Assignments
              {programmeAssignmentRows.length > 0 && (
                <span className="ml-1.5 text-xs tabular-nums opacity-70">
                  {programmeAssignmentRows.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          {!runtimeIsReadOnly && (
            <Button
              size="sm"
              className="h-9 rounded-full"
              onClick={() => setAssignmentModalOpen(true)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New assignment
            </Button>
          )}
        </div>

        {/* Deadline notice — above both tabs so it is never missed */}
        {runtimeIsReadOnly && (
          <div
            className={cn(
              "mt-4 rounded-2xl border p-4 sm:p-5",
              isUpcoming
                ? "border-amber-500/30 bg-amber-500/[0.06]"
                : "border-destructive/30 bg-destructive/[0.06]",
            )}
          >
            <div className="flex items-start gap-3">
              <ShieldAlert
                className={cn(
                  "mt-0.5 h-5 w-5 shrink-0",
                  isUpcoming ? "text-amber-600" : "text-destructive",
                )}
              />
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-[15px] font-medium",
                    isUpcoming ? "text-amber-600" : "text-destructive",
                  )}
                >
                  {isUpcoming
                    ? "Assignments haven't opened yet"
                    : "Assignments are closed"}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {isUpcoming ? (
                    <>
                      {startLabel
                        ? `Assignments open on ${startLabel}`
                        : "Assignments haven't opened yet"}
                      {deadlineLabel ? ` and close on ${deadlineLabel}.` : "."}{" "}
                      You can look around in the meantime. Contact the festival
                      manager if you need it opened sooner.
                    </>
                  ) : (
                    <>
                      {deadlineLabel
                        ? `The assignment deadline passed on ${deadlineLabel}.`
                        : "The assignment deadline has passed."}{" "}
                      You can still review everything already assigned. Contact
                      the festival manager if something needs to change.
                    </>
                  )}
                </p>

                {(managerName || managerEmail || managerPhone) && (
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
                    {managerName && (
                      <span className="text-muted-foreground">
                        {managerName}
                      </span>
                    )}
                    {managerEmail && (
                      <a
                        href={`mailto:${managerEmail}`}
                        className="inline-flex items-center gap-1.5 font-medium text-primary hover:opacity-70"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {managerEmail}
                      </a>
                    )}
                    {managerPhone && (
                      <a
                        href={`tel:${managerPhone}`}
                        className="inline-flex items-center gap-1.5 font-medium text-primary hover:opacity-70"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        {managerPhone}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Assign: pick a programme, assign inside the drawer ─────── */}
        <TabsContent value="ASSIGN" className="mt-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid grid-cols-2 gap-2 sm:w-auto sm:grid-cols-none sm:grid-flow-col">
              <Select
                value={selectedProgrammeCategoryId}
                onValueChange={setSelectedProgrammeCategoryId}
              >
                <SelectTrigger className="h-9 rounded-full text-sm sm:w-[190px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {programmeCategoryOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedProgrammeType}
                onValueChange={(v) =>
                  setSelectedProgrammeType(v as "ALL" | "GROUP" | "INDIVIDUAL")
                }
              >
                <SelectTrigger className="h-9 rounded-full text-sm sm:w-[160px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All types</SelectItem>
                  <SelectItem value="GROUP">Group</SelectItem>
                  <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <span className="text-xs tabular-nums text-muted-foreground">
              {eligibleProgrammes.length} programme
              {eligibleProgrammes.length === 1 ? "" : "s"}
            </span>
          </div>

          {eligibleProgrammes.length === 0 ? (
            <AppEmptyState
              title="No programmes"
              description="Nothing matches these filters."
            />
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {eligibleProgrammes.map((p) => {
                const capacity = groupCapacityByProgrammeId.get(p.id);
                const isFull = capacity?.isFull ?? false;

                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => openAssignDrawer(p.id)}
                      className="group flex w-full items-center gap-4 py-4 text-left transition-opacity hover:opacity-80"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[15px] font-medium text-heading">
                            {p.name}
                          </span>
                          <ProgrammeStatusBadge
                            status={getUiProgrammeStatus(p)}
                          />
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {p.category.name} ·{" "}
                          {p.type === "GROUP"
                            ? `Team · ${p.maxTeamsPerGroup} teams of ${p.maxParticipantsPerTeam}`
                            : `Individual · max ${p.maxParticipantsPerGroup}`}
                          {p.category.type === "GENERAL"
                            ? " · open to all categories"
                            : ""}
                        </p>
                      </div>

                      <StatusPill
                        tone={isFull ? "live" : "muted"}
                        className="shrink-0 tabular-nums"
                      >
                        {capacity ? `${capacity.used}/${capacity.total}` : "—"}
                      </StatusPill>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        {/* ── Assignments, per programme ─────────────────────────────── */}
        <TabsContent value="ASSIGNMENTS" className="mt-5">
          {programmeAssignmentRows.length === 0 ? (
            <AppEmptyState
              title="Nothing assigned yet"
              description="Once you assign participants to a programme, it will appear here."
            />
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {programmeAssignmentRows.map((row) => {
                const details = programmeDetailsById.get(row.programmeId);
                const isGroup =
                  (details?.type ?? row.programme?.type) === "GROUP";
                const memberCount = row.assignments.length;
                const categoryName =
                  details?.category?.name ?? row.programme?.category?.name;

                return (
                  <li key={row.programmeId}>
                    <button
                      type="button"
                      onClick={() => setDrawerProgrammeId(row.programmeId)}
                      className="group flex w-full items-center gap-4 py-4 text-left transition-opacity hover:opacity-80"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[15px] font-medium text-heading">
                            {row.programme?.name ?? "Programme"}
                          </span>
                          {row.programme && (
                            <ProgrammeStatusBadge
                              status={getUiProgrammeStatus(
                                row.programme as any,
                              )}
                            />
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {categoryName ? `${categoryName} · ` : ""}
                          {isGroup
                            ? `${row.teams.size} team${row.teams.size === 1 ? "" : "s"} · ${memberCount} participant${memberCount === 1 ? "" : "s"}`
                            : `${memberCount} participant${memberCount === 1 ? "" : "s"}`}
                          {row.lastAssignedAt
                            ? ` · last assigned ${format(new Date(row.lastAssignedAt), "PP")}`
                            : ""}
                        </p>
                      </div>

                      <StatusPill
                        tone="muted"
                        className="shrink-0 tabular-nums"
                      >
                        {memberCount}
                      </StatusPill>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Assign drawer ───────────────────────────────────────────── */}
      <Sheet
        open={assignDrawerOpen}
        onOpenChange={(open) => {
          setAssignDrawerOpen(open);
          if (!open) clearSelection();
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
        >
          {selectedProgramme ? (
            <>
              <SheetHeader className="space-y-0 border-b border-border p-5 text-left">
                <SheetTitle className="truncate text-lg font-semibold tracking-tight text-heading">
                  {selectedProgramme.name}
                </SheetTitle>
                <SheetDescription className="text-xs">
                  {selectedProgramme.category.name} ·{" "}
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

              <div className="min-h-0 flex-1 overflow-y-auto p-5">
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
                          {existingTeamLeads[
                            `${selectedProgramme.id}:${t.teamNumber}`
                          ] && (
                            <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Crown className="h-3 w-3 text-primary" />
                              Lead:{" "}
                              {
                                existingTeamLeads[
                                  `${selectedProgramme.id}:${t.teamNumber}`
                                ].name
                              }
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {[...t.existingIds, ...t.newIds].length === 0 ? (
                              <span className="text-xs text-muted-foreground">
                                Empty
                              </span>
                            ) : (
                              [...t.existingIds, ...t.newIds].map((id) => (
                                <span
                                  key={id}
                                  className={cn(
                                    "rounded-full px-2 py-0.5 text-[11px]",
                                    t.newIds.includes(id)
                                      ? "bg-primary/12 text-primary"
                                      : "bg-muted text-muted-foreground",
                                  )}
                                >
                                  {participantByIdLookup.get(id)?.name ?? id}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {teamsNeedingLead.length > 0 && (
                      <div className="mt-4 rounded-xl border border-border p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Team lead required
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Every new team needs a lead before it can be saved.
                        </p>

                        <div className="mt-3 space-y-2">
                          {teamsNeedingLead.map((t) => (
                            <div
                              key={t.teamNumber}
                              className="flex items-center gap-3"
                            >
                              <span className="w-16 shrink-0 text-xs font-medium text-heading">
                                Team {t.teamNumber}
                              </span>
                              <Select
                                value={teamLeadChoice[t.teamNumber] ?? ""}
                                onValueChange={(v) =>
                                  setTeamLeadChoice((prev) => ({
                                    ...prev,
                                    [t.teamNumber]: v,
                                  }))
                                }
                              >
                                <SelectTrigger className="h-9 flex-1 rounded-full text-sm">
                                  <SelectValue placeholder="Choose a lead" />
                                </SelectTrigger>
                                <SelectContent>
                                  {t.candidateIds.map((id) => (
                                    <SelectItem key={id} value={id}>
                                      {participantByIdLookup.get(id)?.name ??
                                        id}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Your participants
                  </h3>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {assignedCountForSelected} already assigned
                  </span>
                </div>

                <div className="mb-3 flex flex-col gap-2">
                  <Input
                    value={participantSearch}
                    onChange={(e) => setParticipantSearch(e.target.value)}
                    placeholder="Search name or chest number"
                    className="h-9 rounded-full text-sm"
                  />
                  <div className="flex gap-1">
                    {(["ALL", "AVAILABLE", "ASSIGNED"] as const).map((f) => (
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
                    ))}
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
                      const checked = selectedParticipantIds.includes(s.id);
                      const isAssignedDB =
                        alreadyAssignedParticipantIdsForSelectedProgramme.has(
                          s.id,
                        );
                      const disableForLimit =
                        !checked && !isAssignedDB && isCapacityFull;
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
                              isAssignedDB && "bg-muted/40",
                              disableForLimit && "opacity-45",
                              !isAssignedDB &&
                                !disableForLimit &&
                                !runtimeIsReadOnly &&
                                "cursor-pointer",
                            )}
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 shrink-0 accent-[var(--primary)]"
                              checked={checked || isAssignedDB}
                              onChange={() => toggleParticipant(s.id)}
                              disabled={
                                runtimeIsReadOnly ||
                                isAssignedDB ||
                                disableForLimit
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

                            {/* Say plainly that they are already in, rather
                                than only fading the row out. */}
                            {isAssignedDB && (
                              <StatusPill tone="live" icon={Check}>
                                Assigned
                              </StatusPill>
                            )}
                            {teamNumber != null && (
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
              </div>

              {/* Sticky action bar — reachable without scrolling back up */}
              <div className="flex items-center justify-between gap-3 border-t border-border p-4">
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={runtimeIsReadOnly || selectedNewCount === 0}
                  className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                >
                  Clear
                </button>

                <Button
                  onClick={onAssign}
                  disabled={
                    runtimeIsReadOnly ||
                    selectedNewCount === 0 ||
                    isOverLimit ||
                    missingTeamLead ||
                    bulkCreateAssignments.isPending
                  }
                  className="h-10 rounded-full px-7"
                >
                  {bulkCreateAssignments.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Assign{selectedNewCount > 0 ? ` ${selectedNewCount}` : ""}
                </Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* ── Assigned-participants drawer ────────────────────────────── */}
      <Sheet
        open={Boolean(drawerRow)}
        onOpenChange={(open) => !open && setDrawerProgrammeId(null)}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto p-0 sm:max-w-lg"
        >
          {drawerRow && (
            <>
              <SheetHeader className="space-y-0 border-b border-border p-5 text-left">
                <div className="flex items-start gap-2">
                  <SheetTitle className="min-w-0 flex-1 text-lg font-semibold tracking-tight text-heading">
                    {drawerRow.programme?.name ?? "Programme"}
                  </SheetTitle>
                  {drawerRow.programme && (
                    <ProgrammeStatusBadge
                      status={getUiProgrammeStatus(drawerRow.programme as any)}
                    />
                  )}
                </div>
                <SheetDescription className="text-xs">
                  {programmeDetailsById.get(drawerRow.programmeId)?.category
                    ?.name ??
                    drawerRow.programme?.category?.name ??
                    "Uncategorised"}{" "}
                  ·{" "}
                  {drawerRow.programme?.type === "GROUP"
                    ? "Team programme"
                    : "Individual programme"}{" "}
                  · {drawerRow.assignments.length} assigned
                  {drawerCapacity ? ` of ${drawerCapacity.total}` : ""}
                </SheetDescription>

                {/* Only offer "Assign more" when there is actually room. */}
                {!runtimeIsReadOnly &&
                  (drawerCapacity?.isFull ? (
                    <p className="pt-4 text-xs text-muted-foreground">
                      This programme is full for your group. Remove someone
                      below to free a slot.
                    </p>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-4 h-9 w-fit rounded-full"
                      onClick={() =>
                        editProgrammeAssignments(
                          programmeDetailsById.get(drawerRow.programmeId) ??
                            drawerRow.programme,
                        )
                      }
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Assign more
                    </Button>
                  ))}
              </SheetHeader>

              <div className="p-5">
                {drawerRow.programme?.type === "GROUP" ? (
                  <div className="space-y-6">
                    {Array.from(drawerRow.teams.entries())
                      .sort((a, b) => a[0] - b[0])
                      .map(([teamNumber, teamAssignments]) => (
                        <div key={teamNumber}>
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              Team {teamNumber}
                              {existingTeamLeads[
                                `${drawerRow.programmeId}:${teamNumber}`
                              ] && (
                                <span className="inline-flex items-center gap-1 normal-case tracking-normal text-primary">
                                  <Crown className="h-3 w-3" />
                                  {
                                    existingTeamLeads[
                                      `${drawerRow.programmeId}:${teamNumber}`
                                    ].name
                                  }
                                </span>
                              )}
                            </h3>
                            {!runtimeIsReadOnly && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 rounded-full px-2.5 text-xs text-destructive hover:text-destructive"
                                disabled={deleteAssignment.isPending}
                                onClick={() =>
                                  onRemoveTeamAssignment({
                                    programmeId: drawerRow.programmeId,
                                    groupId:
                                      teamAssignments[0]?.group?.id ??
                                      teamAssignments[0]?.groupId ??
                                      leaderGroupId,
                                    teamNumber,
                                  })
                                }
                              >
                                <Trash2 className="mr-1 h-3 w-3" />
                                Remove team
                              </Button>
                            )}
                          </div>

                          <ul className="divide-y divide-border border-y border-border">
                            {teamAssignments.map((a: any) => (
                              <AssignedParticipantRow
                                key={a.id}
                                assignment={a}
                                isTeamLead={
                                  existingTeamLeads[
                                    `${drawerRow.programmeId}:${teamNumber}`
                                  ]?.participantId === a.participant?.id
                                }
                                readOnly={runtimeIsReadOnly}
                                pending={deleteAssignment.isPending}
                                onRemove={onRemoveAssignment}
                              />
                            ))}
                          </ul>
                        </div>
                      ))}
                  </div>
                ) : (
                  <ul className="divide-y divide-border border-y border-border">
                    {drawerRow.assignments.map((a: any) => (
                      <AssignedParticipantRow
                        key={a.id}
                        assignment={a}
                        readOnly={runtimeIsReadOnly}
                        pending={deleteAssignment.isPending}
                        onRemove={onRemoveAssignment}
                      />
                    ))}
                  </ul>
                )}

                {runtimeIsReadOnly && (
                  <p className="mt-5 text-xs text-muted-foreground">
                    {isUpcoming
                      ? "Assignments haven't opened yet, so these cannot be changed."
                      : "The assignment deadline has passed, so these cannot be changed."}
                  </p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/** One assigned participant inside the programme drawer. */
function AssignedParticipantRow({
  assignment,
  isTeamLead = false,
  readOnly,
  pending,
  onRemove,
}: {
  assignment: any;
  isTeamLead?: boolean;
  readOnly: boolean;
  pending: boolean;
  onRemove: (assignmentId: string, label: string) => void;
}) {
  const name = assignment?.participant?.name ?? "Participant";

  return (
    <li className="flex items-center gap-3 py-3">
      <span className="w-14 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
        {assignment?.participant?.chestNumber ?? "—"}
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium text-heading">
          {name}
          {isTeamLead && (
            <Crown
              className="h-3 w-3 shrink-0 text-primary"
              aria-label="Team lead"
            />
          )}
        </p>
        {assignment?.assignedAt && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Assigned {format(new Date(assignment.assignedAt), "PP")}
            {assignment.createdByName || assignment.createdByEmail
              ? ` by ${assignment.createdByName || assignment.createdByEmail}`
              : ""}
          </p>
        )}
      </div>

      {!readOnly && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-destructive"
          disabled={pending}
          onClick={() => onRemove(assignment.id, name)}
          aria-label={`Remove ${name}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </li>
  );
}
