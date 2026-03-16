"use client";

import { format } from "date-fns";
import { Loader2, MoreVertical, Plus, Search, Trash2, Users, X } from "lucide-react";
import { HowItWorksButton } from "@/components/dashboard/HowItWorksButton";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAssignments } from "@/hooks/useAssignments";
import { useCategories } from "@/hooks/useCategories";
import { useGroups } from "@/hooks/useGroups";
import { AssignmentModal } from "./AssignmentModal";
import {
  TeamStudentsDialog,
  type TeamStudentRow,
} from "./TeamStudentsDialog";

function AssignmentCard({
  kind,
  groupColor,
  groupName,
  studentName,
  programmeName,
  categoryName,
  assignedAt,
  isReadOnly,
  onRemove,
  onViewTeam,
  teamNumber,
}: {
  kind: "individual" | "team";
  groupColor: string;
  groupName: string;
  studentName: string;
  programmeName?: string;
  categoryName?: string;
  assignedAt: string | null;
  isReadOnly: boolean;
  onRemove: () => void;
  onViewTeam?: () => void;
  teamNumber?: number;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm transition-all active:scale-[0.99] hover:shadow-md hover:border-primary/25">
      {/* Compact programme strip */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/30 border-b border-border/50">
        <span className="text-xs font-medium text-muted-foreground truncate flex-1 min-w-0">
          {programmeName ?? "—"}
          {kind === "team" && teamNumber != null && (
            <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 align-middle">
              T{teamNumber}
            </Badge>
          )}
        </span>
      </div>
      <div className="flex items-start justify-between gap-3 p-3">
        <div className="min-w-0 flex-1 space-y-2.5">
          <p className="font-semibold text-base text-foreground leading-tight line-clamp-2">
            {studentName}
          </p>
          {/* Meta: group + category + date, compact */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: groupColor }}
              />
              <span className="truncate">{groupName}</span>
            </span>
            {categoryName && (
              <Badge variant="outline" className="font-normal text-[10px] h-5 px-1.5">
                {categoryName}
              </Badge>
            )}
            {assignedAt && <span>{assignedAt}</span>}
          </div>
        </div>
        <div className="shrink-0 pt-0.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onViewTeam && (
                <DropdownMenuItem onClick={onViewTeam}>
                  <Users className="h-3.5 w-3.5 mr-2" />
                  View team
                </DropdownMenuItem>
              )}
              {!isReadOnly && (
                <DropdownMenuItem
                  onClick={onRemove}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Remove
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

type AssignmentTableRow =
  | { kind: "individual"; assignment: any }
  | {
      kind: "team";
      programme: any;
      category: any;
      groupId: string;
      groupName: string;
      teamNumber: number;
      assignments: any[];
      assignedAt: string | null;
    };

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
    | { kind: "team"; row: AssignmentTableRow & { kind: "team" } }
    | null
  >(null);
  const [teamStudentsDialog, setTeamStudentsDialog] = useState<{
    open: boolean;
    programmeName: string;
    teamLabel: string;
    groupName: string;
    students: TeamStudentRow[];
  }>({ open: false, programmeName: "", teamLabel: "", groupName: "", students: [] });

  // Global Filters
  const [filterGroup, setFilterGroup] = useState<string>("ALL");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const isReadOnly =
    !!programmeAssignmentDeadline &&
    new Date() > new Date(programmeAssignmentDeadline);

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
      { programme: any; category: any; groupId: string; groupName: string; teamNumber: number; assignments: any[] }
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
          });
        }
        teamMap.get(key)!.assignments.push(a);
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
      });
    });

    return rows;
  }, [filteredAssignments]);

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
              multiple members; one score per team. Use &quot;New assignment&quot;
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
          <div className="hidden md:block">
            <Button
              size="sm"
              onClick={() => setAssignmentModalOpen(true)}
              disabled={isReadOnly}
            >
              <Plus className="h-4 w-4 mr-2" />
              New assignment
            </Button>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="p-3 sm:p-4 border-b bg-muted/5">
          {/* Filters: search first, mobile = flex-col w-full */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
            <div className="relative w-full sm:w-auto sm:min-w-[140px] sm:max-w-[200px] order-first">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search student, programme, group..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full pl-8 text-xs sm:w-[200px]"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-8 w-full sm:w-[130px] text-xs">
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
              <SelectTrigger className="h-8 w-full sm:w-[130px] text-xs">
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
              <SelectTrigger className="h-8 w-full sm:w-[110px] text-xs">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                <SelectItem value="GROUP">Team</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-full sm:w-8 shrink-0"
                onClick={clearFilters}
                title="Clear filters"
              >
                <X className="h-3.5 w-3.5 sm:mr-0" />
                <span className="sm:hidden">Clear filters</span>
              </Button>
            )}
            <span className="text-xs text-muted-foreground sm:ml-auto">
              {tableRows.length} row{tableRows.length !== 1 ? "s" : ""}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {/* Mobile: assignment cards */}
          <div className="block md:hidden p-3 sm:p-4 space-y-3">
            {tableRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-14 px-6 text-center text-muted-foreground rounded-xl border border-dashed bg-muted/20">
                <Users className="h-10 w-10 text-muted-foreground/50" />
                <p className="font-medium">No assignments found</p>
                <p className="text-sm">Try changing filters or add a new assignment.</p>
              </div>
            ) : (
              tableRows.map((row) =>
                row.kind === "individual" ? (
                  <AssignmentCard
                    key={row.assignment.id}
                    kind="individual"
                    groupColor={
                      row.assignment.group?.color ||
                      row.assignment.student?.group?.color ||
                      "#2563eb"
                    }
                    groupName={
                      row.assignment.group?.name ||
                      row.assignment.student?.group?.name ||
                      "—"
                    }
                    studentName={row.assignment.student?.name ?? "—"}
                    programmeName={row.assignment.programme?.name}
                    categoryName={
                      row.assignment.category?.name ||
                      row.assignment.programme?.category?.name
                    }
                    assignedAt={
                      row.assignment.assignedAt
                        ? format(new Date(row.assignment.assignedAt), "PP")
                        : null
                    }
                    isReadOnly={isReadOnly}
                    onRemove={() => setDeleteTarget({ kind: "individual", assignment: row.assignment })}
                    onViewTeam={undefined}
                  />
                ) : (
                  <AssignmentCard
                    key={`team-${row.programme?.id}-${row.groupId}-${row.teamNumber}`}
                    kind="team"
                    groupColor={
                      groups.find((g: any) => g.id === row.groupId)?.color || "#2563eb"
                    }
                    groupName={row.groupName}
                    studentName={
                      row.assignments.length > 0
                        ? `${row.assignments[0]?.student?.name ?? "—"}${row.assignments.length > 1 ? " + team" : ""}`
                        : "—"
                    }
                    programmeName={row.programme?.name}
                    categoryName={row.category?.name || row.programme?.category?.name}
                    assignedAt={row.assignedAt}
                    teamNumber={row.teamNumber}
                    isReadOnly={isReadOnly}
                    onRemove={() => setDeleteTarget({ kind: "team", row })}
                    onViewTeam={() =>
                      setTeamStudentsDialog({
                        open: true,
                        programmeName: row.programme?.name ?? "",
                        teamLabel: `${row.groupName} – Team ${row.teamNumber}`,
                        groupName: row.groupName,
                        students: row.assignments.map((a: any) => ({
                          id: a.student?.id ?? a.id,
                          name: a.student?.name ?? "—",
                          chestNumber: a.student?.chestNumber,
                          categoryName: a.student?.category?.name,
                        })),
                      })
                    }
                  />
                )
              )
            )}
          </div>

          {/* Desktop: table */}
          <Table className="hidden md:table">
            <TableHeader>
              <TableRow>
                <TableHead>Programme</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Participants</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Assigned at</TableHead>
                <TableHead className="text-right w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No assignments found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                tableRows.map((row) =>
                  row.kind === "individual" ? (
                    <TableRow key={row.assignment.id}>
                      <TableCell className="text-sm">
                        {row.assignment.programme?.name ?? "—"}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {row.assignment.student?.name ?? (
                          <span className="text-muted-foreground italic">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        1
                      </TableCell>
                      <TableCell className="text-sm">
                         <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{
                              backgroundColor:
                                row.assignment.group?.color ||
                                row.assignment.student?.group?.color ||
                                "#2563eb",
                            }}
                          />
                          {row.assignment.group?.name ||
                            row.assignment.student?.group?.name ||
                            "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal text-xs">
                          {row.assignment.category?.name ||
                            row.assignment.programme?.category?.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {row.assignment.assignedAt
                          ? format(
                              new Date(row.assignment.assignedAt),
                              "PP",
                            )
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!isReadOnly && (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() =>
                                  setDeleteTarget({ kind: "individual", assignment: row.assignment })
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                Remove
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow
                      key={`team-${row.programme?.id}-${row.groupId}-${row.teamNumber}`}
                    >
                      <TableCell className="text-sm">
                        <span>
                          {row.programme?.name ?? "—"}
                          <Badge
                            variant="secondary"
                            className="ml-1.5 text-[10px] h-4"
                          >
                            T{row.teamNumber}
                          </Badge>
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="font-medium">
                          {row.assignments.length > 0
                            ? `${row.assignments[0]?.student?.name ?? "—"}`
                            : "—"}
                          {row.assignments.length > 1 && (
                            <span className="text-muted-foreground text-xs"> + team</span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.assignments.length}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{
                              backgroundColor:
                                groups.find((g: any) => g.id === row.groupId)
                                  ?.color || "#2563eb",
                            }}
                          />
                          {row.groupName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal text-xs">
                          {row.category?.name || row.programme?.category?.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {row.assignedAt ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                setTeamStudentsDialog({
                                  open: true,
                                  programmeName: row.programme?.name ?? "",
                                  teamLabel: `${row.groupName} – Team ${row.teamNumber}`,
                                  groupName: row.groupName,
                                  students: row.assignments.map((a: any) => ({
                                    id: a.student?.id ?? a.id,
                                    name: a.student?.name ?? "—",
                                    chestNumber: a.student?.chestNumber,
                                    categoryName: a.student?.category?.name,
                                  })),
                                })
                              }
                            >
                              <Users className="h-3.5 w-3.5 mr-2" />
                              View team
                            </DropdownMenuItem>
                            {!isReadOnly && (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteTarget({ kind: "team", row })}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                Remove team
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ),
                )
              )}
            </TableBody>
          </Table>
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

      <TeamStudentsDialog
        open={teamStudentsDialog.open}
        onOpenChange={(open) =>
          setTeamStudentsDialog((prev) => ({ ...prev, open }))
        }
        programmeName={teamStudentsDialog.programmeName}
        teamLabel={teamStudentsDialog.teamLabel}
        groupName={teamStudentsDialog.groupName}
        students={teamStudentsDialog.students}
      />
    </div>
  );
}
