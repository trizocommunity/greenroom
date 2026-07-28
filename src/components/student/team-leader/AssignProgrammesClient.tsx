"use client";

import { format } from "date-fns";
import {
  CalendarClock,
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
import { ProgrammeStatusBadge } from "@/components/festival/ProgrammeStatusBadge";
import { AssignmentModal } from "@/components/festival/pre-event-works/assignments/AssignmentModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  CategoryType,
  ProgrammeStatus,
  ProgrammeType,
} from "@/core/types/app-enums";
import { useDeadlineLock } from "@/features/festivals/hooks/use-deadline-lock";
import { getProgrammeStatusPriorityRank } from "@/features/programmes/services/programme-status-priority";

type ProgrammeForAssignment = {
  id: string;
  name: string;
  type: ProgrammeType;
  status: ProgrammeStatus;
  maxTeamsPerGroup: number;
  maxStudentsPerTeam: number;
  maxParticipantsPerGroup: number;
  category: { id: string; name: string; type: CategoryType | null };
};

type MyStudentForAssignment = {
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
  deadline,
  managerName,
  managerEmail,
  managerPhone,
  groupCount,
  programmes,
  myStudents,
}: {
  festivalId: string;
  leaderGroupId: string;
  leaderCategoryId: string;
  isReadOnly: boolean;
  deadline?: string | Date | null;
  managerName?: string | null;
  managerEmail?: string | null;
  managerPhone?: string | null;
  groupCount: number;
  programmes: ProgrammeForAssignment[];
  myStudents: MyStudentForAssignment[];
}) {
  const { isLocked, justLocked } = useDeadlineLock(deadline ?? null);
  const runtimeIsReadOnly = isReadOnly || isLocked;

  const {
    data: assignments = [],
    isFetching,
    refetch,
  } = useAssignments(festivalId);
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
  // GENERAL programmes are always allowed for any student selection.
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
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

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

  // Switching programmes changes capacity + already-assigned set.
  // Clear selection so the UI can't carry invalid picks across programmes.
  useEffect(() => {
    if (selectedProgrammeId || !selectedProgrammeId) {
      setSelectedStudentIds([]);
    }
  }, [selectedProgrammeId]);

  const selectedProgramme = useMemo(() => {
    return eligibleProgrammes.find((p) => p.id === selectedProgrammeId) ?? null;
  }, [eligibleProgrammes, selectedProgrammeId]);

  const studentsForSelectedProgramme = useMemo(() => {
    if (!selectedProgramme) return myStudents;
    // GENERAL programmes accept any student category.
    if (selectedProgramme.category.type === "GENERAL") return myStudents;
    // Otherwise, only students matching the programme category can be assigned.
    return myStudents.filter(
      (s) => s.categoryId === selectedProgramme.category.id,
    );
  }, [myStudents, selectedProgramme]);

  const selectedStudents = useMemo(() => {
    const set = new Set(selectedStudentIds);
    return studentsForSelectedProgramme.filter((s) => set.has(s.id));
  }, [studentsForSelectedProgramme, selectedStudentIds]);

  const studentByIdLookup = useMemo(() => {
    return new Map<string, MyStudentForAssignment>(
      myStudents.map((s) => [s.id, s]),
    );
  }, [myStudents]);

  // Mobile UX: quick-search + shortcuts
  const [studentSearch, setStudentSearch] = useState<string>("");
  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return studentsForSelectedProgramme;
    return studentsForSelectedProgramme.filter((s) => {
      const name = s.name.toLowerCase();
      const chest = (s.chestNumber ?? "").toLowerCase();
      return name.includes(q) || chest.includes(q);
    });
  }, [studentsForSelectedProgramme, studentSearch]);

  // NOTE: we display remaining capacity based on only "new" selections
  // (students not already assigned for the selected programme).

  const clearSelection = () => {
    if (runtimeIsReadOnly) return;
    setSelectedStudentIds([]);
  };

  const alreadyAssignedStudentIdsForSelectedProgramme = useMemo(() => {
    if (!selectedProgramme) return new Set<string>();
    const set = new Set<string>();
    for (const a of assignments as any[]) {
      if (a?.programme?.id !== selectedProgramme.id) continue;
      const assignmentGroupId =
        a?.group?.id ?? a?.student?.groupId ?? a?.student?.group?.id;
      if (assignmentGroupId !== leaderGroupId) continue;
      if (!a?.student?.id) continue;
      set.add(a.student.id);
    }
    return set;
  }, [assignments, selectedProgramme, leaderGroupId]);

  const selectedNewStudentIdsToAssign = useMemo(() => {
    if (!selectedProgramme) return [];
    return selectedStudentIds.filter(
      (id) => !alreadyAssignedStudentIdsForSelectedProgramme.has(id),
    );
  }, [
    selectedProgramme,
    selectedStudentIds,
    alreadyAssignedStudentIdsForSelectedProgramme,
  ]);

  const selectedNewCount = selectedNewStudentIdsToAssign.length;

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
          (programme.maxStudentsPerTeam ?? 1);
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
      a?.student?.groupId ??
      a?.student?.group?.id;

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
    const maxPerTeam = selectedProgramme.maxStudentsPerTeam ?? 1;
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

  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds((prev) => {
      const has = prev.includes(studentId);
      if (has) return prev.filter((id) => id !== studentId);
      return [...prev, studentId];
    });
  };

  const allocateTeamsForGroupProgramme = useCallback(
    (
      programme: ProgrammeForAssignment,
      studentIds: string[],
    ): { programmeId: string; studentId: string; teamNumber: number }[] => {
      const maxTeams = programme.maxTeamsPerGroup ?? 1;
      const maxPerTeam = programme.maxStudentsPerTeam ?? 1;

      // Existing team sizes for this programme+group.
      const existingAssignments = (assignments as any[]).filter((a) => {
        const assignmentProgrammeId = a?.programme?.id ?? a?.programmeId;
        const assignmentGroupId = a?.group?.id ?? a?.student?.groupId;
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

      const allocateOneStudent = (): number | null => {
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
        studentId: string;
        teamNumber: number;
      }[] = [];
      for (const studentId of studentIds) {
        const teamNumber = allocateOneStudent();
        if (!teamNumber) {
          return [];
        }
        existingTeams.add(teamNumber);
        teamCounts.set(teamNumber, (teamCounts.get(teamNumber) || 0) + 1);
        result.push({ programmeId: programme.id, studentId, teamNumber });
      }

      return result;
    },
    [assignments, leaderGroupId],
  );

  const groupTeamPreview = useMemo(() => {
    if (!selectedProgramme || selectedProgramme.type !== "GROUP") return null;

    const maxTeams = selectedProgramme.maxTeamsPerGroup ?? 1;
    const maxPerTeam = selectedProgramme.maxStudentsPerTeam ?? 1;

    const teamToExistingStudentIds = new Map<number, Set<string>>();
    const teamToNewStudentIds = new Map<number, Set<string>>();
    const studentIdToTeamNumber = new Map<string, number>();

    for (let tn = 1; tn <= maxTeams; tn++) {
      teamToExistingStudentIds.set(tn, new Set());
      teamToNewStudentIds.set(tn, new Set());
    }

    // Existing DB assignments in this leader group for this programme.
    for (const a of assignments as any[]) {
      const assignmentProgrammeId = a?.programme?.id ?? a?.programmeId;
      const assignmentGroupId =
        a?.group?.id ?? a?.student?.groupId ?? a?.student?.group?.id;

      if (assignmentProgrammeId !== selectedProgramme.id) continue;
      if (assignmentGroupId !== leaderGroupId) continue;
      if (!a?.student?.id) continue;
      if (a?.teamNumber == null) continue;

      const tn = Number(a.teamNumber) || 1;
      if (tn < 1 || tn > maxTeams) continue;

      teamToExistingStudentIds.get(tn)!.add(a.student.id);
      studentIdToTeamNumber.set(a.student.id, tn);
    }

    // Preview newly-selected students using the same greedy allocation logic as submit.
    const payloadPreview = allocateTeamsForGroupProgramme(
      selectedProgramme,
      selectedNewStudentIdsToAssign,
    );

    for (const item of payloadPreview) {
      const tn = item.teamNumber;
      teamToNewStudentIds.get(tn)!.add(item.studentId);
      studentIdToTeamNumber.set(item.studentId, tn);
    }

    const teams = Array.from({ length: maxTeams }, (_, i) => i + 1).map(
      (tn) => {
        const existingIds = Array.from(teamToExistingStudentIds.get(tn) || []);
        const newIds = Array.from(teamToNewStudentIds.get(tn) || []);
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

    return { maxTeams, maxPerTeam, teams, studentIdToTeamNumber };
  }, [
    selectedProgramme,
    assignments,
    leaderGroupId,
    allocateTeamsForGroupProgramme,
    selectedNewStudentIdsToAssign,
  ]);

  const leaderAssignments = useMemo(() => {
    return (assignments as any[]).filter((a) => {
      const gid =
        a?.group?.id ??
        a?.groupId ??
        a?.student?.group?.id ??
        a?.student?.groupId ??
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
      const groupId = a?.group?.id ?? a?.groupId ?? a?.student?.group?.id;
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
      .filter((a) => a?.programme?.type === "INDIVIDUAL" && a?.student?.id)
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
          a.student?.groupId ??
          a.student?.group?.id) === params.groupId &&
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

  const onAssign = async () => {
    if (runtimeIsReadOnly) return;
    if (!selectedProgramme) return;
    if (selectedNewCount === 0) {
      toast.error("Select at least one student");
      return;
    }

    const studentIdsToAssign = selectedStudents
      .map((s) => s.id)
      .filter((id) => !alreadyAssignedStudentIdsForSelectedProgramme.has(id));

    if (studentIdsToAssign.length === 0) {
      toast.error(
        "All selected students are already assigned to this programme",
      );
      return;
    }

    let bulkPayload: {
      programmeId: string;
      studentId: string;
      teamNumber?: number;
    }[] = [];

    if (selectedProgramme.type === "GROUP") {
      const payload = allocateTeamsForGroupProgramme(
        selectedProgramme,
        studentIdsToAssign,
      );
      if (payload.length === 0) {
        toast.error("Not enough team capacity for the selected students");
        return;
      }
      bulkPayload = payload;
    } else {
      bulkPayload = studentIdsToAssign.map((studentId) => ({
        programmeId: selectedProgramme.id,
        studentId,
      }));
    }

    await bulkCreateAssignments.mutateAsync({
      festivalId,
      data: { assignments: bulkPayload as any[] },
    });
    setSelectedStudentIds([]);
  };

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
        students={myStudents}
        assignments={assignments}
      />
      <Tabs
        value={assignProgrammesTab}
        onValueChange={(v) => {
          setAssignProgrammesTab(v as "ASSIGN" | "ASSIGNMENTS");
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList className="justify-start gap-2">
            <TabsTrigger value="ASSIGN">Assign</TabsTrigger>
            <TabsTrigger value="ASSIGNMENTS">Assignments</TabsTrigger>
          </TabsList>
          {!runtimeIsReadOnly && (
            <Button size="sm" onClick={() => setAssignmentModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Assignment
            </Button>
          )}
        </div>

        <TabsContent value="ASSIGN">
          {runtimeIsReadOnly ? (
            <Card className="mt-3 w-full min-h-[60vh] border-destructive/30 bg-destructive/5">
              <CardContent className="h-full min-h-[60vh] flex items-center justify-center px-6 py-12">
                <div className="w-full max-w-4xl space-y-2 text-left md:text-center items-center justify-start">
                  <div className="md:mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                    <ShieldAlert className="h-6 w-6" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold tracking-tight text-destructive">
                      Assignment window closed
                    </h3>
                    <p className="leading-tight text-sm sm:text-base text-destructive/90">
                      Deadline passed -{" "}
                      {deadlineLabel ?? "time/date unavailable"}. <br />
                      Please contact the festival manager to request further
                      changes.
                    </p>
                  </div>

                  <div className="pt-4 mx-auto grid w-full max-w-2xl gap-2 text-left sm:grid-cols-2">
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
                      <span className="inline-flex items-center gap-2 font-medium text-destructive">
                        <CalendarClock className="h-4 w-4" />
                        Deadline
                      </span>
                      <div className="mt-1 text-destructive/90">
                        {deadlineLabel ?? "Not available"}
                      </div>
                    </div>

                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
                      <span className="font-medium text-destructive">
                        Manager
                      </span>
                      <div className="mt-1 text-destructive/90 wrap-break-word">
                        {managerName || "Festival Manager"}
                      </div>
                    </div>

                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
                      <span className="inline-flex items-center gap-2 font-medium text-destructive">
                        <Phone className="h-4 w-4" />
                        Contact number
                      </span>
                      <div className="mt-1 text-destructive/90">
                        {managerPhone || "Not available"}
                      </div>
                    </div>

                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
                      <span className="inline-flex items-center gap-2 font-medium text-destructive">
                        <Mail className="h-4 w-4" />
                        Email
                      </span>
                      <div className="mt-1 text-destructive/90 wrap-break-word">
                        {managerEmail || "Not available"}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
          {!runtimeIsReadOnly ? (
            <>
              {/* Desktop layout */}
              <div className="hidden lg:grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-1">
                  <Card className="h-full p-0">
                    <CardHeader className="pb-3">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <CardTitle className="text-base">
                            Select Programme
                          </CardTitle>
                          {eligibleProgrammes.length ? (
                            <Badge
                              variant="outline"
                              className="text-xs hidden sm:inline-flex"
                            >
                              {eligibleProgrammes.length} available
                            </Badge>
                          ) : null}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <Select
                            value={selectedProgrammeCategoryId}
                            onValueChange={setSelectedProgrammeCategoryId}
                          >
                            <SelectTrigger className="h-9 w-full sm:w-[180px]">
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
                              setSelectedProgrammeType(
                                v as "ALL" | "GROUP" | "INDIVIDUAL",
                              )
                            }
                          >
                            <SelectTrigger className="h-9 w-full sm:w-[170px]">
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALL">All types</SelectItem>
                              <SelectItem value="GROUP">Group</SelectItem>
                              <SelectItem value="INDIVIDUAL">
                                Individual
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="h-[60vh]">
                        <div className="space-y-2 p-4 pt-0">
                          {eligibleProgrammes.length === 0 ? (
                            <div className="text-sm text-muted-foreground">
                              No programmes available.
                            </div>
                          ) : (
                            eligibleProgrammes.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setSelectedProgrammeId(p.id)}
                                className={[
                                  "w-full text-left rounded-lg border p-3 transition-colors",
                                  p.id === selectedProgrammeId
                                    ? "bg-muted/60 border-primary/30"
                                    : "hover:bg-muted/40",
                                ].join(" ")}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="font-medium truncate">
                                      {p.name}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                      <Badge
                                        variant={
                                          p.type === "GROUP"
                                            ? "secondary"
                                            : "outline"
                                        }
                                        className="text-[10px] h-5"
                                      >
                                        {p.type === "GROUP"
                                          ? "Group"
                                          : "Individual"}
                                      </Badge>
                                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                        {p.type === "GROUP"
                                          ? `Teams: ${p.maxTeamsPerGroup} · Size: ${p.maxStudentsPerTeam}`
                                          : `Max: ${p.maxParticipantsPerGroup}`}
                                      </span>
                                      {p.category.type === "GENERAL" && (
                                        <span className="text-[10px] text-muted-foreground italic">
                                          General — open to all categories
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <ProgrammeStatusBadge
                                    status={getUiProgrammeStatus(p)}
                                  />
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
                <div className="lg:col-span-2">
                  <Card className="h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        Assign My Students
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedProgramme ? (
                        <>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">
                              Selected: {selectedProgramme.name}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {limitTracking?.type === "GROUP"
                                ? `Capacity: ${limitTracking.existingMembersCount}/${limitTracking.maxTeams * limitTracking.maxPerTeam} · Remaining: ${Math.max(0, limitTracking.remainingSlots)}`
                                : limitTracking?.type === "INDIVIDUAL"
                                  ? `Capacity: ${limitTracking.existingMembersCount}/${limitTracking.max} · Remaining: ${Math.max(0, limitTracking.remaining)}`
                                  : "Capacity: —"}
                            </Badge>
                            {!runtimeIsReadOnly &&
                            (isOverLimit || isCapacityFull) ? (
                              <div
                                className={[
                                  "inline-flex items-center gap-2 rounded-md border px-2 py-0.5 text-xs font-semibold",
                                  isOverLimit
                                    ? "border-destructive bg-destructive text-destructive-foreground"
                                    : "border-destructive bg-destructive text-destructive-foreground",
                                ].join(" ")}
                              >
                                {isOverLimit
                                  ? "Limit exceeded"
                                  : "Programme capacity reached"}
                              </div>
                            ) : null}
                          </div>

                          {selectedProgramme.type === "GROUP" &&
                          groupTeamPreview ? (
                            <div className="space-y-2">
                              <div className="text-sm font-medium">Teams</div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {groupTeamPreview.teams.map((t) => (
                                  <div
                                    key={t.teamNumber}
                                    className={[
                                      "rounded-lg border p-3",
                                      t.isFull
                                        ? "border-destructive/30 bg-destructive/5"
                                        : "bg-muted/10",
                                    ].join(" ")}
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="font-semibold text-sm">
                                        Team {t.teamNumber}
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {t.used}/{groupTeamPreview.maxPerTeam}
                                      </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Remaining: {t.remaining}
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {[...t.existingIds, ...t.newIds].map(
                                        (id) => (
                                          <Badge
                                            key={id}
                                            variant="secondary"
                                            className="text-[10px] h-5 px-2 bg-muted/40"
                                          >
                                            {studentByIdLookup.get(id)?.name ??
                                              id}
                                          </Badge>
                                        ),
                                      )}
                                      {t.existingIds.length +
                                        t.newIds.length ===
                                      0 ? (
                                        <span className="text-xs text-muted-foreground">
                                          —
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          <div className="space-y-2">
                            <div className="text-sm font-medium">Students</div>
                            <ScrollArea className="h-[45vh] rounded-lg border p-2">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {studentsForSelectedProgramme.map((s) => {
                                  const checked = selectedStudentIds.includes(
                                    s.id,
                                  );
                                  const isAssignedDB =
                                    alreadyAssignedStudentIdsForSelectedProgramme.has(
                                      s.id,
                                    );
                                  const disableForLimit =
                                    !checked && !isAssignedDB && isCapacityFull;
                                  return (
                                    <label
                                      key={s.id}
                                      className={[
                                        "flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors",
                                        checked
                                          ? "bg-amber-500/10 border-amber-500/30"
                                          : "",
                                        disableForLimit
                                          ? "opacity-40 cursor-not-allowed bg-muted/20"
                                          : "",
                                        isAssignedDB ? "opacity-60" : "",
                                      ].join(" ")}
                                    >
                                      <span className="min-w-0">
                                        <span className="font-medium truncate block">
                                          {s.name}
                                        </span>
                                        {s.chestNumber ? (
                                          <span className="text-xs text-muted-foreground">
                                            {s.chestNumber}
                                          </span>
                                        ) : null}
                                        {selectedProgramme.type === "GROUP" &&
                                        groupTeamPreview ? (
                                          <div className="mt-1">
                                            <Badge
                                              variant="outline"
                                              className="text-[10px] h-5 px-2"
                                            >
                                              T
                                              {groupTeamPreview.studentIdToTeamNumber.get(
                                                s.id,
                                              ) ?? "?"}
                                            </Badge>
                                          </div>
                                        ) : null}
                                      </span>
                                      <input
                                        type="checkbox"
                                        className="h-4 w-4"
                                        checked={checked}
                                        onChange={() => toggleStudent(s.id)}
                                        disabled={
                                          runtimeIsReadOnly ||
                                          isAssignedDB ||
                                          disableForLimit
                                        }
                                      />
                                    </label>
                                  );
                                })}
                              </div>
                            </ScrollArea>
                          </div>

                          <div className="flex items-center justify-end gap-2">
                            <Button
                              onClick={onAssign}
                              disabled={
                                runtimeIsReadOnly ||
                                selectedNewCount === 0 ||
                                isOverLimit ||
                                bulkCreateAssignments.isPending
                              }
                              className={
                                runtimeIsReadOnly
                                  ? "opacity-60 cursor-not-allowed"
                                  : ""
                              }
                            >
                              {bulkCreateAssignments.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              )}
                              Assign
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          Select a programme to continue.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Mobile layout */}
              <div className="lg:hidden space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      Choose programme
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-col gap-2">
                      <Select
                        value={selectedProgrammeCategoryId}
                        onValueChange={setSelectedProgrammeCategoryId}
                      >
                        <SelectTrigger className="h-10 w-full">
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
                          setSelectedProgrammeType(
                            v as "ALL" | "GROUP" | "INDIVIDUAL",
                          )
                        }
                      >
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All types</SelectItem>
                          <SelectItem value="GROUP">Group</SelectItem>
                          <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                        </SelectContent>
                      </Select>

                      <Sheet>
                        <SheetTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-between"
                            type="button"
                          >
                            <span className="truncate">
                              {selectedProgramme
                                ? selectedProgramme.name
                                : "Select a programme"}
                            </span>
                            <ProgrammeStatusBadge
                              status={
                                selectedProgramme
                                  ? getUiProgrammeStatus(selectedProgramme)
                                  : "READY"
                              }
                            />
                          </Button>
                        </SheetTrigger>

                        <SheetContent className="p-4">
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <div>
                              <div className="font-semibold">Programmes</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Tap one to continue
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {eligibleProgrammes.length} available
                            </Badge>
                          </div>

                          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                            {eligibleProgrammes.length === 0 ? (
                              <div className="text-sm text-muted-foreground">
                                No programmes available.
                              </div>
                            ) : (
                              eligibleProgrammes.map((p) => {
                                const isSelected = p.id === selectedProgrammeId;
                                return (
                                  <SheetClose asChild key={p.id}>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setSelectedProgrammeId(p.id)
                                      }
                                      className={[
                                        "w-full text-left rounded-lg border p-3 transition-colors",
                                        isSelected
                                          ? "bg-muted/60 border-primary/30"
                                          : "hover:bg-muted/40",
                                      ].join(" ")}
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <div className="font-medium truncate">
                                            {p.name}
                                          </div>
                                          <div className="text-xs text-muted-foreground mt-1">
                                            {p.type === "GROUP"
                                              ? "Group"
                                              : "Individual"}
                                          </div>
                                        </div>
                                        <ProgrammeStatusBadge
                                          status={getUiProgrammeStatus(p)}
                                        />
                                      </div>
                                    </button>
                                  </SheetClose>
                                );
                              })
                            )}
                          </div>
                        </SheetContent>
                      </Sheet>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Assign students</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedProgramme ? (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="bg-muted/40">
                            Selected: {selectedProgramme.name}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {limitTracking?.type === "GROUP"
                              ? `Capacity: ${limitTracking.existingMembersCount}/${limitTracking.maxTeams * limitTracking.maxPerTeam} · Remaining: ${Math.max(0, limitTracking.remainingSlots)}`
                              : limitTracking?.type === "INDIVIDUAL"
                                ? `Capacity: ${limitTracking.existingMembersCount}/${limitTracking.max} · Remaining: ${Math.max(0, limitTracking.remaining)}`
                                : "Capacity: —"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {selectedNewCount} selected
                          </Badge>
                        </div>

                        {!runtimeIsReadOnly &&
                        (isOverLimit || isCapacityFull) ? (
                          <div
                            className={[
                              "inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs font-semibold",
                              isOverLimit
                                ? "border-destructive bg-destructive text-destructive-foreground"
                                : "border-destructive bg-destructive text-destructive-foreground",
                            ].join(" ")}
                          >
                            {isOverLimit
                              ? "Limit exceeded"
                              : "Programme capacity reached"}
                          </div>
                        ) : null}

                        {selectedProgramme.type === "GROUP" &&
                        groupTeamPreview ? (
                          <div className="space-y-2">
                            <div className="text-sm font-medium">Teams</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {groupTeamPreview.teams.map((t) => (
                                <div
                                  key={t.teamNumber}
                                  className={[
                                    "rounded-lg border p-3",
                                    t.isFull
                                      ? "border-destructive/30 bg-destructive/5"
                                      : "bg-muted/10",
                                  ].join(" ")}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="font-semibold text-sm">
                                      Team {t.teamNumber}
                                    </div>
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {t.used}/{groupTeamPreview.maxPerTeam}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Remaining: {t.remaining}
                                  </div>
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {[...t.existingIds, ...t.newIds].map(
                                      (id) => (
                                        <Badge
                                          key={id}
                                          variant="secondary"
                                          className="text-[10px] h-5 px-2 bg-muted/40"
                                        >
                                          {studentByIdLookup.get(id)?.name ??
                                            id}
                                        </Badge>
                                      ),
                                    )}
                                    {t.existingIds.length + t.newIds.length ===
                                    0 ? (
                                      <span className="text-xs text-muted-foreground">
                                        —
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        <div className="space-y-2">
                          <Input
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                            placeholder="Search students (name or chest #)"
                            className="w-full"
                            disabled={runtimeIsReadOnly}
                          />

                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={clearSelection}
                              disabled={
                                runtimeIsReadOnly || selectedNewCount === 0
                              }
                            >
                              Clear
                            </Button>
                          </div>

                          <div className="text-sm font-medium">
                            Students ({filteredStudents.length})
                          </div>
                        </div>

                        <div className="max-h-[48vh] overflow-y-auto pr-1 space-y-2">
                          {filteredStudents.length === 0 ? (
                            <div className="text-sm text-muted-foreground">
                              No students match your search.
                            </div>
                          ) : (
                            filteredStudents.map((s) => {
                              const checked = selectedStudentIds.includes(s.id);
                              const isAssignedDB =
                                alreadyAssignedStudentIdsForSelectedProgramme.has(
                                  s.id,
                                );
                              const disableForLimit =
                                !checked && !isAssignedDB && isCapacityFull;
                              return (
                                <label
                                  key={s.id}
                                  className={[
                                    "flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors",
                                    checked
                                      ? "bg-amber-500/10 border-amber-500/30"
                                      : "",
                                    disableForLimit
                                      ? "opacity-40 cursor-not-allowed bg-muted/20"
                                      : "",
                                    isAssignedDB ? "opacity-60" : "",
                                  ].join(" ")}
                                >
                                  <span className="min-w-0">
                                    <span className="font-medium truncate block">
                                      {s.name}
                                    </span>
                                    {s.chestNumber ? (
                                      <span className="text-xs text-muted-foreground">
                                        {s.chestNumber}
                                      </span>
                                    ) : null}
                                    {selectedProgramme.type === "GROUP" &&
                                    groupTeamPreview ? (
                                      <div className="mt-1">
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] h-5 px-2"
                                        >
                                          T
                                          {groupTeamPreview.studentIdToTeamNumber.get(
                                            s.id,
                                          ) ?? "?"}
                                        </Badge>
                                      </div>
                                    ) : null}
                                  </span>
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4"
                                    checked={checked}
                                    onChange={() => toggleStudent(s.id)}
                                    disabled={
                                      runtimeIsReadOnly ||
                                      isAssignedDB ||
                                      disableForLimit
                                    }
                                  />
                                </label>
                              );
                            })
                          )}
                        </div>

                        <div className="sticky bottom-0 z-10 pt-3 bg-background/95 backdrop-blur border-t -mx-4 px-4 mt-1">
                          <Button
                            className="w-full"
                            onClick={onAssign}
                            disabled={
                              runtimeIsReadOnly ||
                              selectedNewCount === 0 ||
                              isOverLimit ||
                              bulkCreateAssignments.isPending
                            }
                          >
                            {bulkCreateAssignments.isPending && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Assign ({selectedNewCount})
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        Select a programme to continue.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </TabsContent>
        <TabsContent value="ASSIGNMENTS">
          <div className="space-y-4 pt-3">
            {leaderAssignments.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No assignments found for your group.
              </div>
            ) : (
              <div className="space-y-4">
                {groupTeamRows.length ? (
                  <div className="space-y-2">
                    <div className="text-sm font-semibold">
                      Group Programmes (Teams)
                    </div>
                    <div className="space-y-2">
                      {groupTeamRows.map((row) => (
                        <div
                          key={`${row.programmeId}-${row.groupId}-${row.teamNumber}`}
                          className="rounded-xl border p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold truncate">
                                  {row.programme?.name ?? "—"}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  Team {row.teamNumber}
                                </Badge>
                                {row.programme ? (
                                  <ProgrammeStatusBadge
                                    status={getUiProgrammeStatus(
                                      row.programme as any,
                                    )}
                                  />
                                ) : null}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Assigned on{" "}
                                {row.assignedAt
                                  ? format(row.assignedAt, "PP")
                                  : "—"}{" "}
                                by{" "}
                                {row.createdByName || row.createdByEmail || "—"}
                              </div>
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() =>
                                onRemoveTeamAssignment({
                                  programmeId: row.programmeId,
                                  groupId: row.groupId,
                                  teamNumber: row.teamNumber,
                                })
                              }
                              disabled={
                                runtimeIsReadOnly || deleteAssignment.isPending
                              }
                              type="button"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2">
                            {row.assignments.map((a) => (
                              <Badge
                                key={a.id}
                                variant="outline"
                                className="text-xs bg-muted/20"
                              >
                                {a.student?.name ?? "—"}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {individualAssignments.length ? (
                  <div className="space-y-2">
                    <div className="text-sm font-semibold">
                      Individual Programmes
                    </div>
                    <div className="space-y-2">
                      {individualAssignments.map((a) => (
                        <div
                          key={a.id}
                          className="rounded-xl border p-3 flex items-start justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold truncate">
                                {a.programme?.name ?? "—"}
                              </span>
                              {a.programme ? (
                                <ProgrammeStatusBadge
                                  status={getUiProgrammeStatus(
                                    a.programme as any,
                                  )}
                                />
                              ) : null}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {a.student?.name ?? "—"} · Assigned on{" "}
                              {a.assignedAt
                                ? format(new Date(a.assignedAt), "PP")
                                : "—"}{" "}
                              by {a.createdByName || a.createdByEmail || "—"}
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => onRemoveIndividualAssignment(a.id)}
                            disabled={
                              runtimeIsReadOnly || deleteAssignment.isPending
                            }
                            type="button"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
