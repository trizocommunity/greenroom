"use client";

import { Crown, Loader2, Mail } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGroups } from "@/hooks/useGroups";
import { useStudents } from "@/hooks/useStudents";
import { updateStudentAction } from "@/server/actions/student.actions";

interface AssignTeamLeadersModalProps {
  festivalId: string;
  teamLeaderLimit: number;
  trigger?: React.ReactNode;
}

interface StudentWithEmail {
  id: string;
  name: string;
  email: string | null;
  chestNumber: string | null;
  groupId: string;
  categoryId: string;
  group?: { name: string } | null;
  category?: { name: string } | null;
  isTeamLeader: boolean;
}

export function AssignTeamLeadersModal({
  festivalId,
  teamLeaderLimit,
  trigger,
}: AssignTeamLeadersModalProps) {
  const effectiveLimit =
    Number.isFinite(teamLeaderLimit) && teamLeaderLimit > 0
      ? Math.floor(teamLeaderLimit)
      : 2;
  const [open, setOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedLeaderIds, setSelectedLeaderIds] = useState<string[]>([]);
  const [step, setStep] = useState<"select" | "emails">("select");
  const [emailInputs, setEmailInputs] = useState<Record<string, string>>({});

  const { groups, updateGroup, isUpdating } = useGroups(festivalId);
  const { students } = useStudents(festivalId);

  const selectedGroup = useMemo(
    () => groups.find((g: any) => g.id === selectedGroupId),
    [groups, selectedGroupId],
  );

  const groupStudents = useMemo(
    () => students.filter((s: any) => s.groupId === selectedGroupId),
    [students, selectedGroupId],
  );

  const existingLeaderIds = useMemo(
    () =>
      groupStudents.filter((s: any) => s.isTeamLeader).map((s: any) => s.id),
    [groupStudents],
  );

  const canSubmit =
    !!selectedGroupId && selectedLeaderIds.length > 0 && !isUpdating;

  // Get students needing emails (selected students without valid email)
  const studentsNeedingEmail = useMemo(() => {
    if (step !== "emails") return [];
    return groupStudents.filter(
      (s: any) =>
        selectedLeaderIds.includes(s.id) &&
        (!s.email || !String(s.email).includes("@")),
    );
  }, [step, groupStudents, selectedLeaderIds]);

  // Check if all emails are filled
  const canSubmitEmails = useMemo(() => {
    if (studentsNeedingEmail.length === 0) return true;
    return studentsNeedingEmail.every((s) => {
      const email = emailInputs[s.id] || s.email || "";
      return String(email).includes("@");
    });
  }, [studentsNeedingEmail, emailInputs]);

  const toggleLeader = (studentId: string) => {
    setSelectedLeaderIds((prev) => {
      const exists = prev.includes(studentId);
      if (exists) return prev.filter((id) => id !== studentId);
      if (prev.length >= effectiveLimit) return prev;
      return [...prev, studentId];
    });
  };

  const onGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId);
    const groupStudentIds = students
      .filter((s: any) => s.groupId === groupId && s.isTeamLeader)
      .map((s: any) => s.id)
      .slice(0, effectiveLimit);
    setSelectedLeaderIds(groupStudentIds);
    setStep("select");
    setEmailInputs({});
  };

  // Proceed to email collection step
  const handleProceedToEmails = () => {
    const selectedStudents = groupStudents.filter((s: any) =>
      selectedLeaderIds.includes(s.id),
    );
    const hasInvalidEmail = selectedStudents.some(
      (s: any) => !s.email || !String(s.email).includes("@"),
    );

    if (hasInvalidEmail) {
      // Initialize email inputs with existing emails
      const initialEmails: Record<string, string> = {};
      selectedStudents.forEach((s) => {
        if (s.email) initialEmails[s.id] = s.email;
      });
      setEmailInputs(initialEmails);
      setStep("emails");
    } else {
      // All emails valid, proceed directly to submit
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!selectedGroup) return;

    // Update student emails if provided
    const studentsToUpdate = groupStudents.filter((s: any) =>
      selectedLeaderIds.includes(s.id),
    );

    for (const student of studentsToUpdate) {
      const newEmail = emailInputs[student.id];
      if (
        newEmail &&
        newEmail !== student.email &&
        String(newEmail).includes("@")
      ) {
        try {
          await updateStudentAction(festivalId, student.id, {
            email: newEmail,
          });
          toast.success(`Email updated for ${student.name}`);
        } catch (error) {
          console.error(`Failed to update email for ${student.name}:`, error);
          toast.error(`Failed to update email for ${student.name}`);
          return; // Stop the process if email update fails
        }
      }
    }

    await updateGroup({
      id: selectedGroup.id,
      data: {
        name: selectedGroup.name,
        seriesStart: Number(selectedGroup.seriesStart ?? 100),
        color: selectedGroup.color ?? "#2563eb",
        teamLeaderIds: selectedLeaderIds,
      },
    });

    toast.success("Team leaders assigned successfully!");
    setOpen(false);
    setStep("select");
    setEmailInputs({});
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            <Crown className="h-4 w-4 sm:mr-2 text-amber-600" />
            <span className="hidden sm:inline">Assign Team Leaders</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] max-w-4xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Assign Team Leaders</DialogTitle>
          <DialogDescription>
            {step === "select"
              ? `Select a group, then choose up to ${effectiveLimit} team leaders.`
              : "Enter email addresses for students who need them."}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center gap-2 py-3">
          <div
            className={`flex items-center gap-2 ${step === "select" ? "text-primary" : "text-muted-foreground"}`}
          >
            <div
              className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                step === "select"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/30"
              }`}
            >
              1
            </div>
            <span className="text-sm font-medium">Select Leaders</span>
          </div>
          <div className="w-12 h-0.5 bg-muted-foreground/20" />
          <div
            className={`flex items-center gap-2 ${step === "emails" ? "text-primary" : "text-muted-foreground"}`}
          >
            <div
              className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                step === "emails"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/30"
              }`}
            >
              2
            </div>
            <span className="text-sm font-medium">Enter Emails</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Group</Label>
            <Select value={selectedGroupId} onValueChange={onGroupChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select group" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group: any) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!selectedGroupId ? (
            <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              Select a group to view students and assign team leaders.
            </div>
          ) : groupStudents.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              No students in this group yet.
            </div>
          ) : step === "select" ? (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                Students in{" "}
                <span className="font-medium">{selectedGroup?.name}</span> (
                {selectedLeaderIds.length}/{effectiveLimit} selected)
              </div>
              <div className="space-y-2 max-h-[420px] overflow-y-auto rounded-lg border bg-muted/10 p-2">
                {groupStudents.map((student: any) => {
                  const isSelected = selectedLeaderIds.includes(student.id);
                  const hasValidEmail =
                    !!student.email && String(student.email).includes("@");
                  const disableUnchecked =
                    !isSelected && selectedLeaderIds.length >= effectiveLimit;
                  const isExistingLeader = existingLeaderIds.includes(
                    student.id,
                  );
                  return (
                    <label
                      key={student.id}
                      className={`flex items-center gap-3 rounded-md border p-3 transition ${
                        disableUnchecked
                          ? "opacity-60 cursor-not-allowed bg-muted/20"
                          : "cursor-pointer hover:bg-muted/40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={isSelected}
                        disabled={disableUnchecked}
                        onChange={() => toggleLeader(student.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{student.name}</span>
                          {!hasValidEmail && (
                            <Badge
                              variant="secondary"
                              className="bg-amber-500/15 text-amber-800 border-amber-500/30 text-[11px]"
                            >
                              <Mail className="h-3 w-3 mr-1" />
                              Email needed
                            </Badge>
                          )}
                          {isExistingLeader && (
                            <Badge
                              variant="secondary"
                              className="bg-amber-500/15 text-amber-800 border-amber-500/30 text-[11px]"
                            >
                              <Crown className="h-3 w-3 mr-1" />
                              Current Leader
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Group: {student.group?.name ?? "—"} | Category:{" "}
                          {student.category?.name ?? "—"} | Chest:{" "}
                          {student.chestNumber ?? "—"} | Email:{" "}
                          {student.email ?? "—"}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Step 2: Email Collection */
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/10 p-4">
                <p className="text-sm font-medium mb-2">
                  Enter email addresses for the following students:
                </p>
                <p className="text-xs text-muted-foreground">
                  Team leaders need valid email addresses for login and
                  notifications.
                </p>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {studentsNeedingEmail.map((student: any) => {
                  const emailValue =
                    emailInputs[student.id] || student.email || "";
                  const hasError =
                    emailValue && !String(emailValue).includes("@");

                  return (
                    <Card
                      key={student.id}
                      className={hasError ? "border-red-300" : ""}
                    >
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Crown className="h-4 w-4 text-amber-600" />
                            <span className="font-medium">{student.name}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            Chest: {student.chestNumber ?? "—"}
                          </Badge>
                        </div>
                        <div className="space-y-1.5">
                          <Label
                            htmlFor={`email-${student.id}`}
                            className="text-xs"
                          >
                            Email Address{" "}
                            {hasError && (
                              <span className="text-red-500">*</span>
                            )}
                          </Label>
                          <Input
                            id={`email-${student.id}`}
                            type="email"
                            placeholder="student@example.com"
                            value={emailValue}
                            onChange={(e) =>
                              setEmailInputs((prev) => ({
                                ...prev,
                                [student.id]: e.target.value,
                              }))
                            }
                            className={
                              hasError
                                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                                : ""
                            }
                          />
                          {hasError && (
                            <p className="text-xs text-red-600">
                              Please enter a valid email address (must contain
                              @)
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "select" ? (
            <>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button onClick={handleProceedToEmails} disabled={!canSubmit}>
                {selectedLeaderIds.length === 0
                  ? "Select Team Leaders"
                  : studentsNeedingEmail.length > 0
                    ? `Continue (${studentsNeedingEmail.length} need email)`
                    : "Save Team Leaders"}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setStep("select")}
                disabled={isUpdating}
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmitEmails || isUpdating}
              >
                {isUpdating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Team Leaders
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
