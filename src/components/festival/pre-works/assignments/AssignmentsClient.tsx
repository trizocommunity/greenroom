"use client";

import { format } from "date-fns";
import { Loader2, Plus, Search, Trash2, Users } from "lucide-react";
import { HowItWorksButton } from "@/components/dashboard/HowItWorksButton";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DeleteDialog } from "@/components/ui/delete-dialog";
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

interface AssignmentsClientProps {
  festivalId: string;
  programmeAssignmentDeadline?: Date | null;
}

export function AssignmentsClient({
  festivalId,
  programmeAssignmentDeadline,
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

  // Table rows: one per assignment for INDIVIDUAL, one per team for GROUP
  type TableRow =
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

  const tableRows = useMemo<TableRow[]>(() => {
    const rows: TableRow[] = [];
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

      {/* Header: title left, New assignment right */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tight">
            Programme Assignments
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage student assignments to programmes.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <HowItWorksButton
            title="How Assignments work"
            description="Assign students or teams to programmes."
          >
            <p className="text-sm text-muted-foreground">
              <strong>Individual programmes:</strong> Assign one student per
              entry. Each row is one participant.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Team programmes:</strong> Assign teams. Each team can have
              multiple members; one score per team. Use &quot;New assignment&quot;
              to pick a programme, then add students to the queue to form
              teams.
            </p>
          </HowItWorksButton>
          <Button
            onClick={() => setAssignmentModalOpen(true)}
            disabled={isReadOnly}
          >
            <Plus className="h-4 w-4 mr-2" />
            New assignment
          </Button>
        </div>
      </div>

      {/* Table block: filters + assignment table */}
      <Card>
        <CardHeader className="p-3 border-b bg-muted/5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-foreground mr-auto">
              Total : {tableRows.length} row{tableRows.length !== 1 ? "s" : ""}
            </span>
            <Select value={filterGroup} onValueChange={setFilterGroup}>
              <SelectTrigger className="h-8 w-[130px] text-xs">
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
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-8 w-[130px] text-xs">
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
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-8 w-[110px] text-xs">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                <SelectItem value="GROUP">Team</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1 min-w-[120px] max-w-[180px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-7 h-8 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Programme</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Assigned at</TableHead>
                <TableHead className="text-right w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
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
                        {row.assignment.group?.name ||
                          row.assignment.student?.group?.name ||
                          "—"}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {row.assignment.student?.name ?? (
                          <span className="text-muted-foreground italic">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.assignment.programme?.name}
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
                        <div className="flex justify-end gap-1">
                          {!isReadOnly && (
                            <DeleteDialog
                              title="Remove assignment"
                              description={`Remove ${row.assignment.student?.name} from ${row.assignment.programme?.name}?`}
                              onDelete={async () => {
                                await deleteAssignment(row.assignment.id);
                              }}
                              isDeleting={isDeleting}
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              }
                            />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow
                      key={`team-${row.programme?.id}-${row.groupId}-${row.teamNumber}`}
                    >
                      <TableCell className="text-sm">{row.groupName}</TableCell>
                      <TableCell className="text-sm">
                        <span className="font-medium">
                          {row.assignments
                            .map((a: any) => a.student?.name ?? "—")
                            .join(", ")}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 ml-1 align-middle text-muted-foreground hover:text-foreground"
                          title="View team members"
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
                          <Users className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.programme?.name}
                        <Badge
                          variant="secondary"
                          className="ml-1.5 text-[10px] h-4"
                        >
                          T{row.teamNumber}
                        </Badge>
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
                        <div className="flex justify-end gap-1">
                          {!isReadOnly && (
                            <DeleteDialog
                              title="Remove team"
                              description={`Remove this team from ${row.programme?.name}? All members will be unassigned.`}
                              onDelete={async () => {
                                await deleteTeamAssignment({
                                  programmeId: row.programme?.id,
                                  groupId: row.groupId,
                                  teamNumber: row.teamNumber,
                                });
                              }}
                              isDeleting={isDeletingTeam}
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  title="Remove team"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              }
                            />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ),
                )
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
