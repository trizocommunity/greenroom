"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Plus, Search, Trash2, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAssignments, useDeleteAssignment } from "@/api/client/assignments";
import { useCategories } from "@/api/client/categories";
import { useGroups } from "@/api/client/groups";
import { useProgrammes } from "@/api/client/programmes";
import { useStudents } from "@/api/client/students";
import { HowItWorksButton } from "@/components/dashboard/HowItWorksButton";
import { DeadlinesCard } from "@/components/festival/pre-event-works/DeadlinesCard";
import { ProgrammeActivityTimeline } from "@/components/festival/pre-event-works/programmes/ProgrammeActivityTimeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { parseStoredInstant } from "@/core/utils/date-time";
import {
  deleteAssignmentAction,
  deleteTeamAssignmentAction,
} from "@/features/assignments/actions/assignment.actions";
import { useDeadlineLock } from "@/features/festivals/hooks/use-deadline-lock";
import { useFestivalReadOnly } from "@/features/festivals/hooks/use-festival-read-only";
import { useFeatureTag } from "@/features/plan-features/hooks/use-feature";
import { getProgrammeDetailForDrawerAction } from "@/features/programmes/actions/programme.actions";
import { AssignmentModal } from "./AssignmentModal";

type IndividualAssignmentRow = {
  kind: "individual";
  assignment: any;
};

type GroupTeamRow = {
  kind: "team";
  programme: any;
  category: any;
  groupId: string;
  groupName: string;
  teamNumber: number;
  assignments: any[];
  assignedAt: string | null;
  latestAssignedAtDate: Date | null;
};

type AssignmentTableRow = IndividualAssignmentRow | GroupTeamRow;

type GroupBreakdown = {
  id: string;
  name: string;
  current: number;
  target: number;
  percent: number;
};

type ProgrammeCardRow = {
  programmeId: string;
  programmeName: string;
  programmeType: "INDIVIDUAL" | "GROUP";
  categoryName: string | null;
  categoryId: string | null;
  attendeesCount: number;
  teamCount: number;
  assignedAt: string | null;
  latestAssignedAtDate: Date | null;
  progress: number;
  progressLabel: string;
  groupBreakdown: GroupBreakdown[];
  rows: AssignmentTableRow[];
};

