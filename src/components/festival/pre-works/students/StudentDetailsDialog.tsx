"use client";

import { format } from "date-fns";
import { Eye, Loader2, Mail, Phone, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAssignments } from "@/hooks/useAssignments";

interface StudentDetailsDialogProps {
  festivalId: string;
  student: any;
  trigger?: React.ReactNode;
}

export function StudentDetailsDialog({
  festivalId,
  student,
  trigger,
}: StudentDetailsDialogProps) {
  // We might want to fetch fresh details or assignments for this student
  // Currently, student object might have some info, but assignments?
  // We can filter assignments by studentId if we have them all, or fetch.
  // Assuming useAssignments loads all assignments for now (which might be heavy but consistent with current app structure).

  const { assignments, isLoading } = useAssignments(festivalId);

  const studentAssignments = assignments.filter(
    (a: any) =>
      a.studentId === student.id ||
      a.team?.members.some((tm: any) => tm.studentId === student.id),
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Eye className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] flex flex-col p-4 sm:p-5">
        <DialogHeader className="shrink-0 pb-2">
          <DialogTitle className="text-base sm:text-lg truncate pr-8">
            {student.name}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 -mx-1 px-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            {/* Complete details column */}
            <div className="space-y-2.5 sm:border-r sm:pr-4 sm:border-b-0 border-b pb-3 sm:pb-0">
            <div>
              <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">Chest No</span>
              <div className="text-sm mt-0.5">
                {student.chestNumber ? (
                  <Badge variant="secondary" className="font-mono text-[10px] h-5 px-1.5">
                    {student.chestNumber}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">Group</span>
              <div className="text-sm flex items-center gap-1.5 mt-0.5">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: student.group?.color || "#2563eb" }}
                />
                {student.group?.name ?? "—"}
              </div>
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">Category</span>
              <div className="text-sm mt-0.5">{student.category?.name ?? "—"}</div>
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">Gender</span>
              <div className="text-sm mt-0.5 capitalize">{student.gender?.toLowerCase() ?? "—"}</div>
            </div>
            {(student.age != null || (student.standard != null && student.standard !== "")) && (
              <div className="flex gap-4 pt-1 border-t">
                {student.age != null && (
                  <div>
                    <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">Age</span>
                    <div className="text-sm mt-0.5">{student.age}</div>
                  </div>
                )}
                {student.standard != null && student.standard !== "" && (
                  <div>
                    <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">Class</span>
                    <div className="text-sm mt-0.5">{student.standard}</div>
                  </div>
                )}
              </div>
            )}
            {student.isTeamLeader && (
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500 text-xs">
                <Crown className="h-3.5 w-3.5" />
                <span>Team leader</span>
              </div>
            )}
            <div className="pt-1.5 space-y-1 border-t text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 min-w-0">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{student.email || "No email"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                {student.phone || "No phone"}
              </div>
            </div>
            <div className="pt-1.5 border-t text-[11px] text-muted-foreground space-y-0.5">
              {student.createdAt && <div>Created {format(new Date(student.createdAt), "PP")}</div>}
              {student.updatedAt && <div>Updated {format(new Date(student.updatedAt), "PP")}</div>}
            </div>
          </div>

          {/* Programmes */}
          <div className="sm:col-span-2 min-w-0">
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              Assigned Programmes
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{studentAssignments.length}</Badge>
            </h4>
            <div className="border rounded-md overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ScrollArea className="h-[200px] sm:h-[220px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="py-1.5 text-xs">Programme</TableHead>
                        <TableHead className="py-1.5 text-xs w-20">Type</TableHead>
                        <TableHead className="py-1.5 text-xs w-24">Stage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentAssignments.map((assignment: any) => (
                        <TableRow key={assignment.id} className="border-b last:border-0">
                          <TableCell className="py-1.5 text-xs font-medium">{assignment.programme?.name}</TableCell>
                          <TableCell className="py-1.5 text-[11px] text-muted-foreground">{assignment.programme?.type}</TableCell>
                          <TableCell className="py-1.5 text-[11px] font-mono text-muted-foreground">{assignment.programme?.stageType}</TableCell>
                        </TableRow>
                      ))}
                      {studentAssignments.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground text-xs py-6">
                            Not assigned to any programmes.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </div>
          </div>
        </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
