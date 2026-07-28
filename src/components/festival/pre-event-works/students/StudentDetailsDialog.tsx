"use client";

import { format } from "date-fns";
import { Crown, Eye, Loader2, Mail, Phone } from "lucide-react";
import { useState } from "react";
import { useAssignments } from "@/api/client/assignments";
import { useFestival } from "@/components/festival/FestivalContext";
import { TeamStudentsDialog } from "@/components/festival/pre-event-works/assignments/TeamStudentsDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";

import { parseStoredInstant } from "@/core/utils/date-time";
import { getProgrammeTeamMembersAction } from "@/features/assignments/actions/assignment.actions";
import { useFeature } from "@/features/plan-features/hooks/use-feature";
import { computeAgeFromDateOfBirth } from "@/lib/age";

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
  const { data: assignments = [], isLoading } = useAssignments(festivalId);
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
    <Drawer open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DrawerTrigger asChild>
          {trigger ?? (
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Eye className="h-4 w-4" />
            </Button>
          )}
        </DrawerTrigger>
      )}
      <DrawerContent className="p-0 sm:p-0 gap-0">
        <div className="mx-auto w-full max-w-2xl flex flex-col h-full overflow-hidden">
          <DrawerHeader className="shrink-0 text-left border-b p-4 sm:p-6 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DrawerTitle className="text-xl sm:text-2xl font-semibold tracking-tight">
                  {student.name}
                </DrawerTitle>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {student.chestNumber && (
                    <Badge
                      variant="secondary"
                      className="font-mono bg-primary/10 text-primary hover:bg-primary/20"
                    >
                      {student.chestNumber}
                    </Badge>
                  )}
                  {canViewTeamLeaders && student.isTeamLeader && (
                    <Badge
                      variant="outline"
                      className="text-amber-600 border-amber-200 bg-amber-50 gap-1 pl-1.5"
                    >
                      <Crown className="h-3 w-3" />
                      Team Leader
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="px-4 sm:px-6 py-6 space-y-8">
              {/* Profile Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                    Group
                  </p>
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        backgroundColor: student.group?.color || "#2563eb",
                      }}
                    />
                    {student.group?.name ?? "—"}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                    Category
                  </p>
                  <p className="text-sm font-medium">
                    {student.category?.name ?? "—"}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                    Gender
                  </p>
                  <p className="text-sm font-medium capitalize">
                    {student.gender?.toLowerCase() ?? "—"}
                  </p>
                </div>

                {student.dateOfBirth && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      Date of Birth
                    </p>
                    <p className="text-sm font-medium">
                      {format(parseStoredInstant(student.dateOfBirth), "PP")}
                    </p>
                  </div>
                )}

                {(() => {
                  const age = computeAgeFromDateOfBirth(student.dateOfBirth);
                  return age != null ? (
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                        Age
                      </p>
                      <p className="text-sm font-medium">{age}</p>
                    </div>
                  ) : null;
                })()}

                {student.standard != null && student.standard !== "" && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      Class
                    </p>
                    <p className="text-sm font-medium">{student.standard}</p>
                  </div>
                )}

                {!isBasicTier && student.phone && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      Phone
                    </p>
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      {student.phone}
                    </p>
                  </div>
                )}

                {!isBasicTier && student.email && (
                  <div className="col-span-2 sm:col-span-3 space-y-1">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      Email
                    </p>
                    <p className="text-sm font-medium flex items-center gap-1.5 truncate">
                      <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate">{student.email}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Programmes Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold tracking-tight">
                    Assigned Programmes
                  </h4>
                  <Badge variant="secondary" className="rounded-full">
                    {studentAssignments.length}
                  </Badge>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-8 border rounded-xl border-dashed">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : studentAssignments.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8 border rounded-xl border-dashed bg-muted/20">
                    Not assigned to any programmes yet.
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {studentAssignments.map((assignment: any) => {
                      const isGroup = assignment.programme?.type === "GROUP";
                      const isLoadingTeam = loadingTeamFor === assignment.id;
                      return (
                        <div
                          key={assignment.id}
                          onClick={
                            isGroup
                              ? () => openTeamModal(assignment)
                              : undefined
                          }
                          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border bg-card transition-colors ${
                            isGroup
                              ? "cursor-pointer hover:bg-muted/50 hover:border-border/80"
                              : ""
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium leading-tight truncate">
                                {assignment.programme?.name}
                              </p>
                              {isGroup && (
                                <Badge
                                  variant="secondary"
                                  className="text-[9px] px-1.5 h-4 py-0 shrink-0"
                                >
                                  TEAM
                                </Badge>
                              )}
                              {isLoadingTeam && (
                                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground font-mono">
                              <span>{assignment.programme?.type}</span>
                              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                              <span>{assignment.programme?.stageType}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Meta Info */}
              <div className="pt-4 border-t text-[11px] text-muted-foreground flex flex-col sm:flex-row gap-2 sm:gap-6">
                {student.createdAt && (
                  <div>
                    Added {format(parseStoredInstant(student.createdAt), "PPp")}
                  </div>
                )}
                {student.updatedAt && (
                  <div>
                    Last updated{" "}
                    {format(parseStoredInstant(student.updatedAt), "PPp")}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>

      <TeamStudentsDialog
        open={teamDialog.open}
        onOpenChange={(open) => setTeamDialog((p) => ({ ...p, open }))}
        programmeName={teamDialog.programmeName}
        teamLabel={teamDialog.teamLabel}
        groupName={teamDialog.groupName}
        students={teamDialog.students}
      />
    </Drawer>
  );
}
