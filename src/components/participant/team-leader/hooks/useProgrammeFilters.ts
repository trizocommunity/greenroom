import { useEffect, useMemo, useState } from "react";
import type { CategoryType } from "@/core/types/app-enums";
import { getProgrammeStatusPriorityRank } from "@/features/programmes/services/programme-status-priority";
import type { ProgrammeForAssignment } from "../types";

export function useProgrammeFilters(
  programmes: ProgrammeForAssignment[],
  groupCapacityByProgrammeId: Map<
    string,
    { used: number; total: number; isFull: boolean }
  >,
) {
  const sortedProgrammes = useMemo(() => {
    return [...programmes].sort((a, b) => {
      const rankDiff =
        getProgrammeStatusPriorityRank(a.status) -
        getProgrammeStatusPriorityRank(b.status);
      if (rankDiff !== 0) return rankDiff;
      return a.name.localeCompare(b.name);
    });
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

  const [selectedProgrammeCategoryId, setSelectedProgrammeCategoryId] =
    useState<string>("ALL");
  const [selectedProgrammeType, setSelectedProgrammeType] = useState<
    "ALL" | "GROUP" | "INDIVIDUAL"
  >("ALL");
  const [programmeSearch, setProgrammeSearch] = useState("");
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState<
    "ALL" | "COMPLETED" | "NOT_COMPLETED"
  >("ALL");
  const [assignPageIndex, setAssignPageIndex] = useState(0);

  const selectedProgrammeCategoryType = useMemo(() => {
    return (
      programmeCategoryOptions.find((c) => c.id === selectedProgrammeCategoryId)
        ?.type ?? null
    );
  }, [programmeCategoryOptions, selectedProgrammeCategoryId]);

  useEffect(() => {
    setAssignPageIndex(0);
  }, []);

  useEffect(() => {
    if (!programmeCategoryOptions.length) return;
    if (selectedProgrammeCategoryId === "ALL") return;
    if (
      programmeCategoryOptions.some((c) => c.id === selectedProgrammeCategoryId)
    ) {
      return;
    }
    setSelectedProgrammeCategoryId("ALL");
  }, [programmeCategoryOptions, selectedProgrammeCategoryId]);

  const eligibleProgrammes = useMemo(() => {
    return sortedProgrammes.filter((p) => {
      if (selectedProgrammeType !== "ALL" && p.type !== selectedProgrammeType)
        return false;

      if (selectedProgrammeCategoryType === "GENERAL") {
        return p.category.type === "GENERAL";
      }

      if (programmeSearch.trim() !== "") {
        const q = programmeSearch.toLowerCase();
        if (!p.name.toLowerCase().includes(q)) return false;
      }

      if (assignmentStatusFilter !== "ALL") {
        const capacity = groupCapacityByProgrammeId.get(p.id);
        const isCompleted = capacity?.isFull ?? false;
        if (assignmentStatusFilter === "COMPLETED" && !isCompleted)
          return false;
        if (assignmentStatusFilter === "NOT_COMPLETED" && isCompleted)
          return false;
      }

      if (selectedProgrammeCategoryId === "ALL") {
        return true;
      }

      return p.category.id === selectedProgrammeCategoryId;
    });
  }, [
    sortedProgrammes,
    selectedProgrammeCategoryId,
    selectedProgrammeType,
    selectedProgrammeCategoryType,
    programmeSearch,
    assignmentStatusFilter,
    groupCapacityByProgrammeId,
  ]);

  return {
    programmeCategoryOptions,
    eligibleProgrammes,

    // State values
    selectedProgrammeCategoryId,
    selectedProgrammeType,
    programmeSearch,
    assignmentStatusFilter,
    assignPageIndex,

    // State setters
    setSelectedProgrammeCategoryId,
    setSelectedProgrammeType,
    setProgrammeSearch,
    setAssignmentStatusFilter,
    setAssignPageIndex,
  };
}
