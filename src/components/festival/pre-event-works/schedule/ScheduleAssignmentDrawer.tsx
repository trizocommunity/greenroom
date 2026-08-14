"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Clock,
  Crown,
  Layers,
  Loader2,
  MapPin,
  Pencil,
  Search,
  Tag,
  User,
  Users,
  X,
} from "lucide-react";
import { useAssignments } from "@/api/client/assignments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { cn } from "@/core/utils/cn";
import { getProgrammeTeamLeadsAction } from "@/features/programme-team-leads/actions/programme-team-lead.actions";
import type { EnrichedScheduleEntry } from "@/features/schedule/actions/schedule.actions";
import { calculateProgrammeDuration } from "@/features/schedule/utils/programme-duration";
import { parseStoredScheduleInstant } from "@/features/schedule/utils/schedule-datetime";
import { format } from "date-fns";

interface ScheduleAssignmentDrawerProps {
  festivalId: string;
  entry: EnrichedScheduleEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (entry: EnrichedScheduleEntry) => void;
  isReadOnly?: boolean;
}

function safeFormat(d: Date, pattern: string, fallback = "—"): string {
  if (Number.isNaN(d.getTime())) return fallback;
  return format(d, pattern);
}

function getScheduleTimeLabel(entry: EnrichedScheduleEntry): string {
  const start = parseStoredScheduleInstant(entry.startTime);
  const dateStr = safeFormat(start, "EEEE, MMMM d, yyyy");
  const startStr = safeFormat(start, "h:mm a");
  if (!entry.endTime) return `${dateStr} at ${startStr}`;
  const end = parseStoredScheduleInstant(entry.endTime);
  return `${dateStr} · ${startStr} → ${safeFormat(end, "h:mm a")}`;
}

