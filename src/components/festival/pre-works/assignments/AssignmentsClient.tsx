"use client";

import { format } from "date-fns";
import { Eye, Loader2, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAssignments } from "@/hooks/useAssignments";
import { useCategories } from "@/hooks/useCategories";
import { useGroups } from "@/hooks/useGroups";
import { useProgrammes } from "@/hooks/useProgrammes";
import { useStudents } from "@/hooks/useStudents";
import { GeneralAssignmentDialog } from "./GeneralAssignmentDialog";
import { IndividualAssignmentDialog } from "./IndividualAssignmentDialog";
import { AssignmentDialog } from "./AssignmentDialog"; // Keep for Edit/View flow if needed, or inline edit logic

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
  const { programmes } = useProgrammes(festivalId);
  const { students } = useStudents(festivalId);

  const missingDependencies =
    categories.length === 0 ||
    groups.length === 0 ||
    programmes.length === 0 ||
    students.length === 0;

  const isReadOnly =
    programmeAssignmentDeadline &&
    new Date() > new Date(programmeAssignmentDeadline);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Split Assignments
  const generalAssignments = assignments.filter(
    (a: any) => a.programme?.category?.type === "GENERAL"
  );
  const individualAssignments = assignments.filter(
    (a: any) => a.programme?.category?.type !== "GENERAL"
  );

  console.log("generalAssignments", generalAssignments);
  console.log("individualAssignments", individualAssignments);

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col items-end gap-2">
        <div className="flex justify-end gap-2">
          {isReadOnly || missingDependencies ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex gap-2">
                    <Button disabled variant="outline">
                      New General
                    </Button>
                    <Button disabled>New Individual</Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {missingDependencies
                      ? "Create categories, groups, programmes & students first."
                      : "Assignment deadline has passed."}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <>
              <GeneralAssignmentDialog festivalId={festivalId} />
              <IndividualAssignmentDialog festivalId={festivalId} />
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* TABLE 1: Individual Programmes */}
        <Card>
          <CardHeader>
            <CardTitle>Individual Programmes</CardTitle>
            <CardDescription>
              Performance and competition assignments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Programme</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {individualAssignments.map((assignment: any) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">
                      {assignment.student?.name}
                    </TableCell>
                    <TableCell>
                       <Badge variant="outline">{assignment.programme?.category?.name || "-"}</Badge>
                    </TableCell>
                    <TableCell>{assignment.programme?.name}</TableCell>
                    <TableCell>
                      {assignment.group?.name || assignment.student?.group?.name}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                         {/* View/Edit reusing old dialog for now or custom implementation */}
                         {/* Implementing simpler inline delete/view for clarity as requested split implies creating new flows */}
                        {!isReadOnly && (
                          <DeleteDialog
                            title="Remove Assignment"
                            description="Are you sure?"
                            onDelete={async () => {
                              await deleteAssignment(assignment.id);
                            }}
                            isDeleting={isDeleting}
                            trigger={
                               <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                               </Button>
                            }
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {individualAssignments.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No individual assignments found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* TABLE 2: General Programmes */}
        <Card>
          <CardHeader>
            <CardTitle>General Programmes</CardTitle>
            <CardDescription>
              Assignments for common events (Rally, etc).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Programme</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generalAssignments.map((assignment: any) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">
                      {assignment.student?.name}
                    </TableCell>
                    <TableCell>{assignment.programme?.name}</TableCell>
                    <TableCell>
                      {assignment.group?.name || assignment.student?.group?.name}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {!isReadOnly && (
                          <DeleteDialog
                            title="Remove Assignment"
                            description="Are you sure?"
                            onDelete={async () => {
                              await deleteAssignment(assignment.id);
                            }}
                            isDeleting={isDeleting}
                            trigger={
                               <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                               </Button>
                            }
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {generalAssignments.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No general assignments found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {isReadOnly && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-900/50 dark:bg-yellow-900/20 dark:text-yellow-200">
          Assignment deadline has passed. Read-only mode active.
        </div>
      )}
    </div>
  );
}
