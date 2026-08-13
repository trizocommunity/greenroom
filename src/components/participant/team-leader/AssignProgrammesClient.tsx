"use client";

import { useEffect, useState, useMemo } from "react";
import {
  useAssignments,
  useBulkCreateAssignments,
  useDeleteAssignment,
} from "@/api/client/assignments";
import { useDeleteTeamAssignment, useRemoveTeamMember } from "@/api/client";
import { AssignmentModal } from "@/components/festival/pre-event-works/assignments/AssignmentModal";
import { useDeadlineWindow } from "@/features/festivals/hooks/use-deadline-window";
import { toast } from "@/lib/toast";
import { format } from "date-fns";

import { useProgrammeFilters } from "./hooks/useProgrammeFilters";
import { useAssignmentData } from "./hooks/useAssignmentData";
import { ProgrammesTab } from "./components/ProgrammesTab";
import { AssignProgrammeDrawer } from "./components/AssignProgrammeDrawer";

import type { ProgrammeForAssignment, MyParticipantForAssignment } from "./types";

export function AssignProgrammesClient({
  festivalId,
  leaderGroupId,
  leaderCategoryId,
  isReadOnly,
  windowStart,
  deadline,
  canAdd = true,
  canDelete = true,
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
  canAdd?: boolean;
  canDelete?: boolean;
  managerName?: string | null;
  managerEmail?: string | null;
  managerPhone?: string | null;
  groupCount: number;
  programmes: ProgrammeForAssignment[];
  myParticipants: MyParticipantForAssignment[];
  requiresTeamLead?: boolean;
  existingTeamLeads?: Record<string, { participantId: string; name: string }>;
}) {
  const {
    isLocked,
    isUnconfigured,
    isUpcoming,
    justLocked,
    start: windowStartDate,
    end: windowEndDate,
  } = useDeadlineWindow(windowStart ?? null, deadline ?? null);
  
  const runtimeIsReadOnly = isReadOnly || isLocked;
  const tlHasAccess = !runtimeIsReadOnly;
  const canAssign = tlHasAccess && canAdd;
  const canRemove = tlHasAccess && canDelete;

  const { data: assignments = [], refetch } = useAssignments(festivalId);
  const bulkCreateAssignments = useBulkCreateAssignments();
  const deleteAssignment = useDeleteAssignment();
  const deleteTeamAssignment = useDeleteTeamAssignment();
  const removeTeamMember = useRemoveTeamMember();

  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [assignDrawerOpen, setAssignDrawerOpen] = useState(false);
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string | null>(null);

  // Poll for assignments
  useEffect(() => {
    if (!festivalId) return;
    const intervalId = window.setInterval(() => {
      void refetch();
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [festivalId, refetch]);

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

  const {
    groupCapacityByProgrammeId,
  } = useAssignmentData(
    assignments,
    programmes,
    leaderGroupId,
    groupCount,
    "ALL",
    "ALL",
    ""
  );

  const {
    programmeCategoryOptions,
    eligibleProgrammes,
    selectedProgrammeCategoryId,
    selectedProgrammeType,
    programmeSearch,
    assignmentStatusFilter,
    assignPageIndex,
    setSelectedProgrammeCategoryId,
    setSelectedProgrammeType,
    setProgrammeSearch,
    setAssignmentStatusFilter,
    setAssignPageIndex,
  } = useProgrammeFilters(programmes, groupCapacityByProgrammeId);

  const selectedProgramme = useMemo(() => {
    return eligibleProgrammes.find((p) => p.id === selectedProgrammeId) ?? null;
  }, [eligibleProgrammes, selectedProgrammeId]);

  const isProgrammeEditable = selectedProgramme
    ? ["DRAFT", "ASSIGNED", "SCHEDULED"].includes(selectedProgramme.status)
    : false;

  const assignmentModalProgrammes = useMemo(
    () =>
      programmes
        .filter((p) => ["DRAFT", "ASSIGNED", "SCHEDULED"].includes(p.status))
        .map((p) => ({ ...p, categoryId: p.category.id })),
    [programmes],
  );

  const openAssignDrawer = (programmeId: string) => {
    setSelectedProgrammeId(programmeId);
    setAssignDrawerOpen(true);
  };

  return (
    <div className="pt-5">
      <AssignmentModal
        festivalId={festivalId}
        open={assignmentModalOpen}
        onOpenChange={setAssignmentModalOpen}
        isReadOnly={!canAssign}
        fixedGroupId={leaderGroupId}
        categories={programmeCategoryOptions}
        programmes={assignmentModalProgrammes}
        participants={myParticipants}
        assignments={assignments}
        requiresTeamLead={requiresTeamLead}
      />

      <ProgrammesTab 
        isUnconfigured={isUnconfigured}
        runtimeIsReadOnly={runtimeIsReadOnly}
        isUpcoming={isUpcoming}
        tlHasAccess={tlHasAccess}
        canAssign={canAssign}
        canAdd={canAdd}
        canDelete={canDelete}
        startLabel={startLabel}
        deadlineLabel={deadlineLabel}
        managerName={managerName}
        managerEmail={managerEmail}
        managerPhone={managerPhone}
        
        programmeSearch={programmeSearch}
        setProgrammeSearch={setProgrammeSearch}
        selectedProgrammeCategoryId={selectedProgrammeCategoryId}
        setSelectedProgrammeCategoryId={setSelectedProgrammeCategoryId}
        programmeCategoryOptions={programmeCategoryOptions}
        selectedProgrammeType={selectedProgrammeType}
        setSelectedProgrammeType={setSelectedProgrammeType}
        assignmentStatusFilter={assignmentStatusFilter}
        setAssignmentStatusFilter={setAssignmentStatusFilter}
        
        setAssignmentModalOpen={setAssignmentModalOpen}
        
        eligibleProgrammes={eligibleProgrammes}
        assignPageIndex={assignPageIndex}
        setAssignPageIndex={setAssignPageIndex}
        pageSize={15}
        
        groupCapacityByProgrammeId={groupCapacityByProgrammeId}
        openAssignDrawer={openAssignDrawer}
      />

      <AssignProgrammeDrawer 
        festivalId={festivalId}
        leaderGroupId={leaderGroupId}
        open={assignDrawerOpen}
        onOpenChange={setAssignDrawerOpen}
        selectedProgramme={selectedProgramme}
        myParticipants={myParticipants}
        assignments={assignments}
        canAssign={canAssign}
        canRemove={canRemove}
        isProgrammeEditable={isProgrammeEditable}
        requiresTeamLead={requiresTeamLead}
        existingTeamLeads={existingTeamLeads}
        bulkCreateAssignments={bulkCreateAssignments}
        deleteAssignment={deleteAssignment}
        deleteTeamAssignment={deleteTeamAssignment}
        removeTeamMember={removeTeamMember}
        programmeCategoryOptions={programmeCategoryOptions}
      />
    </div>
  );
}
