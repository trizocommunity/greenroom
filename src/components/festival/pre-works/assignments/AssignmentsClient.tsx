"use client";

import { format } from "date-fns";
import { Loader2, Plus, Search, Trash2 } from "lucide-react";
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

interface AssignmentsClientProps {
  festivalId: string;
  programmeAssignmentDeadline?: Date | null;
}

export function AssignmentsClient({
  festivalId,
  programmeAssignmentDeadline,
}: AssignmentsClientProps) {
  const { assignments, isLoading, deleteAssignment, isDeleting } =
    useAssignments(festivalId);
  const { categories } = useCategories(festivalId);
  const { groups } = useGroups(festivalId);

  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);

  // Global Filters
  const [filterGroup, setFilterGroup] = useState<string>("ALL");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const isReadOnly =
    !!programmeAssignmentDeadline &&
    new Date() > new Date(programmeAssignmentDeadline);

  // Derived Data
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a: any) => {
      // 1. Group Filter
      if (filterGroup !== "ALL") {
        const assignmentGroupId = a.group?.id || a.student?.groupId;
        if (assignmentGroupId !== filterGroup) return false;
      }

      // 2. Category Filter
      if (filterCategory !== "ALL") {
        const categoryId = a.category?.id || a.programme?.categoryId; // Use assignment category or programme category
        if (categoryId !== filterCategory) return false;
      }

      // 3. Type Filter (Programme Type: INDIVIDUAL / GROUP)
      if (filterType !== "ALL") {
        if (a.programme?.type !== filterType) return false;
      }

      // 4. Search
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AssignmentModal
        festivalId={festivalId}
        open={assignmentModalOpen}
        onOpenChange={setAssignmentModalOpen}
      />

      {/* Header Section */}
      <div className="flex justify-end border-b pb-4">
        <Button
          onClick={() => setAssignmentModalOpen(true)}
          disabled={isReadOnly}
          className="shrink-0"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Assignment
        </Button>
      </div>

      {/* Top Filter Section */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Group Filter */}
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">
              Group
            </span>
            <Select value={filterGroup} onValueChange={setFilterGroup}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Groups</SelectItem>
                {groups.map((g: any) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category Filter */}
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">
              Category
            </span>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {categories.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Programme Type Filter */}
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">
              Type
            </span>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                <SelectItem value="GROUP">Group</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">
              Search
            </span>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Student, Programme, Group..."
                className="pl-8 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Final Assignment Table */}
      <Card>
        <CardHeader className="p-4 py-3 border-b bg-muted/5 flex flex-row items-center justify-between">
          <div className="text-sm font-medium text-muted-foreground">
            Total Assignments:{" "}
            <span className="text-foreground font-bold">
              {filteredAssignments.length}
            </span>
          </div>
          {/* Possible Bulk actions here later */}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Programme</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Assigned Student</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Assigned At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssignments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No assignments found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssignments.map((assignment: any) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">
                      {assignment.programme?.name}
                      {assignment.programme?.type === "GROUP" && (
                        <Badge
                          variant="secondary"
                          className="ml-2 text-[10px] h-5"
                        >
                          Team {assignment.teamNumber || 1}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {assignment.category?.name ||
                          assignment.programme?.category?.name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {assignment.student ? (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {assignment.student.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">
                          Start Sheet Only
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {assignment.group?.name ||
                        assignment.student?.group?.name ||
                        "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {assignment.assignedAt
                        ? format(new Date(assignment.assignedAt), "PP")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {!isReadOnly && (
                          <DeleteDialog
                            title="Remove Assignment"
                            description={`Are you sure you want to remove ${assignment.student?.name} from ${assignment.programme?.name}?`}
                            onDelete={async () => {
                              await deleteAssignment(assignment.id);
                            }}
                            isDeleting={isDeleting}
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            }
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
