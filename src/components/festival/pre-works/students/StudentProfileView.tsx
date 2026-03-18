"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, Crown, Loader2, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCodeDisplay } from "@/components/common/QrCodeDisplay";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getStudentProfileUrl } from "@/lib/student-profile-url";
import { TeamStudentsDialog } from "@/components/festival/pre-works/assignments/TeamStudentsDialog";
import { getProgrammeTeamMembersAction } from "@/server/actions/assignment.actions";
import { useFeature } from "@/hooks/useFeature";

interface StudentProfileViewProps {
  student: {
    id: string;
    name: string;
    chestNumber: string | null;
    email: string | null;
    phone: string | null;
    gender: string | null;
    age: number | null;
    standard: string | null;
    isTeamLeader: boolean;
    createdAt: Date;
    updatedAt: Date;
    group?: { id?: string; name: string; color?: string | null } | null;
    category?: { name: string } | null;
    profileSlug?: string | null;
    assignments?: Array<{
      id: string;
      programmeId?: string;
      groupId?: string | null;
      teamNumber?: number;
      programme?: {
        id?: string;
        name: string;
        type: string;
        stageType?: string | null;
      } | null;
    }> | null;
  };
  festivalId: string;
  festivalSlug: string;
  baseUrl: string;
}

export function StudentProfileView({ student, festivalId, festivalSlug, baseUrl }: StudentProfileViewProps) {
  const assignments = student.assignments ?? [];
  const studentProfileUrl = getStudentProfileUrl(baseUrl, festivalSlug, student);
  const canViewTeamLeaders = useFeature("members");
  const [teamDialog, setTeamDialog] = useState<{
    open: boolean;
    programmeName: string;
    teamLabel: string;
    groupName: string;
    students: { id: string; name: string; chestNumber?: string | null; categoryName?: string }[];
  }>({ open: false, programmeName: "", teamLabel: "", groupName: "", students: [] });
  const [loadingTeamFor, setLoadingTeamFor] = useState<string | null>(null);

  async function openTeamModal(assignment: (typeof assignments)[number]) {
    const programme = assignment.programme;
    const programmeId = assignment.programmeId ?? programme?.id;
    const groupId = assignment.groupId ?? (student.group as { id?: string } | undefined)?.id;
    const teamNumber = assignment.teamNumber ?? 1;
    const groupName = student.group?.name ?? "—";
    if (!programmeId || !groupId || programme?.type !== "GROUP") return;
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
        programmeName: programme?.name ?? "—",
        teamLabel: `${groupName} – Team ${teamNumber}`,
        groupName,
        students,
      });
    } finally {
      setLoadingTeamFor(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/${festivalSlug}/pre-works/students`}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to students</span>
          </Link>
        </Button>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
          {student.name}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Show QR button only – opens modal */}

            {/* Grid: profile fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <div className="min-w-0">
                <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide block mb-0.5">
                  Name
                </span>
                <div className="text-lg">
                  {student.name}
                </div>
              </div>
            <div>
              <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide block mb-0.5">
                QR Code
              </span>
              <div>
                <QrCodeDisplay
                  url={studentProfileUrl}
                  size={100}
                  showViewButton
                  buttonOnly
                  viewHref={studentProfileUrl}
                  viewLabel="Open student page"
                  highlightViewButton
                />
              </div>
            </div>
              <div className="min-w-0">
                <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide block mb-0.5">
                  Chest No
                </span>
                <div className="text-sm">
                  {student.chestNumber ? (
                    <Badge variant="secondary" className="font-mono bg-primary/10 text-primary text-xs">
                      {student.chestNumber}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide block mb-0.5">
                  Group
                </span>
                <div className="text-sm flex items-center gap-1.5">
                  {student.group && (
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        backgroundColor: student.group.color || "#2563eb",
                      }}
                    />
                  )}
                  <span className="truncate">{student.group?.name ?? "—"}</span>
                </div>
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide block mb-0.5">
                  Category
                </span>
                <div className="text-sm truncate">{student.category?.name ?? "—"}</div>
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide block mb-0.5">
                  Gender
                </span>
                <div className="text-sm capitalize">
                  {student.gender?.toLowerCase() ?? "—"}
                </div>
              </div>
              {student.age != null && (
                <div className="min-w-0">
                  <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide block mb-0.5">
                    Age
                  </span>
                  <div className="text-sm">{student.age}</div>
                </div>
              )}
              {student.standard != null && student.standard !== "" && (
                <div className="min-w-0">
                  <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide block mb-0.5">
                    Class
                  </span>
                  <div className="text-sm">{student.standard}</div>
                </div>
              )}
            </div>

            {canViewTeamLeaders && student.isTeamLeader && (
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500 text-xs pt-1">
                <Crown className="h-3.5 w-3.5 shrink-0" />
                <span>Team leader</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pt-3 border-t">
              <div className="min-w-0 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{student.email || "No email"}</span>
              </div>
              <div className="min-w-0 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{student.phone || "No phone"}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-0.5 pt-2 border-t text-xs text-muted-foreground">
              {student.createdAt && (
                <span>Created {format(new Date(student.createdAt), "PP")}</span>
              )}
              {student.updatedAt && (
                <span>Updated {format(new Date(student.updatedAt), "PP")}</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Assigned Programmes
              <Badge variant="secondary" className="text-xs">
                {assignments.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs">Programme</TableHead>
                    <TableHead className="text-xs w-24">Type</TableHead>
                    <TableHead className="text-xs w-24">Stage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => {
                    const isGroup = assignment.programme?.type === "GROUP";
                    const isLoading = loadingTeamFor === assignment.id;
                    return (
                      <TableRow
                        key={assignment.id}
                        className={
                          isGroup
                            ? "cursor-pointer hover:bg-muted/50 transition-colors"
                            : undefined
                        }
                        onClick={
                          isGroup
                            ? () => openTeamModal(assignment)
                            : undefined
                        }
                      >
                        <TableCell className="text-sm font-medium">
                          <span className="flex items-center gap-1.5">
                            {assignment.programme?.name ?? "—"}
                            {isGroup && (
                              <Badge variant="secondary" className="text-[10px] h-4">
                                Team
                              </Badge>
                            )}
                            {isLoading && (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {assignment.programme?.type ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {assignment.programme?.stageType ?? "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {assignments.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center text-muted-foreground text-sm py-8"
                      >
                        Not assigned to any programmes.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <TeamStudentsDialog
        open={teamDialog.open}
        onOpenChange={(open) => setTeamDialog((p) => ({ ...p, open }))}
        programmeName={teamDialog.programmeName}
        teamLabel={teamDialog.teamLabel}
        groupName={teamDialog.groupName}
        students={teamDialog.students}
      />
    </div>
  );
}