function ProgrammeCard({
  programmeName,
  categoryName,
  assignedAt,
  progress,
  progressLabel,
  groupBreakdown,
  onViewDetails,
}: {
  programmeName: string;
  categoryName: string | null;
  assignedAt: string | null;
  progress: number;
  progressLabel: string;
  groupBreakdown: GroupBreakdown[];
  onViewDetails: () => void;
}) {
  const isComplete = progress === 100;
  return (
    <button
      type="button"
      onClick={onViewDetails}
      className="group rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm transition-all text-left hover:shadow-md hover:border-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      <div className="flex items-start gap-2 px-3 py-2.5 bg-muted/25 border-b border-border/50">
        <div className="min-w-0 flex-1">
          <span className="block font-semibold truncate text-sm">
            {programmeName}
          </span>
          {categoryName ? (
            <span className="block text-[11px] text-muted-foreground truncate mt-0.5">
              {categoryName}
            </span>
          ) : (
            <span className="block text-[11px] text-muted-foreground mt-0.5">
              Uncategorized
            </span>
          )}
        </div>
      </div>
      <div className="p-3 space-y-3">
        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-semibold">
            <span className="text-muted-foreground">Assignment Progress</span>
            <span
              className={
                isComplete
                  ? "text-green-600 dark:text-green-500"
                  : "text-primary"
              }
            >
              {progressLabel} ({progress}%)
            </span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Group-wise Breakdown on Card */}
        {groupBreakdown.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[9px] font-bold uppercase text-muted-foreground/70 block">
              Group Progress
            </span>
            <div className="grid grid-cols-2 border rounded-lg p-2 gap-4">
              {groupBreakdown.map((g) => (
                <div key={g.id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2 text-[9.5px]">
                    <span className="font-medium truncate text-muted-foreground">
                      {g.name}
                    </span>
                    <span className="tabular-nums font-semibold">
                      {g.current}/{g.target}
                    </span>
                  </div>
                  <Progress
                    value={g.percent}
                    className="h-1 bg-muted/30"
                    indicatorClassName={
                      g.percent === 100
                        ? "bg-green-500/80"
                        : g.percent > 0
                          ? "bg-primary/80"
                          : ""
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 text-xs px-0.5">
          <span className="text-muted-foreground">Last assigned</span>
          <span className="font-medium text-foreground italic">
            {assignedAt ?? "—"}
          </span>
        </div>
      </div>
    </button>
  );
}

interface AssignmentsClientProps {
  festivalId: string;
  programmeAssignmentDeadline?: Date | null;
  children?: React.ReactNode;
}

export function AssignmentsClient({
  festivalId,
  programmeAssignmentDeadline,
  children,
}: AssignmentsClientProps) {
  const { data: assignments = [], isLoading: isAssignmentsLoading } =
    useAssignments(festivalId);
  const deleteAssignment = useDeleteAssignment();
  const { data: programmes = [] } = useProgrammes(festivalId);
  const { data: categories = [] } = useCategories(festivalId);
  const { data: groups = [] } = useGroups(festivalId);
  const { data: students = [], isLoading: isStudentsLoading } =
    useStudents(festivalId);

  const isLoading = isAssignmentsLoading || isStudentsLoading;

  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: "individual"; assignment: any }
    | { kind: "team"; row: GroupTeamRow }
    | null
  >(null);
  const [selectedProgrammeCard, setSelectedProgrammeCard] =
    useState<ProgrammeCardRow | null>(null);
  const [detailsSearch, setDetailsSearch] = useState("");

  const canUseTeamLead = useFeatureTag("programme.teamLead");
  const canUseAuditDrawer = useFeatureTag("programme.auditDrawer");
  const { data: programmeDetail, isLoading: programmeDetailLoading } = useQuery(
    {
      queryKey: [
        "programme-detail-drawer",
        festivalId,
        selectedProgrammeCard?.programmeId,
      ],
      queryFn: () =>
        getProgrammeDetailForDrawerAction(
          festivalId,
          selectedProgrammeCard!.programmeId,
        ),
      enabled: Boolean(selectedProgrammeCard?.programmeId),
      staleTime: 30_000,
    },
  );

  // Global Filters
  const [filterGroup, setFilterGroup] = useState<string>("ALL");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const { isLocked: isReadOnly, justLocked } = useDeadlineLock(
    programmeAssignmentDeadline ?? null,
  );
  const { isReadOnly: isFestivalReadOnly } = useFestivalReadOnly();
  const isReadOnlyMode = isReadOnly || isFestivalReadOnly;

  // If deadline expires while the modal is open, close it to prevent confusing UX.
  useEffect(() => {
    if (isReadOnlyMode) setAssignmentModalOpen(false);
  }, [isReadOnlyMode]);

  useEffect(() => {
    if (!justLocked) return;
    toast.error("Deadline passed. Assignments are closed.");
  }, [justLocked]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a: any) => {
      if (filterGroup !== "ALL") {
        const assignmentGroupId = a.group?.id || a.student?.groupId;
        if (assignmentGroupId !== filterGroup) return false;
      }
      if (filterCategory !== "ALL") {
        const categoryId = a.category?.id || a.programme?.categoryId;
        if (categoryId !== filterCategory) return false;
      }
      if (filterType !== "ALL") {
        if (a.programme?.type !== filterType) return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const studentName = a.student?.name?.toLowerCase() || "";
        const programmeName = a.programme?.name?.toLowerCase() || "";
        const groupName =
          (a.group?.name || a.student?.group?.name)?.toLowerCase() || "";
        if (
          !studentName.includes(query) &&
          !programmeName.includes(query) &&
          !groupName.includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [assignments, filterGroup, filterCategory, filterType, searchQuery]);

  const tableRows = useMemo<AssignmentTableRow[]>(() => {
    const rows: AssignmentTableRow[] = [];
    const teamMap = new Map<
      string,
      {
        programme: any;
        category: any;
        groupId: string;
        groupName: string;
        teamNumber: number;
        assignments: any[];
        latestAssignedAtDate: Date | null;
      }
    >();

    for (const a of filteredAssignments) {
      if (a.programme?.type === "GROUP") {
        const gid = a.group?.id || a.student?.groupId;
        if (!gid) continue;
        const tn = a.teamNumber ?? 1;
        const key = `${a.programmeId}-${gid}-${tn}`;
        const groupName = a.group?.name || a.student?.group?.name || "Unknown";
        if (!teamMap.has(key)) {
          teamMap.set(key, {
            programme: a.programme,
            category: a.category || a.programme?.category,
            groupId: gid,
            groupName,
            teamNumber: tn,
            assignments: [],
            latestAssignedAtDate: null,
          });
        }
        const bucket = teamMap.get(key)!;
        bucket.assignments.push(a);
        const dt = a.assignedAt ? parseStoredInstant(a.assignedAt) : null;
        if (
          dt &&
          (!bucket.latestAssignedAtDate || dt > bucket.latestAssignedAtDate)
        ) {
          bucket.latestAssignedAtDate = dt;
        }
      } else {
        rows.push({ kind: "individual", assignment: a });
      }
    }

    teamMap.forEach((val) => {
      const assignedAt = val.assignments[0]?.assignedAt
        ? format(parseStoredInstant(val.assignments[0].assignedAt), "PP")
        : null;
      rows.push({
        kind: "team",
        programme: val.programme,
        category: val.category,
        groupId: val.groupId,
        groupName: val.groupName,
        teamNumber: val.teamNumber,
        assignments: val.assignments,
        assignedAt,
        latestAssignedAtDate: val.latestAssignedAtDate,
      });
    });

    return rows;
  }, [filteredAssignments]);

  const programmeCards = useMemo<ProgrammeCardRow[]>(() => {
    const map = new Map<
      string,
      Omit<ProgrammeCardRow, "progress" | "progressLabel"> & {
        progress: number;
        progressLabel: string;
      }
    >();

    for (const row of tableRows) {
      const programme =
        row.kind === "individual" ? row.assignment.programme : row.programme;
      if (!programme?.id) continue;

      if (!map.has(programme.id)) {
        const catId =
          (row.kind === "individual"
            ? row.assignment.programme?.categoryId
            : row.programme?.categoryId) ?? null;

        map.set(programme.id, {
          programmeId: programme.id,
          programmeName: programme.name ?? "—",
          programmeType: programme.type,
          categoryName:
            (row.kind === "individual"
              ? row.assignment.category?.name ||
                row.assignment.programme?.category?.name
              : row.category?.name || row.programme?.category?.name) ?? null,
          categoryId: catId,
          attendeesCount: 0,
          teamCount: 0,
          assignedAt: null,
          latestAssignedAtDate: null,
          progress: 0,
          progressLabel: "",
          groupBreakdown: [],
          rows: [],
        });
      }

      const card = map.get(programme.id)!;
      card.rows.push(row);

      if (row.kind === "individual") {
        card.attendeesCount += 1;
        const dt = row.assignment.assignedAt
          ? parseStoredInstant(row.assignment.assignedAt)
          : null;
        if (
          dt &&
          (!card.latestAssignedAtDate || dt > card.latestAssignedAtDate)
        ) {
          card.latestAssignedAtDate = dt;
        }
      } else {
        card.attendeesCount += row.assignments.length;
        card.teamCount += 1;
        const dt = row.latestAssignedAtDate;
        if (
          dt &&
          (!card.latestAssignedAtDate || dt > card.latestAssignedAtDate)
        ) {
          card.latestAssignedAtDate = dt;
        }
      }
    }

    // Compute progress per card
    const cards = Array.from(map.values()).map((c) => {
      c.assignedAt = c.latestAssignedAtDate
        ? format(c.latestAssignedAtDate, "PP")
        : null;

      // Find the source programme object to get maxParticipantsPerGroup/maxTeamsPerGroup
      const progInfo = programmes.find((p) => p.id === c.programmeId);
      const catInfo = categories.find((cat: any) => cat.id === c.categoryId);
      const isGeneral = catInfo?.type === "GENERAL";

      // Eligible student pool for this programme's category
      const eligibleStudents =
        isGeneral || !c.categoryId
          ? students
          : students.filter((s: any) => s.categoryId === c.categoryId);

      // Group students by groupId to calculated group-wise capacity
      const studentCountByGroup = new Map<string, number>();
      for (const s of eligibleStudents) {
        const gid = s.groupId ?? "";
        studentCountByGroup.set(gid, (studentCountByGroup.get(gid) || 0) + 1);
      }

      let totalTarget = 0;
      let currentProgress = 0;
      let label = "";

      if (c.programmeType === "GROUP") {
        const maxTeams = progInfo?.maxTeamsPerGroup || 1;
        const maxStudentsPerTeam = progInfo?.maxStudentsPerTeam || 1;

        // A group can form a team if they have at least 1 student (ignoring strict size for now as per usual festival flow)
        // Or should we be strict? Usually, if they have any students, they are expected to form teams up to max.
        // Let's count groups that have at least one eligible student.
        const eligibleGroupsCount = studentCountByGroup.size;
        totalTarget = eligibleGroupsCount * maxTeams;
        currentProgress = c.teamCount;
        label = `${currentProgress}/${totalTarget} Team${totalTarget !== 1 ? "s" : ""}`;
      } else {
        const maxPerGroup = progInfo?.maxParticipantsPerGroup || 1;

        // Total target is the sum of min(maxPerGroup, studentsInGroup) for all groups
        studentCountByGroup.forEach((count) => {
          totalTarget += Math.min(maxPerGroup, count);
        });

        currentProgress = c.attendeesCount;
        label = `${currentProgress}/${totalTarget} Student${totalTarget !== 1 ? "s" : ""}`;
      }

      c.progress =
        totalTarget > 0
          ? Math.min(100, Math.round((currentProgress / totalTarget) * 100))
          : 0;
      c.progressLabel = label;

      // Calculate Group-wise Breakdown for the card
      const limit =
        c.programmeType === "GROUP"
          ? progInfo?.maxTeamsPerGroup || 1
          : progInfo?.maxParticipantsPerGroup || 1;

      const breakdown: GroupBreakdown[] = Array.from(studentCountByGroup.keys())
        .map((gId) => {
          const group = groups.find((g: any) => g.id === gId);
          if (!group) return null;

          let current = 0;
          if (c.programmeType === "GROUP") {
            current = c.rows.filter(
              (r): r is GroupTeamRow => r.kind === "team" && r.groupId === gId,
            ).length;
          } else {
            current = c.rows.filter(
              (r): r is IndividualAssignmentRow =>
                r.kind === "individual" &&
                (r.assignment.groupId === gId ||
                  r.assignment.student?.groupId === gId),
            ).length;
          }

          const groupTotal = studentCountByGroup.get(gId) || 0;
          const target =
            c.programmeType === "GROUP" ? limit : Math.min(limit, groupTotal);

          return {
            id: gId,
            name: group.name,
            current,
            target,
            percent:
              target > 0
                ? Math.min(100, Math.round((current / target) * 100))
                : 0,
          };
        })
        .filter((b): b is GroupBreakdown => b !== null)
        .sort((a, b) => b.percent - a.percent);

      c.groupBreakdown = breakdown;

      return c;
    });

    cards.sort((a, b) => {
      const at = a.latestAssignedAtDate?.getTime() ?? 0;
      const bt = b.latestAssignedAtDate?.getTime() ?? 0;
      if (bt !== at) return bt - at;
      return a.programmeName.localeCompare(b.programmeName, undefined, {
        sensitivity: "base",
      });
    });

    return cards;
  }, [tableRows, students, programmes, categories, groups]);

  const hasFilters =
    filterGroup !== "ALL" ||
    filterCategory !== "ALL" ||
    filterType !== "ALL" ||
    searchQuery.trim() !== "";

  const clearFilters = () => {
    setFilterGroup("ALL");
    setFilterCategory("ALL");
    setFilterType("ALL");
    setSearchQuery("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AssignmentModal
        festivalId={festivalId}
        open={assignmentModalOpen}
        onOpenChange={setAssignmentModalOpen}
        isReadOnly={isReadOnlyMode}
      />

      {/* Header row */}
      <div className="flex flex-row items-center justify-between gap-4">
        {children ?? (
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Programme Assignments
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-0.5">
              Manage student assignments to programmes.
            </p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <HowItWorksButton
            title="How Assignments work"
            description="Assign students or teams to programmes."
          >
            <p className="text-sm text-muted-foreground">
              <strong>Individual programmes:</strong> Assign one student per
              entry. Each row is one student.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Team programmes:</strong> Assign teams. Each team can have
              multiple members; one result per team. Use &quot;New
              assignment&quot; to pick a programme, then add students to the
              queue to form teams.
            </p>
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-left">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                <strong>Note:</strong> Creating new assignments is only
                available on laptop or large screens. On smaller devices you can
                view and remove assignments.
              </p>
            </div>
          </HowItWorksButton>
          <div className="flex items-center">
            <DeadlinesCard isLockedOverride={isReadOnlyMode} />
          </div>
          <div className="hidden md:block">
            <Button
              size="sm"
              onClick={() => setAssignmentModalOpen(true)}
              disabled={isReadOnlyMode}
            >
              <Plus className="h-4 w-4 mr-2" />
              New assignment
            </Button>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="overflow-hidden">
        <CardHeader className="p-3 sm:p-4 border-b bg-muted/5">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
            <div className="relative w-full sm:w-auto sm:min-w-[180px] sm:max-w-[240px] order-first">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search attendee, programme, group..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                inputSize="s"
                className="w-full pl-8 sm:w-[230px]"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-9 w-full sm:w-[150px] text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {categories.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterGroup} onValueChange={setFilterGroup}>
              <SelectTrigger className="h-9 w-full sm:w-[140px] text-xs">
                <SelectValue placeholder="Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All groups</SelectItem>
                {groups.map((g: any) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-9 w-full sm:w-[170px] text-xs">
                <SelectValue placeholder="Programme type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                <SelectItem value="GROUP">Group</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-full sm:w-9 shrink-0"
                onClick={clearFilters}
                title="Clear filters"
              >
                <X className="h-3.5 w-3.5 sm:mr-0" />
                <span className="sm:hidden">Clear filters</span>
              </Button>
            )}
            <span className="text-xs text-muted-foreground sm:ml-auto">
              {programmeCards.length} programme
              {programmeCards.length !== 1 ? "s" : ""}
            </span>
          </div>
        </CardHeader>
      </Card>

      {/* Programme Cards */}
      {programmeCards.length === 0 ? (
        <Card className="rounded-xl border border-dashed bg-muted/20">
          <CardContent className="py-16 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="font-medium text-muted-foreground">
              No assignments found
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Try changing filters or add a new assignment.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {programmeCards.map((card) => (
            <ProgrammeCard
              key={card.programmeId}
              programmeName={card.programmeName}
              categoryName={card.categoryName}
              assignedAt={card.assignedAt}
              progress={card.progress}
              progressLabel={card.progressLabel}
              groupBreakdown={card.groupBreakdown}
              onViewDetails={() => {
                setDetailsSearch("");
                setSelectedProgrammeCard(card);
              }}
            />
          ))}
        </div>
      )}

      {/* Delete Dialogs */}
      <DeleteDialog
        open={deleteTarget?.kind === "individual"}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove assignment"
        description={
          deleteTarget?.kind === "individual"
            ? `Remove ${deleteTarget.assignment.student?.name} from ${deleteTarget.assignment.programme?.name}?`
            : ""
        }
        onDelete={async () => {
          if (deleteTarget?.kind === "individual") {
            await deleteAssignment.mutateAsync({
              festivalId,
              assignmentId: deleteTarget.assignment.id,
            });
            setDeleteTarget(null);
          }
        }}
        isDeleting={deleteAssignment.isPending}
      />
      <DeleteDialog
        open={deleteTarget?.kind === "team"}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove team"
        description={
          deleteTarget?.kind === "team"
            ? `Remove this team from ${deleteTarget.row.programme?.name}? All members will be unassigned.`
            : ""
        }
        onDelete={async () => {
          if (deleteTarget?.kind === "team") {
            await deleteTeamAssignmentAction(
              festivalId,
              deleteTarget.row.programme?.id,
              deleteTarget.row.groupId,
              deleteTarget.row.teamNumber,
            );
            setDeleteTarget(null);
          }
        }}
        isDeleting={false}
      />

      {/* Programme Details Drawer */}
      <Drawer
        open={Boolean(selectedProgrammeCard)}
        onOpenChange={(open) => {
          if (!open) setSelectedProgrammeCard(null);
        }}
      >
        <DrawerContent>
          <DrawerHeader className="shrink-0">
            <DrawerTitle>Programme details</DrawerTitle>
          </DrawerHeader>
          {selectedProgrammeCard ? (
            <div className="space-y-4 p-4 pt-0 overflow-y-auto flex-1 min-h-0">
              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Programme:</span>{" "}
                  <span className="font-medium">
                    {selectedProgrammeCard.programmeName}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span>{" "}
                  {selectedProgrammeCard.programmeType}
                </div>
                <div>
                  <span className="text-muted-foreground">Attendees:</span>{" "}
                  {selectedProgrammeCard.attendeesCount}
                </div>
                {selectedProgrammeCard.programmeType === "GROUP" ? (
                  <div>
                    <span className="text-muted-foreground">Teams:</span>{" "}
                    {selectedProgrammeCard.teamCount}
                  </div>
                ) : null}
              </div>

              {/* Panel A — lifecycle summary (always visible) */}
              {programmeDetailLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading programme
                  summary…
                </div>
              ) : programmeDetail ? (
                <div className="rounded-lg border bg-muted/10 p-3 space-y-2 text-xs">
                  <div className="text-[10px] font-bold uppercase text-muted-foreground">
                    Summary
                  </div>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    <div>
                      Reporting:{" "}
                      {programmeDetail.reportingSession?.startedAt ? (
                        <span>
                          started
                          {programmeDetail.reportingSession.startedByName
                            ? ` by ${programmeDetail.reportingSession.startedByName}`
                            : ""}
                          {programmeDetail.reportingSession.endedAt
                            ? `, closed${
                                programmeDetail.reportingSession.endedByName
                                  ? ` by ${programmeDetail.reportingSession.endedByName}`
                                  : ""
                              }`
                            : ""}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          not started
                        </span>
                      )}
                    </div>
                    <div>
                      Reported: {programmeDetail.counts.reported}/
                      {programmeDetail.counts.totalAssigned}
                    </div>
                    <div>
                      Judging:{" "}
                      {programmeDetail.judgingSession ? (
                        <span>
                          {programmeDetail.judgingSession.judgeCount} judge(s)
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          not configured
                        </span>
                      )}
                    </div>
                    <div>Scored: {programmeDetail.counts.scored}</div>
                    <div>
                      Results:{" "}
                      {programmeDetail.results.savedAt ? (
                        <span>
                          saved
                          {programmeDetail.results.savedByName
                            ? ` by ${programmeDetail.results.savedByName}`
                            : ""}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">not saved</span>
                      )}
                    </div>
                    <div>
                      Published: {programmeDetail.counts.published} · Announced:{" "}
                      {programmeDetail.counts.announced}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Panel B — programme team leads (PRO, GROUP only) */}
              {canUseTeamLead &&
              selectedProgrammeCard.programmeType === "GROUP" &&
              programmeDetail &&
              Object.keys(programmeDetail.teamLeads).length > 0 ? (
                <div className="rounded-lg border bg-muted/10 p-3 space-y-2 text-xs">
                  <div className="text-[10px] font-bold uppercase text-muted-foreground">
                    Team Leads
                  </div>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {Object.entries(programmeDetail.teamLeads).flatMap(
                      ([groupId, teams]) =>
                        Object.entries(teams).map(([teamNumber, lead]) => (
                          <div key={`${groupId}:${teamNumber}`}>
                            Team {teamNumber}:{" "}
                            <span className="font-medium">
                              {lead.studentName}
                            </span>{" "}
                            {lead.chestNumber ? `(#${lead.chestNumber})` : ""}
                          </div>
                        )),
                    )}
                  </div>
                </div>
              ) : null}

              {/* Panel C — audit timeline (PRO) */}
              {canUseAuditDrawer ? (
                <div className="rounded-lg border overflow-hidden">
                  <div className="border-b bg-muted/10 px-3 py-2 text-[10px] font-bold uppercase text-muted-foreground">
                    Activity
                  </div>
                  <ProgrammeActivityTimeline
                    entries={programmeDetail?.auditTimeline ?? []}
                    isLoading={programmeDetailLoading}
                    className="p-3"
                  />
                </div>
              ) : null}

              {/* Progress in detail view */}
              <div className="rounded-lg border bg-muted/10 p-3 space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
                    <span className="text-muted-foreground">
                      Total Assignment Progress
                    </span>
                    <span
                      className={
                        selectedProgrammeCard.progress === 100
                          ? "text-green-600 dark:text-green-500"
                          : "text-primary"
                      }
                    >
                      {selectedProgrammeCard.progressLabel} (
                      {selectedProgrammeCard.progress}%)
                    </span>
                  </div>
                  <Progress
                    value={selectedProgrammeCard.progress}
                    className="h-2"
                  />
                </div>

                <Separator className="opacity-50" />

                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                    Group-wise Breakdown
                  </span>
                  <div className="grid gap-2 sm:grid-cols-2 max-h-40 overflow-y-auto pr-1">
                    {(() => {
                      const progInfo = programmes.find(
                        (p) => p.id === selectedProgrammeCard.programmeId,
                      );
                      const catInfo = categories.find(
                        (cat: any) =>
                          cat.id === selectedProgrammeCard.categoryId,
                      );
                      const isGeneral = catInfo?.type === "GENERAL";

                      const eligibleStudents =
                        isGeneral || !selectedProgrammeCard.categoryId
                          ? students
                          : students.filter(
                              (s: any) =>
                                s.categoryId ===
                                selectedProgrammeCard.categoryId,
                            );

                      // Groups that have at least one eligible student
                      const eligibleGroupIds = Array.from(
                        new Set(eligibleStudents.map((s: any) => s.groupId)),
                      );

                      const limit =
                        selectedProgrammeCard.programmeType === "GROUP"
                          ? progInfo?.maxTeamsPerGroup || 1
                          : progInfo?.maxParticipantsPerGroup || 1;

                      return eligibleGroupIds
                        .map((gId) => {
                          const group = groups.find((g: any) => g.id === gId);
                          if (!group) return null;

                          // Current count for THIS group
                          let current = 0;
                          if (selectedProgrammeCard.programmeType === "GROUP") {
                            current = selectedProgrammeCard.rows.filter(
                              (r): r is GroupTeamRow =>
                                r.kind === "team" && r.groupId === gId,
                            ).length;
                          } else {
                            current = selectedProgrammeCard.rows.filter(
                              (r): r is IndividualAssignmentRow =>
                                r.kind === "individual" &&
                                (r.assignment.groupId === gId ||
                                  r.assignment.student?.groupId === gId),
                            ).length;
                          }

                          // Target for THIS specific group
                          const groupStudentCount = eligibleStudents.filter(
                            (s: any) => s.groupId === gId,
                          ).length;
                          const target =
                            selectedProgrammeCard.programmeType === "GROUP"
                              ? limit
                              : Math.min(limit, groupStudentCount);

                          const percent =
                            target > 0
                              ? Math.min(
                                  100,
                                  Math.round((current / target) * 100),
                                )
                              : 0;

                          return {
                            id: gId,
                            name: group.name,
                            current,
                            target,
                            percent,
                          };
                        })
                        .filter(Boolean)
                        .sort((a, b) => (b?.percent ?? 0) - (a?.percent ?? 0))
                        .map((g: any) => (
                          <div
                            key={g.id}
                            className="bg-card border rounded p-2 flex flex-col gap-1.5"
                          >
                            <div className="flex items-center justify-between gap-2 overflow-hidden">
                              <span className="text-[11px] font-medium truncate">
                                {g.name}
                              </span>
                              <span className="text-[10px] tabular-nums text-muted-foreground whitespace-nowrap">
                                {g.current}/{g.target}
                              </span>
                            </div>
                            <Progress value={g.percent} className="h-1" />
                          </div>
                        ));
                    })()}
                  </div>
                </div>
              </div>

              <Input
                inputSize="s"
                placeholder="Search attendees by name, chest number or group..."
                value={detailsSearch}
                onChange={(e) => setDetailsSearch(e.target.value)}
              />

              {selectedProgrammeCard.programmeType === "INDIVIDUAL" ? (
                <div className="space-y-2 max-h-80 overflow-auto pr-1">
                  {selectedProgrammeCard.rows
                    .filter(
                      (r): r is IndividualAssignmentRow =>
                        r.kind === "individual",
                    )
                    .filter((r) => {
                      const q = detailsSearch.trim().toLowerCase();
                      if (!q) return true;
                      const s = r.assignment.student;
                      const g =
                        r.assignment.group || r.assignment.student?.group;
                      return (
                        (s?.name ?? "").toLowerCase().includes(q) ||
                        (s?.chestNumber ?? "").toLowerCase().includes(q) ||
                        (g?.name ?? "").toLowerCase().includes(q)
                      );
                    })
                    .map((r) => (
                      <div
                        key={r.assignment.id}
                        className="rounded-md border p-2 text-sm flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">
                              {r.assignment.student?.name ?? "—"}
                            </span>
                            {r.assignment.student?.isTeamLeader && (
                              <Badge
                                variant="secondary"
                                className="h-4 px-1 text-[9px] uppercase font-bold bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
                              >
                                Team Leader
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            #{r.assignment.student?.chestNumber ?? "—"} ·{" "}
                            {r.assignment.group?.name ||
                              r.assignment.student?.group?.name ||
                              "—"}{" "}
                            ·{" "}
                            {r.assignment.assignedAt
                              ? format(
                                  parseStoredInstant(r.assignment.assignedAt),
                                  "PPp",
                                )
                              : "—"}
                            {r.assignment.createdByName && (
                              <span className="ml-1 text-[10px] opacity-70 italic">
                                (by {r.assignment.createdByName})
                              </span>
                            )}
                          </div>
                        </div>
                        {!isReadOnlyMode ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive h-8"
                            onClick={() =>
                              setDeleteTarget({
                                kind: "individual",
                                assignment: r.assignment,
                              })
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Remove
                          </Button>
                        ) : null}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-auto pr-1">
                  {selectedProgrammeCard.rows
                    .filter((r): r is GroupTeamRow => r.kind === "team")
                    .filter((row) => {
                      const q = detailsSearch.trim().toLowerCase();
                      if (!q) return true;
                      if (row.groupName.toLowerCase().includes(q)) return true;
                      if (`team ${row.teamNumber}`.includes(q)) return true;
                      return row.assignments.some((a: any) => {
                        const s = a.student;
                        return (
                          (s?.name ?? "").toLowerCase().includes(q) ||
                          (s?.chestNumber ?? "").toLowerCase().includes(q)
                        );
                      });
                    })
                    .map((row) => (
                      <div
                        key={`${row.groupId}:${row.teamNumber}`}
                        className="rounded-md border p-3"
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="text-sm font-medium">
                            {row.groupName} - Team {row.teamNumber}
                          </div>
                          {!isReadOnlyMode ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive h-8"
                              onClick={() =>
                                setDeleteTarget({ kind: "team", row })
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              Remove team
                            </Button>
                          ) : null}
                        </div>
                        <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5 flex-wrap">
                          <span>
                            Attendees: {row.assignments.length} · Assigned at:{" "}
                            {row.assignedAt ?? "—"}
                          </span>
                          {row.assignments[0]?.createdByName && (
                            <span className="opacity-70 italic text-[10px]">
                              (by {row.assignments[0].createdByName})
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          {row.assignments.map((a: any) => (
                            <div
                              key={a.id}
                              className="text-xs flex items-center gap-1.5"
                            >
                              <span>
                                {a.student?.name ?? "—"}{" "}
                                <span className="text-muted-foreground">
                                  (#{a.student?.chestNumber ?? "—"})
                                </span>
                              </span>
                              {a.student?.isTeamLeader && (
                                <Badge
                                  variant="secondary"
                                  className="h-3.5 px-1 text-[8px] uppercase font-bold bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
                                >
                                  Leader
                                </Badge>
                              )}
                              {canUseTeamLead &&
                                programmeDetail?.teamLeads[row.groupId]?.[
                                  row.teamNumber
                                ]?.studentId ===
                                  (a.student?.id ?? a.studentId) && (
                                  <Badge
                                    variant="secondary"
                                    className="h-3.5 px-1 text-[8px] uppercase font-bold bg-primary/10 text-primary border-primary/30"
                                  >
                                    Lead
                                  </Badge>
                                )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ) : null}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
