"use client";

import { useQuery } from "@tanstack/react-query";
import { Crown, Eye, Loader2, Mail, Phone, ShieldAlert, BadgeInfo } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useMemo } from "react";
import { useAssignments } from "@/api/client/assignments";
import { useFestival } from "@/components/festival/FestivalContext";
import { TeamParticipantsDialog } from "@/components/festival/pre-event-works/assignments/TeamParticipantsDialog";
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

import { formatDate, formatDateTime } from "@/core/datetime";
import { getProgrammeTeamMembersAction } from "@/features/assignments/actions/assignment.actions";
import { getParticipantLimitStatusAction } from "@/features/category-limits/actions/category-limit.actions";
import { useFeature } from "@/features/plan-features/hooks/use-feature";
import { getTeamLeadForTeamAction } from "@/features/programme-team-leads/actions/programme-team-lead.actions";
import { computeAgeFromDateOfBirth } from "@/lib/age";

interface ParticipantDetailsDialogProps {
  festivalId: string;
  participant: any;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ParticipantDetailsDialog({
  festivalId,
  participant,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: ParticipantDetailsDialogProps) {
  const { data: assignments = [], isLoading } = useAssignments(festivalId);
  const canViewTeamLeaders = useFeature("members");
  const festivalContext = useFestival();
  const isBasicTier = festivalContext?.tier === "BASIC";
  const pathname = usePathname();

  const participantAssignments = assignments.filter(
    (a: any) =>
      a.participant?.id === participant.id ||
      a.participantId === participant.id,
  );

  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen =
    isControlled && setControlledOpen ? setControlledOpen : setInternalOpen;

  const { data: limitStatus } = useQuery({
    queryKey: ["participant-limit-status", festivalId, participant.id],
    queryFn: () => getParticipantLimitStatusAction(participant.id, festivalId),
    enabled: open,
  });

  const [teamDialog, setTeamDialog] = useState<{
    open: boolean;
    programmeName: string;
    teamLabel: string;
    groupName: string;
    participants: {
      id: string;
      name: string;
      chestNumber?: string | null;
      categoryName?: string;
    }[];
    teamLeadParticipantId: string | null;
  }>({
    open: false,
    programmeName: "",
    teamLabel: "",
    groupName: "",
    participants: [],
    teamLeadParticipantId: null,
  });
  const [loadingTeamFor, setLoadingTeamFor] = useState<string | null>(null);

  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");

  const assignmentCategories = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of participantAssignments) {
      const c = a.programme?.category;
      if (c?.id && c?.name) {
        map.set(c.id, c.name);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [participantAssignments]);

  const filteredParticipantAssignments = useMemo(() => {
    return participantAssignments.filter((a: any) => {
      if (filterType !== "ALL" && a.programme?.type !== filterType) return false;
      if (filterCategory !== "ALL") {
        const catId = a.programme?.category?.id;
        if (catId !== filterCategory) return false;
      }
      return true;
    });
  }, [participantAssignments, filterType, filterCategory]);

  async function openTeamModal(assignment: any) {
    if (assignment.programme?.type !== "GROUP") return;
    const programmeId = assignment.programmeId ?? assignment.programme?.id;
    const groupId =
      assignment.groupId ??
      assignment.group?.id ??
      participant.groupId ??
      participant.group?.id;
    const teamNumber = assignment.teamNumber ?? 1;
    const groupName = assignment.group?.name ?? participant.group?.name ?? "—";
    if (!programmeId || !groupId) return;
    setLoadingTeamFor(assignment.id);
    try {
      /* The lead lookup returns null on non-PRO tiers rather than throwing,
         so it is safe to ask for unconditionally. */
      const [participants, teamLead] = await Promise.all([
        getProgrammeTeamMembersAction(
          festivalId,
          programmeId,
          groupId,
          teamNumber,
        ),
        getTeamLeadForTeamAction(festivalId, {
          programmeId,
          groupId,
          teamNumber,
        }).catch(() => null),
      ]);

      setTeamDialog({
        open: true,
        programmeName: assignment.programme?.name ?? "—",
        teamLabel: `${groupName} – Team ${teamNumber}`,
        groupName,
        participants,
        teamLeadParticipantId: (teamLead as any)?.participantId ?? null,
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
                  {participant.name}
                </DrawerTitle>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {participant.chestNumber && (
                    <Badge
                      variant="secondary"
                      className="font-mono bg-primary/10 text-primary hover:bg-primary/20"
                    >
                      {participant.chestNumber}
                    </Badge>
                  )}
                  {canViewTeamLeaders && participant.isTeamLeader && (
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
                        backgroundColor: participant.group?.color || "#2563eb",
                      }}
                    />
                    {participant.group?.name ?? "—"}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                    Category
                  </p>
                  <p className="text-sm font-medium">
                    {participant.category?.name ?? "—"}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                    Gender
                  </p>
                  <p className="text-sm font-medium capitalize">
                    {participant.gender?.toLowerCase() ?? "—"}
                  </p>
                </div>

                {participant.dateOfBirth && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      Date of Birth
                    </p>
                    <p className="text-sm font-medium">
                      {formatDate(participant.dateOfBirth, {
                        
                        style: "long",
                      })}
                    </p>
                  </div>
                )}

                {(() => {
                  const age = computeAgeFromDateOfBirth(
                    participant.dateOfBirth,
                  );
                  return age != null ? (
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                        Age
                      </p>
                      <p className="text-sm font-medium">{age}</p>
                    </div>
                  ) : null;
                })()}

                {participant.standard != null &&
                  participant.standard !== "" && (
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                        Class
                      </p>
                      <p className="text-sm font-medium">
                        {participant.standard}
                      </p>
                    </div>
                  )}

                {!isBasicTier && participant.phone && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      Phone
                    </p>
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      {participant.phone}
                    </p>
                  </div>
                )}

                {!isBasicTier && participant.email && (
                  <div className="col-span-2 sm:col-span-3 space-y-1">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      Email
                    </p>
                    <p className="text-sm font-medium flex items-center gap-1.5 truncate">
                      <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate">{participant.email}</span>
                    </p>
                  </div>
                )}
              </div>

              {limitStatus && (limitStatus.maxStage !== null || limitStatus.maxNonStage !== null || limitStatus.maxAll !== null) && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold tracking-tight">
                      Programme Limits
                    </h4>
                    {limitStatus?.isOverLimit && (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <ShieldAlert className="h-3 w-3" />
                        Limit Exceeded
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-2 border rounded-xl p-4 bg-muted/10">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Stage:</span>
                        <span className={limitStatus?.isOverStage ? "text-destructive font-medium flex items-center gap-1" : "font-medium"}>
                          {limitStatus?.stageCount} / {limitStatus?.maxStage ?? "∞"}
                          {limitStatus?.isOverStage && <ShieldAlert className="h-3 w-3" />}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Non-Stage:</span>
                        <span className={limitStatus?.isOverNonStage ? "text-destructive font-medium flex items-center gap-1" : "font-medium"}>
                          {limitStatus?.nonStageCount} / {limitStatus?.maxNonStage ?? "∞"}
                          {limitStatus?.isOverNonStage && <ShieldAlert className="h-3 w-3" />}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">All Programmes:</span>
                        <span className={limitStatus?.isOverAll ? "text-destructive font-medium flex items-center gap-1" : "font-medium"}>
                          {limitStatus?.allCount} / {limitStatus?.maxAll ?? "∞"}
                          {limitStatus?.isOverAll && <ShieldAlert className="h-3 w-3" />}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <h4 className="text-sm font-semibold tracking-tight">
                      Assigned Programmes
                    </h4>
                    <Badge variant="secondary" className="rounded-full">
                      {filteredParticipantAssignments.length}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {assignmentCategories.length > 0 && (
                      <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="h-7 text-xs border rounded-md px-2 py-1 bg-background"
                      >
                        <option value="ALL">All Categories</option>
                        {assignmentCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="h-7 text-xs border rounded-md px-2 py-1 bg-background"
                    >
                      <option value="ALL">All Types</option>
                      <option value="INDIVIDUAL">Individual</option>
                      <option value="GROUP">Group</option>
                    </select>
                  </div>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-8 border rounded-xl border-dashed">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredParticipantAssignments.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8 border rounded-xl border-dashed bg-muted/20">
                    Not assigned to any programmes yet.
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {filteredParticipantAssignments.map((assignment: any) => {
                      const isGroup = assignment.programme?.type === "GROUP";
                      const isLoadingTeam = loadingTeamFor === assignment.id;
                      return (
                        // biome-ignore lint/a11y/noStaticElementInteractions: conditional role based on isGroup
                        <div
                          key={assignment.id}
                          role={isGroup ? "button" : undefined}
                          tabIndex={isGroup ? 0 : undefined}
                          onClick={
                            isGroup
                              ? () => openTeamModal(assignment)
                              : undefined
                          }
                          onKeyDown={
                            isGroup
                              ? (e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    openTeamModal(assignment);
                                  }
                                }
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
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                              {assignment.programme?.category?.name && (
                                <>
                                  <span className="font-medium text-foreground bg-muted px-1.5 py-0.5 rounded text-[11px]">
                                    {assignment.programme.category.name}
                                  </span>
                                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                </>
                              )}
                              <span className="font-mono">{assignment.programme?.type}</span>
                              {assignment.programme?.stageType && (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                  <span className="font-mono">{assignment.programme?.stageType}</span>
                                </>
                              )}
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
                {participant.createdAt && (
                  <div>
                    Added{" "}
                    {formatDateTime(participant.createdAt, {
                      
                      dateStyle: "long",
                      timeStyle: "short",
                    })}
                  </div>
                )}
                {participant.updatedAt && (
                  <div>
                    Last updated{" "}
                    {formatDateTime(participant.updatedAt, {
                      
                      dateStyle: "long",
                      timeStyle: "short",
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>

      <TeamParticipantsDialog
        open={teamDialog.open}
        onOpenChange={(open) => setTeamDialog((p) => ({ ...p, open }))}
        teamLeadParticipantId={teamDialog.teamLeadParticipantId}
        programmeName={teamDialog.programmeName}
        teamLabel={teamDialog.teamLabel}
        groupName={teamDialog.groupName}
        participants={teamDialog.participants}
      />
    </Drawer>
  );
}
