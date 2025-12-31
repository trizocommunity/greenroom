"use client";

import { format } from "date-fns";
import { Eye, Loader2, Pencil } from "lucide-react";
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
import { AssignmentDialog } from "./AssignmentDialog";

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

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        {isReadOnly ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button disabled>New Assignment</Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Assignment deadline has passed.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <AssignmentDialog festivalId={festivalId} />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assignments</CardTitle>
          <CardDescription>
            List of students assigned to programmes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Programme</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Assigned At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment: any) => (
                <TableRow key={assignment.id}>
                  <TableCell className="font-medium">
                    {assignment.student?.name || "Group Entry"}
                  </TableCell>
                  <TableCell>{assignment.programme?.name}</TableCell>
                  <TableCell>
                    {assignment.group?.name || assignment.student?.group?.name}
                  </TableCell>
                  <TableCell>
                    {format(new Date(assignment.assignedAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <AssignmentDialog
                        festivalId={festivalId}
                        assignment={assignment}
                        readOnly
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        }
                      />
                      {!isReadOnly && (
                        <>
                          <AssignmentDialog
                            festivalId={festivalId}
                            assignment={assignment}
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <DeleteDialog
                            title="Delete Assignment"
                            description="Are you sure you want to remove this assignment?"
                            onDelete={async () => {
                              await deleteAssignment(assignment.id);
                            }}
                            isDeleting={isDeleting}
                          />
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {assignments.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No assignments found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {isReadOnly && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-900/50 dark:bg-yellow-900/20 dark:text-yellow-200">
          Assignment deadline has passed. Read-only mode active.
        </div>
      )}
    </div>
  );
}
