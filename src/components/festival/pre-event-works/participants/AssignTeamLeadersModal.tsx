"use client";

import { Crown, Loader2, Mail, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { queryKeys } from "@/api/client/_query-keys";
import { useGroups, useUpdateGroup } from "@/api/client/groups";
import {
  useParticipants,
  useUpdateParticipant,
} from "@/api/client/participants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface AssignTeamLeadersModalProps {
  festivalId: string;
  teamLeaderLimit: number;
  trigger?: React.ReactNode;
}

interface ParticipantWithEmail {
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
  const [searchQuery, setSearchQuery] = useState("");

  const { data: groups = [] } = useGroups(festivalId);
  const { data: participants = [], isLoading: participantsLoading } =
    useParticipants(festivalId);
  const updateGroup = useUpdateGroup();
  const updateParticipant = useUpdateParticipant();
  const qc = useQueryClient();

  const selectedGroup = useMemo(
    () => groups.find((g: any) => g.id === selectedGroupId),
    [groups, selectedGroupId],
  );

  const groupParticipants = useMemo(
    () => participants.filter((s: any) => s.groupId === selectedGroupId),
    [participants, selectedGroupId],
  );

  const filteredParticipants = useMemo(() => {
    if (!searchQuery.trim()) return groupParticipants;
    const lowerQuery = searchQuery.toLowerCase();
    return groupParticipants.filter(
      (p: any) =>
        p.name?.toLowerCase().includes(lowerQuery) ||
        p.chestNumber?.toLowerCase().includes(lowerQuery) ||
        p.email?.toLowerCase().includes(lowerQuery)
    );
  }, [groupParticipants, searchQuery]);

  const existingLeaderIds = useMemo(
    () =>
      groupParticipants
        .filter((s: any) => s.isTeamLeader)
        .map((s: any) => s.id),
    [groupParticipants],
  );

  const canSubmit =
    !!selectedGroupId &&
    selectedLeaderIds.length > 0 &&
    !updateGroup.isPending &&
    !updateParticipant.isPending;

  // Get participants needing emails (selected participants without valid email)
  const participantsNeedingEmail = useMemo(() => {
    if (step !== "emails") return [];
    return groupParticipants.filter(
      (s: any) =>
        selectedLeaderIds.includes(s.id) &&
        (!s.email || !String(s.email).includes("@")),
    );
  }, [step, groupParticipants, selectedLeaderIds]);

  // Check if all emails are filled
  const canSubmitEmails = useMemo(() => {
    if (participantsNeedingEmail.length === 0) return true;
    return participantsNeedingEmail.every((s) => {
      const email = emailInputs[s.id] || s.email || "";
      return String(email).includes("@");
    });
  }, [participantsNeedingEmail, emailInputs]);

  const toggleLeader = (participantId: string) => {
    setSelectedLeaderIds((prev) => {
      const exists = prev.includes(participantId);
      if (exists) return prev.filter((id) => id !== participantId);
      if (prev.length >= effectiveLimit) return prev;
      return [...prev, participantId];
    });
  };

