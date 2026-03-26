"use client";

import { format } from "date-fns";
import { Eye, Loader2, Plus, Search, Trash2, Users, X } from "lucide-react";
import { HowItWorksButton } from "@/components/dashboard/HowItWorksButton";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAssignments } from "@/hooks/useAssignments";
import { useCategories } from "@/hooks/useCategories";
import { useGroups } from "@/hooks/useGroups";
import { AssignmentModal } from "./AssignmentModal";
import { DeadlinesCard } from "@/components/festival/pre-works/DeadlinesCard";
import { useDeadlineLock } from "@/hooks/useDeadlineLock";
import { useFestivalReadOnly } from "@/hooks/useFestivalReadOnly";

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

type ProgrammeCardRow = {
  programmeId: string;
  programmeName: string;
  programmeType: "INDIVIDUAL" | "GROUP";
  categoryName: string | null;
  attendeesCount: number;
  teamCount: number;
  assignedAt: string | null;
  latestAssignedAtDate: Date | null;
  rows: AssignmentTableRow[];
};

function ProgrammeCard({
  programmeName,
  programmeType,
  categoryName,
  attendeesCount,
  teamCount,
  assignedAt,
  onViewDetails,
}: {
  programmeName: string;
  programmeType: "INDIVIDUAL" | "GROUP";
  categoryName: string | null;
  attendeesCount: number;
  teamCount: number;
  assignedAt: string | null;
  onViewDetails: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onViewDetails}
      className="group rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm transition-all text-left hover:shadow-md hover:border-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      <div className="flex items-start gap-2 px-3 py-2.5 bg-muted/25 border-b border-border/50">
        <div className="min-w-0 flex-1">
          <span className="block font-semibold truncate text-sm">{programmeName}</span>
          {categoryName ? (
            <span className="block text-[11px] text-muted-foreground truncate mt-0.5">
              {categoryName}
            </span>
          ) : (
            <span className="block text-[11px] text-muted-foreground mt-0.5">Uncategorized</span>
          )}
        </div>
        <Badge
          variant={programmeType === "GROUP" ? "secondary" : "outline"}
          className="text-[10px] shrink-0"
        >
          {programmeType}
        </Badge>
      </div>
      <div className="p-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md border bg-muted/20 px-2.5 py-2">
            <p className="text-muted-foreground">Attendees</p>
            <p className="font-semibold text-foreground mt-0.5">{attendeesCount}</p>
          </div>
          <div className="rounded-md border bg-muted/20 px-2.5 py-2">
            <p className="text-muted-foreground">
              {programmeType === "GROUP" ? "Teams" : "Type"}
            </p>
            <p className="font-semibold text-foreground mt-0.5">
              {programmeType === "GROUP" ? teamCount : "Individual"}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs mt-3 px-0.5">
          <span className="text-muted-foreground">Last assigned</span>
          <span className="font-medium text-foreground">{assignedAt ?? "—"}</span>
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
  const {
    assignments,
    isLoading,
    deleteAssignment,
    deleteTeamAssignment,
    isDeleting,
    isDeletingTeam,
  } = useAssignments(festivalId);
  const { categories } = useCategories(festivalId);
  const { groups } = useGroups(festivalId);

  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: "individual"; assignment: any }
    | { kind: "team"; row: GroupTeamRow }
    | null
  >(null);
  const [selectedProgrammeCard, setSelectedProgrammeCard] =
    useState<ProgrammeCardRow | null>(null);
  const [detailsSearch, setDetailsSearch] = useState("");

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

  // Filter raw assignments (same as before)
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
        const groupName =
          a.group?.name || a.student?.group?.name || "Unknown";
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
        const dt = a.assignedAt ? new Date(a.assignedAt) : null;
        if (dt && (!bucket.latestAssignedAtDate || dt > bucket.latestAssignedAtDate)) {
          bucket.latestAssignedAtDate = dt;
        }
      } else {
        rows.push({ kind: "individual", assignment: a });
      }
    }

    teamMap.forEach((val) => {
      const assignedAt = val.assignments[0]?.assignedAt
        ? format(new Date(val.assignments[0].assignedAt), "PP")
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
    const map = new Map<string, ProgrammeCardRow>();
    for (const row of tableRows) {
      const programme = row.kind === "individual" ? row.assignment.programme : row.programme;
      if (!programme?.id) continue;
      if (!map.has(programme.id)) {
        map.set(programme.id, {
          programmeId: programme.id,
          programmeName: programme.name ?? "—",
          programmeType: programme.type,
          categoryName:
            (row.kind === "individual"
              ? row.assignment.category?.name || row.assignment.programme?.category?.name
              : row.category?.name || row.programme?.category?.name) ?? null,
          attendeesCount: 0,
          teamCount: 0,
          assignedAt: null,
          latestAssignedAtDate: null,
          rows: [],
        });
      }
      const card = map.get(programme.id)!;
      card.rows.push(row);
      if (row.kind === "individual") {
        card.attendeesCount += 1;
        const dt = row.assignment.assignedAt ? new Date(row.assignment.assignedAt) : null;
        if (dt && (!card.latestAssignedAtDate || dt > card.latestAssignedAtDate)) {
          card.latestAssignedAtDate = dt;
        }
      } else {
        card.attendeesCount += row.assignments.length;
        card.teamCount += 1;
        const dt = row.latestAssignedAtDate;
        if (dt && (!card.latestAssignedAtDate || dt > card.latestAssignedAtDate)) {
          card.latestAssignedAtDate = dt;
        }
      }
    }

    const cards = Array.from(map.values());
    for (const c of cards) {
      c.assignedAt = c.latestAssignedAtDate ? format(c.latestAssignedAtDate, "PP") : null;
    }
    cards.sort((a, b) => {
      const at = a.latestAssignedAtDate?.getTime() ?? 0;
      const bt = b.latestAssignedAtDate?.getTime() ?? 0;
      if (bt !== at) return bt - at;
      return a.programmeName.localeCompare(b.programmeName, undefined, {
        sensitivity: "base",
      });
    });
    return cards;
  }, [tableRows]);

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

      {/* Header row: children left, Create right — icon only on mobile */}
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
              multiple members; one result per team. Use &quot;New assignment&quot;
              to pick a programme, then add students to the queue to form
              teams.
            </p>
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-left">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                <strong>Note:</strong> Creating new assignments is only available
                on laptop or large screens. On smaller devices you can view and
                remove assignments.
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
        <CardContent className="p-3 sm:p-4">
          {programmeCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 px-6 text-center text-muted-foreground rounded-xl border border-dashed bg-muted/20">
              <Users className="h-10 w-10 text-muted-foreground/50" />
              <p className="font-medium">No assignments found</p>
              <p className="text-sm">Try changing filters or add a new assignment.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {programmeCards.map((card) => (
                <ProgrammeCard
                  key={card.programmeId}
                  programmeName={card.programmeName}
                  programmeType={card.programmeType}
                  categoryName={card.categoryName}
                  attendeesCount={card.attendeesCount}
                  teamCount={card.teamCount}
                  assignedAt={card.assignedAt}
                  onViewDetails={() => {
                    setDetailsSearch("");
                    setSelectedProgrammeCard(card);
                  }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Controlled delete dialogs */}
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
            await deleteAssignment(deleteTarget.assignment.id);
            setDeleteTarget(null);
          }
        }}
        isDeleting={isDeleting}
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
            await deleteTeamAssignment({
              programmeId: deleteTarget.row.programme?.id,
              groupId: deleteTarget.row.groupId,
              teamNumber: deleteTarget.row.teamNumber,
            });
            setDeleteTarget(null);
          }
        }}
        isDeleting={isDeletingTeam}
      />

      <Dialog
        open={Boolean(selectedProgrammeCard)}
        onOpenChange={(open) => {
          if (!open) setSelectedProgrammeCard(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Programme details</DialogTitle>
          </DialogHeader>
          {selectedProgrammeCard ? (
            <div className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Programme:</span>{" "}
                  <span className="font-medium">{selectedProgrammeCard.programmeName}</span>
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

              <Input
                inputSize="s"
                placeholder="Search attendees by name, chest number or group..."
                value={detailsSearch}
                onChange={(e) => setDetailsSearch(e.target.value)}
              />

              {selectedProgrammeCard.programmeType === "INDIVIDUAL" ? (
                <div className="space-y-2 max-h-80 overflow-auto pr-1">
                  {selectedProgrammeCard.rows
                    .filter((r): r is IndividualAssignmentRow => r.kind === "individual")
                    .filter((r) => {
                      const q = detailsSearch.trim().toLowerCase();
                      if (!q) return true;
                      const s = r.assignment.student;
                      const g = r.assignment.group || r.assignment.student?.group;
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
                          <div className="font-medium truncate">
                            {r.assignment.student?.name ?? "—"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            #{r.assignment.student?.chestNumber ?? "—"} ·{" "}
                            {r.assignment.group?.name ||
                              r.assignment.student?.group?.name ||
                              "—"}{" "}
                            ·{" "}
                            {r.assignment.assignedAt
                              ? format(new Date(r.assignment.assignedAt), "PPp")
                              : "—"}
                          </div>
                        </div>
                        {!isReadOnlyMode ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() =>
                              setDeleteTarget({
                                kind: "individual",
                                assignment: r.assignment,
                              })
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Remove attendee
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
                      <div key={`${row.groupId}:${row.teamNumber}`} className="rounded-md border p-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="text-sm font-medium">
                            {row.groupName} - Team {row.teamNumber}
                          </div>
                          {!isReadOnlyMode ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget({ kind: "team", row })}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              Remove team
                            </Button>
                          ) : null}
                        </div>
                        <div className="text-xs text-muted-foreground mb-2">
                          Attendees: {row.assignments.length} · Assigned at: {row.assignedAt ?? "—"}
                        </div>
                        <div className="space-y-1">
                          {row.assignments.map((a: any) => (
                            <div key={a.id} className="text-xs">
                              {a.student?.name ?? "—"}{" "}
                              <span className="text-muted-foreground">
                                (#{a.student?.chestNumber ?? "—"})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

    </div>
  );
}
