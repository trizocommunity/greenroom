import { useMemo } from "react";
import type { ProgrammeForAssignment } from "../types";

export function useAssignmentData(
  assignments: any[],
  programmes: ProgrammeForAssignment[],
  leaderGroupId: string,
  groupCount: number,
  assignmentsProgrammeType: string,
  assignmentsCategoryId: string,
  assignmentsSearch: string
) {
  const groupCapacityByProgrammeId = useMemo(() => {
    const getProgrammeId = (a: any) => a?.programmeId ?? a?.programme?.id;
    const getGroupId = (a: any) =>
      a?.groupId ??
      a?.group?.id ??
      a?.participant?.groupId ??
      a?.participant?.group?.id;

    const usedByProgramme = new Map<string, number>();
    for (const a of assignments) {
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

  const assignmentCountByProgrammeId = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assignments) {
      const programmeId = a?.programme?.id ?? a?.programmeId;
      if (!programmeId) continue;
      map.set(programmeId, (map.get(programmeId) || 0) + 1);
    }
    return map;
  }, [assignments]);

  const getUiProgrammeStatus = (programme: ProgrammeForAssignment) => {
    const assignmentCount = assignmentCountByProgrammeId.get(programme.id) || 0;
    const expectedPerGroup =
      programme.type === "INDIVIDUAL"
        ? (programme.maxParticipantsPerGroup ?? 1)
        : (programme.maxTeamsPerGroup ?? 1) *
          (programme.maxParticipantsPerTeam ?? 1);
    const expectedTotal = groupCount * expectedPerGroup;
    const isFullyAssignedAcrossAllGroups =
      assignmentCount >= expectedTotal && expectedTotal > 0;

    if (programme.status === "DRAFT" || programme.status === "ASSIGNED") {
      return isFullyAssignedAcrossAllGroups ? "ASSIGNED" : "DRAFT";
    }

    return programme.status;
  };

  const leaderAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const gid =
        a?.group?.id ??
        a?.groupId ??
        a?.participant?.group?.id ??
        a?.participant?.groupId ??
        null;
      return gid === leaderGroupId;
    });
  }, [assignments, leaderGroupId]);

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

    return Array.from(map.values()).sort((x, y) => {
      const timeDiff = y.lastAssignedAt - x.lastAssignedAt;
      if (timeDiff !== 0) return timeDiff;
      return (x.programme?.name ?? "").localeCompare(y.programme?.name ?? "");
    });
  }, [leaderAssignments]);

  const filteredProgrammeAssignmentRows = useMemo(() => {
    return programmeAssignmentRows.filter((row) => {
      if (
        assignmentsProgrammeType !== "ALL" &&
        row.programme?.type !== assignmentsProgrammeType
      )
        return false;
      if (
        assignmentsCategoryId !== "ALL" &&
        row.programme?.category?.id !== assignmentsCategoryId
      )
        return false;
      if (assignmentsSearch.trim() !== "") {
        const q = assignmentsSearch.toLowerCase();
        if (!row.programme?.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [
    programmeAssignmentRows,
    assignmentsProgrammeType,
    assignmentsCategoryId,
    assignmentsSearch,
  ]);

  return {
    groupCapacityByProgrammeId,
    assignmentCountByProgrammeId,
    getUiProgrammeStatus,
    leaderAssignments,
    programmeAssignmentRows,
    filteredProgrammeAssignmentRows,
  };
}