  const onGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId);
    const groupParticipantIds = participants
      .filter((s: any) => s.groupId === groupId && s.isTeamLeader)
      .map((s: any) => s.id)
      .slice(0, effectiveLimit);
    setSelectedLeaderIds(groupParticipantIds);
    setStep("select");
    setEmailInputs({});
    setSearchQuery("");
  };

  // Proceed to email collection step
  const handleProceedToEmails = () => {
    const selectedParticipants = groupParticipants.filter((s: any) =>
      selectedLeaderIds.includes(s.id),
    );
    const hasInvalidEmail = selectedParticipants.some(
      (s: any) => !s.email || !String(s.email).includes("@"),
    );

    if (hasInvalidEmail) {
      // Initialize email inputs with existing emails
      const initialEmails: Record<string, string> = {};
      selectedParticipants.forEach((s) => {
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

    // Update participant emails if provided
    const participantsToUpdate = groupParticipants.filter((s: any) =>
      selectedLeaderIds.includes(s.id),
    );

    for (const participant of participantsToUpdate) {
      const newEmail = emailInputs[participant.id];
      if (
        newEmail &&
        newEmail !== participant.email &&
        String(newEmail).includes("@")
      ) {
        try {
          await updateParticipant.mutateAsync({
            festivalId,
            participantId: participant.id,
            data: { email: newEmail },
          });
        } catch (error) {
          console.error(
            `Failed to update email for ${participant.name}:`,
            error,
          );
          toast.error(`Failed to update email for ${participant.name}`);
          return;
        }
      }
    }

    await updateGroup.mutateAsync({
      festivalId,
      groupId: selectedGroup.id,
      data: {
        name: selectedGroup.name,
        seriesStart: Number(selectedGroup.seriesStart ?? 100),
        color: selectedGroup.color ?? "#2563eb",
        teamLeaderIds: selectedLeaderIds,
      },
    });

    qc.invalidateQueries({ queryKey: queryKeys.participants.all(festivalId) });

    toast.success("Team leaders assigned successfully!");
    setOpen(false);
    setStep("select");
    setEmailInputs({});
  };

  if (participantsLoading) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          {trigger ?? (
            <Button size="sm" variant="outline">
              <Crown className="h-4 w-4 sm:mr-2 text-amber-600" />
              <span className="hidden sm:inline">Assign Team Leaders</span>
            </Button>
          )}
        </DrawerTrigger>
        <DrawerContent>
          <div className="flex items-center justify-center py-12">
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            <Crown className="h-4 w-4 sm:mr-2 text-amber-600" />
            <span className="hidden sm:inline">Assign Team Leaders</span>
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Assign Team Leaders</DrawerTitle>
          <DrawerDescription>
            {step === "select"
              ? `Select a group, then choose up to ${effectiveLimit} team leaders.`
              : "Enter email addresses for participants who need them."}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto min-h-0 -mx-4 px-4 sm:-mx-6 sm:px-6 py-1">
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
              Select a group to view participants and assign team leaders.
            </div>
          ) : groupParticipants.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              No participants in this group yet.
            </div>
          ) : step === "select" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground shrink-0">
                  <span className="font-medium">{selectedGroup?.name}</span> (
                  {selectedLeaderIds.length}/{effectiveLimit})
                </div>
                <div className="relative w-full sm:max-w-[220px]">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    className="pl-7 h-8 text-xs bg-muted/20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2 max-h-[420px] overflow-y-auto rounded-lg border bg-muted/10 p-2">
                {filteredParticipants.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No participants found
                  </div>
                ) : (
                  filteredParticipants.map((participant: any) => {
                    const isSelected = selectedLeaderIds.includes(participant.id);
                  const hasValidEmail =
                    !!participant.email &&
                    String(participant.email).includes("@");
                  const disableUnchecked =
                    !isSelected && selectedLeaderIds.length >= effectiveLimit;
                  const isExistingLeader = existingLeaderIds.includes(
                    participant.id,
                  );
                  return (
                    <label
                      key={participant.id}
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
                        onChange={() => toggleLeader(participant.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">
                            {participant.name}
                          </span>
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
                          Group: {participant.group?.name ?? "—"} | Category:{" "}
                          {participant.category?.name ?? "—"} | Chest:{" "}
                          {participant.chestNumber ?? "—"} | Email:{" "}
                          {participant.email ?? "—"}
                        </div>
                      </div>
                    </label>
                  );
                }))}
              </div>
            </div>
          ) : (
            /* Step 2: Email Collection */
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/10 p-4">
                <p className="text-sm font-medium mb-2">
                  Enter email addresses for the following participants:
                </p>
                <p className="text-xs text-muted-foreground">
                  Team leaders need valid email addresses for login and
                  notifications.
                </p>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {participantsNeedingEmail.map((participant: any) => {
                  const emailValue =
                    emailInputs[participant.id] || participant.email || "";
                  const hasError =
                    emailValue && !String(emailValue).includes("@");

                  return (
                    <Card
                      key={participant.id}
                      className={hasError ? "border-red-300" : ""}
                    >
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Crown className="h-4 w-4 text-amber-600" />
                            <span className="font-medium">
                              {participant.name}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            Chest: {participant.chestNumber ?? "—"}
                          </Badge>
                        </div>
                        <div className="space-y-1.5">
                          <Label
                            htmlFor={`email-${participant.id}`}
                            className="text-xs"
                          >
                            Email Address{" "}
                            {hasError && (
                              <span className="text-red-500">*</span>
                            )}
                          </Label>
                          <Input
                            id={`email-${participant.id}`}
                            type="email"
                            placeholder="participant@example.com"
                            value={emailValue}
                            onChange={(e) =>
                              setEmailInputs((prev) => ({
                                ...prev,
                                [participant.id]: e.target.value,
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
        </div>

        <DrawerFooter>
          {step === "select" ? (
            <>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={updateGroup.isPending}
              >
                Cancel
              </Button>
              <Button onClick={handleProceedToEmails} disabled={!canSubmit}>
                {selectedLeaderIds.length === 0
                  ? "Select Team Leaders"
                  : participantsNeedingEmail.length > 0
                    ? `Continue (${participantsNeedingEmail.length} need email)`
                    : "Save Team Leaders"}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setStep("select")}
                disabled={updateGroup.isPending}
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmitEmails || updateGroup.isPending}
              >
                {updateGroup.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Team Leaders
              </Button>
            </>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