export function ScheduleAssignmentDrawer({
  festivalId,
  entry,
  open,
  onOpenChange,
  onEdit,
  isReadOnly = false,
}: ScheduleAssignmentDrawerProps) {
  const [search, setSearch] = useState("");
  const [teamLeads, setTeamLeads] = useState<
    Record<
      string,
      Record<
        number,
        {
          participantId: string;
          participantName: string;
          chestNumber: string | null;
        }
      >
    >
  >({});
  const { data: allAssignments = [], isLoading } = useAssignments(festivalId);

  const entryAssignments = useMemo(() => {
    if (!entry || entry.type !== "PROGRAMME" || !entry.programmeId) return [];
    return allAssignments.filter(
      (a: any) =>
        a.programmeId === entry.programmeId ||
        a.programme?.id === entry.programmeId,
    );
  }, [allAssignments, entry]);

  const isGroup =
    entry?.type === "PROGRAMME" && entry.programme?.type === "GROUP";

  useEffect(() => {
    if (!open || !entry?.programmeId || !isGroup) {
      setTeamLeads({});
      return;
    }
    let cancelled = false;
    getProgrammeTeamLeadsAction(festivalId, entry.programmeId)
      .then((leads) => {
        if (!cancelled && leads) {
          setTeamLeads(leads);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [festivalId, entry?.programmeId, isGroup, open]);

  // Group assignments by Team for group programmes
  const groupTeams = useMemo(() => {
    if (!isGroup) return [];
    const teamMap = new Map<
      string,
      {
        groupId: string;
        groupName: string;
        teamNumber: number;
        members: any[];
      }
    >();

    for (const a of entryAssignments as any[]) {
      const gId =
        a.groupId ?? a.group?.id ?? a.participant?.groupId ?? "unknown";
      const gName =
        a.group?.name ??
        a.participant?.group?.name ??
        a.participant?.groupName ??
        "Unknown Group";
      const tNum = a.teamNumber ?? 1;
      const key = `${gId}::${tNum}`;

      if (!teamMap.has(key)) {
        teamMap.set(key, {
          groupId: gId,
          groupName: gName,
          teamNumber: tNum,
          members: [],
        });
      }
      teamMap.get(key)!.members.push(a);
    }

    return Array.from(teamMap.values()).sort((a, b) => {
      const gComp = a.groupName.localeCompare(b.groupName);
      if (gComp !== 0) return gComp;
      return a.teamNumber - b.teamNumber;
    });
  }, [entryAssignments, isGroup]);

  // Filtered individual assignments
  const filteredIndividual = useMemo(() => {
    if (isGroup) return [];
    const q = search.trim().toLowerCase();
    if (!q) return entryAssignments;
    return entryAssignments.filter((a: any) => {
      const name = a.participant?.name ?? "";
      const chest = a.participant?.chestNumber ?? "";
      const group = a.group?.name ?? a.participant?.group?.name ?? "";
      return (
        name.toLowerCase().includes(q) ||
        chest.toLowerCase().includes(q) ||
        group.toLowerCase().includes(q)
      );
    });
  }, [entryAssignments, isGroup, search]);

  // Filtered group teams
  const filteredTeams = useMemo(() => {
    if (!isGroup) return [];
    const q = search.trim().toLowerCase();
    if (!q) return groupTeams;
    return groupTeams.filter((t) => {
      if (t.groupName.toLowerCase().includes(q)) return true;
      if (`team ${t.teamNumber}`.includes(q)) return true;
      const lead = teamLeads[t.groupId]?.[t.teamNumber];
      if (lead?.participantName?.toLowerCase().includes(q)) return true;
      if (lead?.chestNumber?.toLowerCase().includes(q)) return true;
      return t.members.some((m: any) => {
        const name = m.participant?.name ?? "";
        const chest = m.participant?.chestNumber ?? "";
        return (
          name.toLowerCase().includes(q) || chest.toLowerCase().includes(q)
        );
      });
    });
  }, [groupTeams, isGroup, search, teamLeads]);

  if (!entry) return null;

  const durationInfo =
    entry.type === "PROGRAMME" && entry.programme
      ? calculateProgrammeDuration({
          type: entry.programme.type,
          durationMode: entry.programme.durationMode,
          timePerUnitMinutes: entry.programme.timePerUnitMinutes,
          parallelDurationMinutes:
            entry.programme.parallelDurationMinutes ?? null,
          unitCount: isGroup ? entry.teamCount : entry.assignmentCount,
        })
      : null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className=" flex flex-col p-0 gap-0">
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Header */}
          <DrawerHeader className="px-0 pt-0 pb-2 text-left space-y-2 border-b">
            <div className="flex items-start justify-between gap-3">
              <div>
                <DrawerTitle className="text-xl font-bold tracking-tight text-heading">
                  {entry.type === "PROGRAMME"
                    ? (entry.programme?.name ?? "Programme Details")
                    : (entry.title ?? "Session Details")}
                </DrawerTitle>
                {entry.type === "PROGRAMME" &&
                  entry.programme?.nameSecondary && (
                    <DrawerDescription className="text-xs text-muted-foreground mt-0.5">
                      {entry.programme.nameSecondary}
                    </DrawerDescription>
                  )}
              </div>
              <Badge
                variant={entry.type === "PROGRAMME" ? "default" : "secondary"}
                className="shrink-0 text-[10px] uppercase font-bold tracking-wider"
              >
                {entry.type === "PROGRAMME"
                  ? isGroup
                    ? "Group Programme"
                    : "Individual Programme"
                  : (entry.sessionType ?? "Session")}
              </Badge>
            </div>

            {/* Quick Meta chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
              {entry.type === "PROGRAMME" && entry.programme?.category && (
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-medium text-foreground">
                  <Tag className="h-3 w-3 text-primary" />
                  {entry.programme.category.name}
                </span>
              )}
              {entry.stage && (
                <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 font-medium text-primary">
                  <MapPin className="h-3 w-3" />
                  {entry.stage.name}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-medium text-muted-foreground">
                <Clock className="h-3 w-3" />
                {durationInfo
                  ? durationInfo.label
                  : getScheduleTimeLabel(entry)}
              </span>
            </div>
          </DrawerHeader>

          {/* Schedule Time Card */}
          <div className="rounded-xl border bg-muted/20 p-3.5 flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary shrink-0" />
            <div className="text-xs space-y-0.5 min-w-0 flex-1">
              <p className="font-semibold text-foreground">Scheduled Time</p>
              <p className="text-muted-foreground">
                {getScheduleTimeLabel(entry)}
              </p>
            </div>
          </div>

          {/* Session details view */}
          {entry.type === "SESSION" && (
            <div className="space-y-4">
              {entry.description && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Description
                  </h4>
                  <p className="text-sm text-foreground bg-muted/30 p-3 rounded-lg border">
                    {entry.description}
                  </p>
                </div>
              )}
              {entry.speakers && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Speakers / Hosts
                  </h4>
                  <p className="text-sm text-foreground font-medium bg-muted/30 p-3 rounded-lg border">
                    {entry.speakers}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Programme Assignments view */}
          {entry.type === "PROGRAMME" && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold tracking-tight">
                    {isGroup ? "Assigned Teams" : "Assigned Participants"}
                  </h4>
                  <Badge
                    variant="secondary"
                    className="rounded-full font-mono text-xs"
                  >
                    {isGroup ? groupTeams.length : entryAssignments.length}
                  </Badge>
                </div>

                {/* Search */}
                {(isGroup
                  ? groupTeams.length > 0
                  : entryAssignments.length > 0) && (
                  <div className="relative w-full sm:w-56">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder={
                        isGroup
                          ? "Search teams or members..."
                          : "Search participants..."
                      }
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                    {search && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                        onClick={() => setSearch("")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12 border rounded-xl border-dashed">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : entryAssignments.length === 0 ? (
                <div className="text-center py-10 px-4 border rounded-xl border-dashed bg-muted/10 text-muted-foreground space-y-1">
                  <Users className="h-8 w-8 mx-auto opacity-40 mb-2" />
                  <p className="text-sm font-medium">
                    No participants assigned yet
                  </p>
                  <p className="text-xs">
                    Assign participants in Pre Event Works → Assignments.
                  </p>
                </div>
              ) : isGroup ? (
                /* Group Teams List */
                <div className="space-y-3">
                  {filteredTeams.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-foreground border rounded-lg border-dashed">
                      No teams match your search.
                    </div>
                  ) : (
                    filteredTeams.map((team) => {
                      const leadInfo =
                        teamLeads[team.groupId]?.[team.teamNumber];
                      return (
                        <div
                          key={`${team.groupId}-${team.teamNumber}`}
                          className="rounded-xl border bg-card p-3.5 space-y-2.5 shadow-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-sm text-foreground">
                                {team.groupName}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 h-4 font-mono"
                              >
                                Team {team.teamNumber}
                              </Badge>
                              {leadInfo?.participantName ? (
                                <Badge
                                  variant="secondary"
                                  className="gap-1 text-[11px] font-medium bg-amber-500/10 text-amber-900 dark:text-amber-300 border-amber-500/30"
                                >
                                  <Crown className="h-3 w-3 text-amber-500 shrink-0" />
                                  <span>
                                    Lead:{" "}
                                    <strong>{leadInfo.participantName}</strong>
                                  </span>
                                  {leadInfo.chestNumber && (
                                    <span className="font-mono opacity-75">
                                      ({leadInfo.chestNumber})
                                    </span>
                                  )}
                                </Badge>
                              ) : (
                                <span className="text-[11px] text-muted-foreground italic">
                                  No lead assigned
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground font-mono">
                              {team.members.length} member
                              {team.members.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {team.members.map((m: any) => {
                              const isLead =
                                leadInfo &&
                                (m.participantId === leadInfo.participantId ||
                                  m.participant?.id === leadInfo.participantId);
                              return (
                                <div
                                  key={m.id}
                                  className={cn(
                                    "flex items-center gap-2 text-xs rounded-lg px-2.5 py-1.5 transition-colors",
                                    isLead
                                      ? "bg-amber-500/10 border border-amber-500/30 text-foreground font-semibold"
                                      : "bg-muted/40 text-foreground",
                                  )}
                                >
                                  <span className="w-10 font-mono text-muted-foreground tabular-nums shrink-0">
                                    {m.participant?.chestNumber || "—"}
                                  </span>
                                  <span className="font-medium truncate flex-1">
                                    {m.participant?.name || "Unnamed"}
                                  </span>
                                  {isLead && (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400 shrink-0 font-medium">
                                      <Crown className="h-3 w-3 text-amber-500" />
                                      Lead
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                /* Individual Participants List */
                <div className="divide-y divide-border border rounded-xl bg-card overflow-hidden">
                  {filteredIndividual.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-foreground">
                      No participants match your search.
                    </div>
                  ) : (
                    filteredIndividual.map((a: any) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between gap-3 p-3 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-12 font-mono text-xs font-semibold text-primary tabular-nums shrink-0">
                            {a.participant?.chestNumber || "—"}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-tight truncate">
                              {a.participant?.name || "Unnamed Participant"}
                            </p>
                            {(a.group?.name || a.participant?.group?.name) && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {a.group?.name || a.participant?.group?.name}
                              </p>
                            )}
                          </div>
                        </div>
                        {a.limitWarning?.isOverLimit && (
                          <Badge
                            variant="destructive"
                            className="text-[10px] shrink-0"
                          >
                            Limit Exceeded
                          </Badge>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <DrawerFooter className="border-t p-4 flex-row gap-2 justify-end">
          {!isReadOnly && onEdit && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => {
                onOpenChange(false);
                onEdit(entry);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit Schedule Slot
            </Button>
          )}
          <Button
            size="sm"
            className="text-xs"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
