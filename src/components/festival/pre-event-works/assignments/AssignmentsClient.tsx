"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, Loader2, Plus, Search, Trash2, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useAssignments, useDeleteAssignment } from "@/api/client/assignments";
import { useCategories } from "@/api/client/categories";
import { useGroups } from "@/api/client/groups";
import { useParticipants } from "@/api/client/participants";
import { useProgrammes } from "@/api/client/programmes";
import { StatusPill } from "@/components/app/AppSection";
import { HowItWorksButton } from "@/components/dashboard/HowItWorksButton";
import {
  ProgrammeStatusBadge,
  STATUS_LABELS,
} from "@/components/festival/ProgrammeStatusBadge";
import { useDisplayTimezone } from "@/components/providers/user-timezone-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatDate,
  formatDateTime,
  isAfter,
  parseInstant,
} from "@/core/datetime";
import {
  deleteAssignmentAction,
  deleteTeamAssignmentAction,
} from "@/features/assignments/actions/assignment.actions";
import { useFestivalReadOnly } from "@/features/festivals/hooks/use-festival-read-only";
import { useFeatureTag } from "@/features/plan-features/hooks/use-feature";
import { getProgrammeDetailForDrawerAction } from "@/features/programmes/actions/programme.actions";
import { toast } from "@/lib/toast";
import { AssignmentModal } from "./AssignmentModal";
import { ProgrammeActivityTimeline } from "../programmes/ProgrammeActivityTimeline";

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
  status: string | null;
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
  programmeType,
  categoryName,
  status,
  assignedAt,
  progress,
  progressLabel,
  groupBreakdown,
  onViewDetails,
}: {
  programmeName: string;
  programmeType: "INDIVIDUAL" | "GROUP";
  categoryName: string | null;
  status: string | null;
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
          <span className="block text-[11px] text-muted-foreground truncate mt-0.5">
            {categoryName || "Uncategorized"}
            {programmeType === "GROUP" ? " · Group" : " · Individual"}
          </span>
        </div>
        {status && (
          <ProgrammeStatusBadge
            status={status as any}
            className="text-[10px] shrink-0"
          />
        )}
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
  children?: React.ReactNode;
}

