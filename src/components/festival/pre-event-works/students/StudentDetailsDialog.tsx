"use client";

import { format } from "date-fns";
import { Crown, Eye, Loader2, Mail, Phone } from "lucide-react";
import { useState } from "react";
import { useFestival } from "@/components/festival/FestivalContext";
import { TeamStudentsDialog } from "@/components/festival/pre-event-works/assignments/TeamStudentsDialog";
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
import { parseStoredInstant } from "@/core/utils/date-time";
import { getProgrammeTeamMembersAction } from "@/features/assignments/actions/assignment.actions";
import { useAssignments } from "@/features/assignments/hooks/use-assignments";
import { useFeature } from "@/features/plan-features/hooks/use-feature";

interface StudentDetailsDialogProps {
  festivalId: string;
  student: any;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function StudentDetailsDialog({
  festivalId,
  student,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: StudentDetailsDialogProps) {
  const { assignments, isLoading } = useAssignments(festivalId);
  const canViewTeamLeaders = useFeature("members");
  const festivalContext = useFestival();
  const isBasicTier = festivalContext.tier === "BASIC";

  const studentAssignments = assignments.filter(
    (a: any) => a.studentId === student.id,
  );

  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen =
    isControlled && setControlledOpen ? setControlledOpen : setInternalOpen;

  const [teamDialog, setTeamDialog] = useState<{
    open: boolean;
    programmeName: string;
    teamLabel: string;
    groupName: string;
    students: {
      id: string;
      name: string;
      chestNumber?: string | null;
      categoryName?: string;
    }[];
  }>({
    open: false,
    programmeName: "",
    teamLabel: "",
    groupName: "",
    students: [],
  });
  const [loadingTeamFor, setLoadingTeamFor] = useState<string | null>(null);

  async function openTeamModal(assignment: any) {
    if (assignment.programme?.type !== "GROUP") return;
    const programmeId = assignment.programmeId ?? assignment.programme?.id;
    const groupId =
      assignment.groupId ??
      assignment.group?.id ??
      student.groupId ??
      student.group?.id;
    const teamNumber = assignment.teamNumber ?? 1;
    const groupName = assignment.group?.name ?? student.group?.name ?? "—";
    if (!programmeId || !groupId) return;
    setLoadingTeamFor(assignment.id);
    try {
      const students = await getProgrammeTeamMembersAction(
        festivalId,
        programmeId,
        groupId,
        teamNumber,
      );
      setTeamDialog({
        open: true,
        programmeName: assignment.programme?.name ?? "—",
        teamLabel: `${groupName} – Team ${teamNumber}`,
        groupName,
        students,
      });
    } finally {
      setLoadingTeamFor(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Eye className="h-4 w-4" />
            </Button>
          )}
        </DialogTrigger>
      )}
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
                <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">
                  Chest No
                </span>
                <div className="text-sm mt-0.5">
                  {student.chestNumber ? (
                    <Badge
                      variant="secondary"
                      className="font-mono text-[10px] h-5 px-1.5"
                    >
                      {student.chestNumber}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">
                  Group
                </span>
                <div className="text-sm flex items-center gap-1.5 mt-0.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: student.group?.color || "#2563eb",
                    }}
                  />
                  {student.group?.name ?? "—"}
                </div>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">
                  Category
                </span>
                <div className="text-sm mt-0.5">
                  {student.category?.name ?? "—"}
                </div>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">
                  Gender
                </span>
                <div className="text-sm mt-0.5 capitalize">
                  {student.gender?.toLowerCase() ?? "—"}
                </div>
              </div>
              {(student.age != null ||
                (student.standard != null && student.standard !== "")) && (
                <div className="flex gap-4 pt-1 border-t">
                  {student.age != null && (
                    <div>
                      <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">
                        Age
                      </span>
                      <div className="text-sm mt-0.5">{student.age}</div>
                    </div>
                  )}
                  {student.standard != null && student.standard !== "" && (
                    <div>
                      <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">
                        Class
                      </span>
                      <div className="text-sm mt-0.5">{student.standard}</div>
                    </div>
                  )}
                </div>
              )}
              {canViewTeamLeaders && student.isTeamLeader && (
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500 text-xs">
                  <Crown className="h-3.5 w-3.5" />
                  <span>Team leader</span>
                </div>
              )}
              {!isBasicTier && (
                <div className="pt-1.5 space-y-1 border-t text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {student.email || "No email"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {student.phone || "No phone"}
                  </div>
                </div>
              )}
              <div className="pt-1.5 border-t text-[11px] text-muted-foreground space-y-0.5">
                {student.createdAt && (
                  <div>
                    Created{" "}
                    {format(parseStoredInstant(student.createdAt), "PP")}
                  </div>
                )}
                {student.updatedAt && (
                  <div>
                    Updated{" "}
                    {format(parseStoredInstant(student.updatedAt), "PP")}
                  </div>
                )}
              </div>
            </div>

            {/* Programmes */}
            <div className="sm:col-span-2 min-w-0">
              <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                Assigned Programmes
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                  {studentAssignments.length}
                </Badge>
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
                          <TableHead className="py-1.5 text-xs">
                            Programme
                          </TableHead>
                          <TableHead className="py-1.5 text-xs w-20">
                            Type
                          </TableHead>
                          <TableHead className="py-1.5 text-xs w-24">
                            Stage
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentAssignments.map((assignment: any) => {
                          const isGroup =
                            assignment.programme?.type === "GROUP";
                          const isLoading = loadingTeamFor === assignment.id;
                          return (
                            <TableRow
                              key={assignment.id}
                              className={`border-b last:border-0 ${isGroup ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}`}
                              onClick={
                                isGroup
                                  ? () => openTeamModal(assignment)
                                  : undefined
                              }
                            >
                              <TableCell className="py-1.5 text-xs font-medium">
                                <span className="flex items-center gap-1.5">
                                  {assignment.programme?.name}
                                  {isGroup && (
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] h-4"
                                    >
                                      Team
                                    </Badge>
                                  )}
                                  {isLoading && (
                                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                  )}
                                </span>
                              </TableCell>
                              <TableCell className="py-1.5 text-[11px] text-muted-foreground">
                                {assignment.programme?.type}
                              </TableCell>
                              <TableCell className="py-1.5 text-[11px] font-mono text-muted-foreground">
                                {assignment.programme?.stageType}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {studentAssignments.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={3}
                              className="text-center text-muted-foreground text-xs py-6"
                            >
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

      <TeamStudentsDialog
        open={teamDialog.open}
        onOpenChange={(open) => setTeamDialog((p) => ({ ...p, open }))}
        programmeName={teamDialog.programmeName}
        teamLabel={teamDialog.teamLabel}
        groupName={teamDialog.groupName}
        students={teamDialog.students}
      />
    </Dialog>
  );
}