export function AssignmentsClient({
  festivalId,
  children,
}: AssignmentsClientProps) {
  const { data: assignments = [], isLoading: isAssignmentsLoading } =
    useAssignments(festivalId);
  const deleteAssignment = useDeleteAssignment();
  const queryClient = useQueryClient();
  const { data: programmes = [] } = useProgrammes(festivalId);
  const { data: categories = [] } = useCategories(festivalId);
  const { data: groups = [] } = useGroups(festivalId);
  const { data: participants = [], isLoading: isParticipantsLoading } =
    useParticipants(festivalId);

  const isLoading = isAssignmentsLoading || isParticipantsLoading;

  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: "individual"; assignment: any }
    | { kind: "team"; row: GroupTeamRow }
    | null
  >(null);
  const [selectedProgrammeCard, setSelectedProgrammeCard] =
    useState<ProgrammeCardRow | null>(null);
  const [detailsSearch, setDetailsSearch] = useState("");
  const [detailsTab, setDetailsTab] = useState<"OVERVIEW" | "ASSIGNMENTS">(
    "OVERVIEW",
  );

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
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 15;

  useEffect(() => {
    setPageIndex(0);
  }, [filterGroup, filterCategory, filterType, filterStatus, searchQuery]);

  // The assignment deadline gates Team Leaders only — organisers can always
  // assign from the dashboard, so only the festival lifecycle locks this view.
  const { isReadOnly: isFestivalReadOnly } = useFestivalReadOnly();
  const isReadOnlyMode = isFestivalReadOnly;
  const displayTz = useDisplayTimezone();

  useEffect(() => {
    if (isReadOnlyMode) setAssignmentModalOpen(false);
  }, [isReadOnlyMode]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a: any) => {
      if (filterGroup !== "ALL") {
        const assignmentGroupId = a.group?.id || a.participant?.groupId;
        if (assignmentGroupId !== filterGroup) return false;
      }
      if (filterCategory !== "ALL") {
        const categoryId = a.category?.id || a.programme?.categoryId;
        if (categoryId !== filterCategory) return false;
      }
      if (filterType !== "ALL") {
        if (a.programme?.type !== filterType) return false;
      }
      if (filterStatus !== "ALL") {
        if (a.programme?.status !== filterStatus) return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const participantName = a.participant?.name?.toLowerCase() || "";
        const programmeName = a.programme?.name?.toLowerCase() || "";
        const groupName =
          (a.group?.name || a.participant?.group?.name)?.toLowerCase() || "";
        if (
          !participantName.includes(query) &&
          !programmeName.includes(query) &&
          !groupName.includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [
    assignments,
    filterGroup,
    filterCategory,
    filterType,
    filterStatus,
    searchQuery,
  ]);

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
        const gid = a.group?.id || a.participant?.groupId;
        if (!gid) continue;
        const tn = a.teamNumber ?? 1;
        const key = `${a.programmeId}-${gid}-${tn}`;
        const groupName =
          a.group?.name || a.participant?.group?.name || "Unknown";
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
        const dt = a.assignedAt ? parseInstant(a.assignedAt) : null;
        if (
          dt &&
          (!bucket.latestAssignedAtDate ||
            isAfter(dt, bucket.latestAssignedAtDate))
        ) {
          bucket.latestAssignedAtDate = dt;
        }
      } else {
        rows.push({ kind: "individual", assignment: a });
      }
    }

    teamMap.forEach((val) => {
      const assignedAt = val.assignments[0]?.assignedAt
        ? formatDate(val.assignments[0].assignedAt, {
            tz: displayTz,
            style: "long",
          })
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
  }, [filteredAssignments, displayTz]);

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
          status: programme.status ?? null,
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
          ? parseInstant(row.assignment.assignedAt)
          : null;
        if (
          dt &&
          (!card.latestAssignedAtDate || isAfter(dt, card.latestAssignedAtDate))
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
        ? formatDate(c.latestAssignedAtDate, { tz: displayTz, style: "long" })
        : null;

      // Find the source programme object to get maxParticipantsPerGroup/maxTeamsPerGroup
      const progInfo = programmes.find((p) => p.id === c.programmeId);
      const catInfo = categories.find((cat: any) => cat.id === c.categoryId);
      const isGeneral = catInfo?.type === "GENERAL";

      // Eligible participant pool for this programme's category
      const eligibleParticipants =
        isGeneral || !c.categoryId
          ? participants
          : participants.filter((s: any) => s.categoryId === c.categoryId);

      // Group participants by groupId to calculated group-wise capacity
      const participantCountByGroup = new Map<string, number>();
      for (const s of eligibleParticipants) {
        const gid = s.groupId ?? "";
        participantCountByGroup.set(
          gid,
          (participantCountByGroup.get(gid) || 0) + 1,
        );
      }

      let totalTarget = 0;
      let currentProgress = 0;
      let label = "";

      if (c.programmeType === "GROUP") {
        const maxTeams = progInfo?.maxTeamsPerGroup || 1;
        const maxParticipantsPerTeam = progInfo?.maxParticipantsPerTeam || 1;

        // A group can form a team if they have at least 1 participant (ignoring strict size for now as per usual festival flow)
        // Or should we be strict? Usually, if they have any participants, they are expected to form teams up to max.
        // Let's count groups that have at least one eligible participant.
        const eligibleGroupsCount = participantCountByGroup.size;
        totalTarget = eligibleGroupsCount * maxTeams;
        currentProgress = c.teamCount;
        label = `${currentProgress}/${totalTarget} Team${totalTarget !== 1 ? "s" : ""}`;
      } else {
        const maxPerGroup = progInfo?.maxParticipantsPerGroup || 1;

        // Total target is the sum of min(maxPerGroup, participantsInGroup) for all groups
        participantCountByGroup.forEach((count) => {
          totalTarget += Math.min(maxPerGroup, count);
        });

        currentProgress = c.attendeesCount;
        label = `${currentProgress}/${totalTarget} Participant${totalTarget !== 1 ? "s" : ""}`;
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

      const breakdown: GroupBreakdown[] = Array.from(
        participantCountByGroup.keys(),
      )
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
                  r.assignment.participant?.groupId === gId),
            ).length;
          }

          const groupTotal = participantCountByGroup.get(gId) || 0;
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
  }, [tableRows, participants, programmes, categories, groups, displayTz]);

  const hasFilters =
    filterGroup !== "ALL" ||
    filterCategory !== "ALL" ||
    filterType !== "ALL" ||
    filterStatus !== "ALL" ||
    searchQuery.trim() !== "";

  const clearFilters = () => {
    setFilterGroup("ALL");
    setFilterCategory("ALL");
    setFilterType("ALL");
    setFilterStatus("ALL");
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
        categories={categories}
        groups={groups}
        programmes={programmes}
        participants={participants}
        assignments={assignments}
        requiresTeamLead={canUseTeamLead}
      />

      {/* Header row */}
      <div className="flex flex-row items-center justify-between gap-4">
        {children ?? (
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Programme Assignments
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-0.5">
              Manage participant assignments to programmes.
            </p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <HowItWorksButton
            title="How Assignments work"
            description="Assign participants or teams to programmes."
          >
            <p className="text-sm text-muted-foreground">
              <strong>Individual programmes:</strong> Assign one participant per
              entry. Each row is one participant.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Team programmes:</strong> Assign teams. Each team can have
              multiple members; one result per team. Use &quot;New
              assignment&quot; to pick a programme, then add participants to the
              queue to form teams.
            </p>
          </HowItWorksButton>
          <Button
            size="sm"
            onClick={() => setAssignmentModalOpen(true)}
            disabled={isReadOnlyMode}
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">New assignment</span>
          </Button>
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
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9 w-full sm:w-[150px] text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
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
          {programmeCards
            .slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
            .map((card) => (
            <ProgrammeCard
              key={card.programmeId}
              programmeName={card.programmeName}
              programmeType={card.programmeType}
              categoryName={card.categoryName}
              status={card.status}
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

      {programmeCards.length > pageSize && (
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={(e) => {
                  e.preventDefault();
                  if (pageIndex > 0) setPageIndex(p => p - 1);
                }}
                className={pageIndex === 0 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={(e) => {
                  e.preventDefault();
                  if ((pageIndex + 1) * pageSize < programmeCards.length) setPageIndex(p => p + 1);
                }}
                className={(pageIndex + 1) * pageSize >= programmeCards.length ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Delete Dialogs */}
      <DeleteDialog
        open={deleteTarget?.kind === "individual"}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove assignment"
        description={
          deleteTarget?.kind === "individual"
            ? `Remove ${deleteTarget.assignment.participant?.name} from ${deleteTarget.assignment.programme?.name}?`
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
            await queryClient.invalidateQueries({ queryKey: ["assignments"] });
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
          else setDetailsTab("OVERVIEW");
        }}
      >
        <DrawerContent>
          <DrawerHeader className="shrink-0 text-left">
            <DrawerTitle className="text-lg font-semibold tracking-tight text-heading">
              {selectedProgrammeCard?.programmeName ?? "Programme details"}
            </DrawerTitle>
            <DrawerDescription className="text-xs">
              {selectedProgrammeCard
                ? `${
                    selectedProgrammeCard.programmeType === "GROUP"
                      ? "Team programme"
                      : "Individual programme"
                  } · ${selectedProgrammeCard.attendeesCount} assigned${
                    selectedProgrammeCard.programmeType === "GROUP"
                      ? ` · ${selectedProgrammeCard.teamCount} teams`
                      : ""
                  }`
                : ""}
            </DrawerDescription>
          </DrawerHeader>
          {selectedProgrammeCard ? (
            <Tabs
              value={detailsTab}
              onValueChange={(v: string) =>
                setDetailsTab(v as "OVERVIEW" | "ASSIGNMENTS")
              }
              className="flex min-h-0 flex-1 flex-col"
            >
              <TabsList className=" w-fit shrink-0 gap-1">
                <TabsTrigger value="OVERVIEW">Overview</TabsTrigger>
                <TabsTrigger value="ASSIGNMENTS">
                  Assignments
                  <span className="ml-1.5 text-xs tabular-nums opacity-70">
                    {selectedProgrammeCard.attendeesCount}
                  </span>
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="OVERVIEW"
                className="min-h-0 flex-1 space-y-4 overflow-y-auto py-4"
              >
                {/* Panel A — lifecycle summary (always visible) */}
                {programmeDetailLoading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading
                    programme summary…
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
                          <span className="text-muted-foreground">
                            not saved
                          </span>
                        )}
                      </div>
                      <div>Published: {programmeDetail.counts.published}</div>
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
                                {lead.participantName}
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
                      className="p-3 max-h-48 overflow-y-auto scrollbar-none"
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

                        const eligibleParticipants =
                          isGeneral || !selectedProgrammeCard.categoryId
                            ? participants
                            : participants.filter(
                                (s: any) =>
                                  s.categoryId ===
                                  selectedProgrammeCard.categoryId,
                              );

                        // Groups that have at least one eligible participant
                        const eligibleGroupIds = Array.from(
                          new Set(
                            eligibleParticipants.map((s: any) => s.groupId),
                          ),
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
                            if (
                              selectedProgrammeCard.programmeType === "GROUP"
                            ) {
                              current = selectedProgrammeCard.rows.filter(
                                (r): r is GroupTeamRow =>
                                  r.kind === "team" && r.groupId === gId,
                              ).length;
                            } else {
                              current = selectedProgrammeCard.rows.filter(
                                (r): r is IndividualAssignmentRow =>
                                  r.kind === "individual" &&
                                  (r.assignment.groupId === gId ||
                                    r.assignment.participant?.groupId === gId),
                              ).length;
                            }

                            // Target for THIS specific group
                            const groupParticipantCount =
                              eligibleParticipants.filter(
                                (s: any) => s.groupId === gId,
                              ).length;
                            const target =
                              selectedProgrammeCard.programmeType === "GROUP"
                                ? limit
                                : Math.min(limit, groupParticipantCount);

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
              </TabsContent>

              <TabsContent
                value="ASSIGNMENTS"
                className="min-h-0 flex-1 space-y-4 overflow-y-auto py-4"
              >
                <Input
                  inputSize="s"
                  className="rounded-full"
                  placeholder="Search by name, chest number or group…"
                  value={detailsSearch}
                  onChange={(e) => setDetailsSearch(e.target.value)}
                />

                {selectedProgrammeCard.programmeType === "INDIVIDUAL" ? (
                  <ul className="divide-y divide-border border-y border-border">
                    {selectedProgrammeCard.rows
                      .filter(
                        (r): r is IndividualAssignmentRow =>
                          r.kind === "individual",
                      )
                      .filter((r) => {
                        const q = detailsSearch.trim().toLowerCase();
                        if (!q) return true;
                        const s = r.assignment.participant;
                        return (
                          (s?.name ?? "").toLowerCase().includes(q) ||
                          (s?.chestNumber ?? "").toLowerCase().includes(q) ||
                          (r.assignment.group?.name ?? "")
                            .toLowerCase()
                            .includes(q)
                        );
                      })
                      .map((r) => (
                        <li
                          key={r.assignment.id}
                          className="flex items-center gap-3 py-3"
                        >
                          <span className="w-14 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                            {r.assignment.participant?.chestNumber ?? "—"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-heading">
                              {r.assignment.participant?.name ?? "—"}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {r.assignment.group?.name ??
                                r.assignment.participant?.group?.name ??
                                "No group"}
                            </p>
                          </div>
                          {!isReadOnlyMode ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-destructive"
                              aria-label="Remove assignment"
                              onClick={() =>
                                setDeleteTarget({
                                  kind: "individual",
                                  assignment: r.assignment,
                                })
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          ) : null}
                        </li>
                      ))}
                  </ul>
                ) : (
                  /* Grouped by team, matching the team-leader assignments view. */
                  <div className="space-y-6">
                    {selectedProgrammeCard.rows
                      .filter((r): r is GroupTeamRow => r.kind === "team")
                      .filter((row) => {
                        const q = detailsSearch.trim().toLowerCase();
                        if (!q) return true;
                        if (row.groupName.toLowerCase().includes(q))
                          return true;
                        if (`team ${row.teamNumber}`.includes(q)) return true;
                        return row.assignments.some((a: any) => {
                          const s = a.participant;
                          return (
                            (s?.name ?? "").toLowerCase().includes(q) ||
                            (s?.chestNumber ?? "").toLowerCase().includes(q)
                          );
                        });
                      })
                      .map((row) => {
                        const lead =
                          programmeDetail?.teamLeads?.[row.groupId]?.[
                            row.teamNumber
                          ];

                        return (
                          <div key={`${row.groupId}:${row.teamNumber}`}>
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-heading">
                                  {canUseTeamLead && lead
                                    ? `${lead.participantName} & Team`
                                    : "Team"}
                                </h3>
                                <span className="text-[11px] text-muted-foreground border-l border-border pl-2">
                                  {row.groupName} · Team {row.teamNumber}
                                </span>
                              </div>
                              {!isReadOnlyMode ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 rounded-full px-2.5 text-xs text-destructive hover:text-destructive"
                                  onClick={() =>
                                    setDeleteTarget({ kind: "team", row })
                                  }
                                >
                                  <Trash2 className="mr-1 h-3 w-3" />
                                  Remove team
                                </Button>
                              ) : null}
                            </div>

                            <ul className="divide-y divide-border border-y border-border">
                              {row.assignments.map((a: any, index: number) => {
                                const isLead =
                                  canUseTeamLead &&
                                  lead?.participantId ===
                                    (a.participant?.id ?? a.participantId);
                                return (
                                  <li
                                    key={`${a.id}-${index}`}
                                    className="flex items-center gap-3 py-2.5"
                                  >
                                    <span className="w-14 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                                      {a.participant?.chestNumber ?? "—"}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-heading">
                                      {a.participant?.name ?? "—"}
                                    </span>
                                    {isLead ? (
                                      <StatusPill
                                        tone="ready"
                                        icon={Crown}
                                        className="shrink-0"
                                      >
                                        Lead
                                      </StatusPill>
                                    ) : null}
                                  </li>
                                );
                              })}
                            </ul>

                            <p className="mt-2 text-[11px] text-muted-foreground">
                              {row.assignments.length} member
                              {row.assignments.length === 1 ? "" : "s"}
                              {row.assignedAt
                                ? ` · assigned ${row.assignedAt}`
                                : ""}
                              {row.assignments[0]?.createdByName
                                ? ` by ${row.assignments[0].createdByName}`
                                : ""}
                            </p>
                          </div>
                        );
                      })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : null}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
