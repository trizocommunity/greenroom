"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  Crown,
  Loader2,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useBulkCreateAssignments } from "@/api/client/assignments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/core/utils/cn";
import { getProgrammeTeamLeadsAction } from "@/features/programme-team-leads/actions/programme-team-lead.actions";
import { toast } from "@/lib/toast";

interface AssignmentModalProps {
  festivalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isReadOnly?: boolean;
  categories: { id: string; name: string; type?: string | null }[];
  programmes: any[];
  participants: any[];
  assignments: any[];
  /** Omit/empty to skip the Group step and scope everything via fixedGroupId instead. */
  groups?: { id: string; name: string }[];
  /** Pre-scopes the dialog to a single group (e.g. a team leader's own group) and hides the Group step. */
  fixedGroupId?: string;
  /**
   * PRO festivals reject a GROUP assignment unless every team receiving a
   * member has a lead on record, so the review step has to collect one.
   */
  requiresTeamLead?: boolean;
}

interface QueueItem {
  id: string; // temp id
  programmeId: string;
  programmeName: string;
  participantId: string;
  participantName: string;
  groupId?: string; // For reference
  groupName?: string;
  teamNumber: number;
  categoryName: string;
  isGroupType?: boolean;
}

type ModalView = "SELECTION" | "REVIEW";

/** Programme limits, spelled out the way an organiser would say them. */
function describeLimits(p: any) {
  if (p.type === "INDIVIDUAL") {
    const max = p.maxParticipantsPerGroup || 1;
    return `Up to ${max} ${max === 1 ? "person" : "people"} per group`;
  }
  const teams = p.maxTeamsPerGroup || 1;
  const size = p.maxParticipantsPerTeam || 1;
  return `Up to ${teams} team${teams === 1 ? "" : "s"} of ${size}`;
}

export function AssignmentModal({
  festivalId,
  open,
  onOpenChange,
  isReadOnly = false,
  categories,
  programmes,
  participants,
  assignments,
  groups = [],
  fixedGroupId,
  requiresTeamLead = false,
}: AssignmentModalProps) {
  const bulkCreateAssignment = useBulkCreateAssignments();

  // Whether to show the group picker at all — admin dialogs pick a group;
  // team-leader dialogs are pre-scoped to their own group via fixedGroupId.
  // Flow: pick category (+ group) at the top, then programme, then people.
  const hasGroupStep = !fixedGroupId && groups.length > 0;

  // State
  const [view, setView] = useState<ModalView>("SELECTION");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    fixedGroupId ?? "",
  );
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string>("");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<
    Set<string>
  >(new Set());
  const [participantSearch, setParticipantSearch] = useState("");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** `${programmeId}:${groupId}:${teamNumber}` -> chosen lead participantId. */
  const [teamLeadChoice, setTeamLeadChoice] = useState<Record<string, string>>(
    {},
  );

  /* Which queued teams already have a lead? Only fetched when the tier needs
     it, and only for the programmes actually in the queue. */
  const queuedProgrammeIds = useMemo(
    () => Array.from(new Set(queue.map((q) => q.programmeId))).sort(),
    [queue],
  );

  const { data: existingLeadsByProgramme } = useQuery({
    queryKey: ["assignment-modal-team-leads", festivalId, queuedProgrammeIds],
    queryFn: async () => {
      const entries = await Promise.all(
        queuedProgrammeIds.map(async (programmeId) => {
          try {
            const leads = await getProgrammeTeamLeadsAction(
              festivalId,
              programmeId,
            );
            return [programmeId, leads] as const;
          } catch {
            // Non-PRO or no access — treated as "no leads on record".
            return [programmeId, {}] as const;
          }
        }),
      );
      return Object.fromEntries(entries) as Record<
        string,
        Record<string, Record<number, { participantId: string }>>
      >;
    },
    enabled: requiresTeamLead && queuedProgrammeIds.length > 0,
    staleTime: 30_000,
  });

  /**
   * `${programmeId}:${groupId}:${teamNumber}` for every team the queue touches
   * that has no lead yet — the same key the review blocks are grouped by, so
   * each block knows whether to show its lead picker. Mirrors the server's rule
   * in `AssignmentService.bulkCreate`, so what the dialog asks for is exactly
   * what the save will require.
   */
  const leadRequiredKeys = useMemo(() => {
    const keys = new Set<string>();
    if (!requiresTeamLead) return keys;

    for (const item of queue) {
      if (!item.isGroupType || !item.groupId) continue;

      const alreadyLed =
        existingLeadsByProgramme?.[item.programmeId]?.[item.groupId]?.[
          item.teamNumber
        ];
      if (alreadyLed) continue;

      keys.add(`${item.programmeId}:${item.groupId}:${item.teamNumber}`);
    }

    return keys;
  }, [requiresTeamLead, queue, existingLeadsByProgramme]);

  const teamsMissingLeadCount = Array.from(leadRequiredKeys).filter(
    (key) => !teamLeadChoice[key],
  ).length;
  const missingTeamLead = teamsMissingLeadCount > 0;

  const categoriesById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  // Derived Selection Objects
  const selectedProgramme = useMemo(
    () => programmes.find((p: any) => p.id === selectedProgrammeId),
    [programmes, selectedProgrammeId],
  );

  const selectedCategory = useMemo(
    () => categoriesById.get(selectedCategoryId),
    [categoriesById, selectedCategoryId],
  );

  const selectedCategoryType = selectedCategory?.type ?? null;

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId),
    [groups, selectedGroupId],
  );

  // Filtered Lists
  const filteredProgrammes = useMemo(() => {
    if (!selectedCategoryId) return [];
    if (hasGroupStep && !selectedGroupId) return [];
    return programmes.filter((p: any) => p.categoryId === selectedCategoryId);
  }, [programmes, selectedCategoryId, selectedGroupId, hasGroupStep]);

  const filteredParticipants = useMemo(() => {
    if (!selectedGroupId) return [];

    // When fixedGroupId is set, the caller already scoped `participants` to the
    // right group (team-leader participants have no groupId field at all).
    let eligibleParticipants = fixedGroupId
      ? participants
      : participants.filter((s: any) => s.groupId === selectedGroupId);

    // GENERAL-type categories are open to participants from any category;
    // SINGLE-type categories only accept participants from that exact category.
    if (selectedCategoryId && selectedCategoryType !== "GENERAL") {
      eligibleParticipants = eligibleParticipants.filter(
        (s: any) => s.categoryId === selectedCategoryId,
      );
    }

    // Now adding status information to sorting
    return eligibleParticipants
      .map((s: any) => {
        // Checking if already assigned to this programme (DB)
        const isAssignedDB = assignments.some(
          (a: any) =>
            a.programmeId === selectedProgrammeId && a.participantId === s.id,
        );
        // Checking if in Queue
        const isInQueue = queue.some(
          (q) =>
            q.programmeId === selectedProgrammeId && q.participantId === s.id,
        );

        return { ...s, isAssigned: isAssignedDB || isInQueue };
      })
      .sort((a: any, b: any) => {
        // Unassigned first (false < true)
        return Number(a.isAssigned) - Number(b.isAssigned);
      });
  }, [
    participants,
    assignments,
    queue,
    selectedGroupId,
    selectedCategoryId,
    selectedCategoryType,
    selectedProgrammeId,
    fixedGroupId,
  ]);

  // What the name search narrows the list down to. Selection and capacity
  // maths always run on the full eligible list, never on the search result.
  const visibleParticipants = useMemo(() => {
    const q = participantSearch.trim().toLowerCase();
    if (!q) return filteredParticipants;
    return filteredParticipants.filter((s: any) =>
      `${s.name ?? ""} ${s.chestNumber ?? ""}`.toLowerCase().includes(q),
    );
  }, [filteredParticipants, participantSearch]);

  // Limits Logic
  type LimitInfo =
    | { type: "INDIVIDUAL"; max: number; label: string }
    | { type: "GROUP"; maxTeams: number; maxPerTeam: number; label: string };

  const limitInfo = useMemo<LimitInfo | null>(() => {
    if (!selectedProgramme) return null;

    if (selectedProgramme.type === "INDIVIDUAL") {
      return {
        type: "INDIVIDUAL",
        max: selectedProgramme.maxParticipantsPerGroup || 1,
        label: `Max Entries: ${selectedProgramme.maxParticipantsPerGroup || 1}`,
      };
    } else {
      return {
        type: "GROUP",
        maxTeams: selectedProgramme.maxTeamsPerGroup || 1,
        maxPerTeam: selectedProgramme.maxParticipantsPerTeam || 1,
        label: `Max Teams: ${selectedProgramme.maxTeamsPerGroup || 1} | Size: ${selectedProgramme.maxParticipantsPerTeam || 1}`,
      };
    }
  }, [selectedProgramme]);

  // -- AUTO-ASSIGNMENT & LIMIT LOGIC --
  // Calculate next available team or if limit reached.
  const assignmentState = useMemo(() => {
    if (!selectedProgramme || !limitInfo || !selectedGroupId)
      return { canAssign: false, message: "Pick a programme first" };

    // Existing DB Assignments for this Group & Programme
    // For Group Programme: Count by Team Number
    // For Individual: Count total

    const dbAssignments = assignments.filter(
      (a: any) =>
        a.programmeId === selectedProgrammeId &&
        (a.groupId === selectedGroupId ||
          a.participant?.groupId === selectedGroupId),
    );

    const queueAssignments = queue.filter(
      (q) =>
        q.programmeId === selectedProgrammeId && q.groupId === selectedGroupId,
    );

    const currentSelectionCount = selectedParticipantIds.size;
    const totalCurrentCount =
      dbAssignments.length + queueAssignments.length + currentSelectionCount;

    if (limitInfo.type === "INDIVIDUAL") {
      if (totalCurrentCount >= limitInfo.max) {
        // If we are selecting, we might have JUST reached it.
        // Logic: If selection > 0 and total == max, we are FULL but valid.
        // If selection == 0 and total == max, we cannot add more.
        // Actually simplest: Can we add 1 more?
        const potential =
          dbAssignments.length +
          queueAssignments.length +
          currentSelectionCount;
        // If potential >= max, then we can't select any MORE.
        // But existing selection is valid if potential == max.
        if (potential >= limitInfo.max) {
          return {
            canAssign: false,
            limitReached: true,
            message: `This group already has all ${limitInfo.max} place${
              limitInfo.max === 1 ? "" : "s"
            } filled`,
          };
        }
      }
      return { canAssign: true, type: "INDIVIDUAL" }; // Individual doesn't need team number
    } else {
      // GROUP PROGRAMME LOGIC
      // We need to find the first available team slot (1..maxTeams)
      // A team is available if count < maxPerTeam.

      // 1. Map Usage per Team
      const teamUsage = new Map<number, number>();
      // Initialize 1..MaxTeams
      for (let i = 1; i <= limitInfo.maxTeams; i++) {
        teamUsage.set(i, 0);
      }

      // Fill from DB
      dbAssignments.forEach((a: any) => {
        const t = a.teamNumber || 1; // Default to 1 if missing
        teamUsage.set(t, (teamUsage.get(t) || 0) + 1);
      });

      // Fill from Queue
      queueAssignments.forEach((q) => {
        const t = q.teamNumber;
        teamUsage.set(t, (teamUsage.get(t) || 0) + 1);
      });

      // Current Selection: We haven't assigned them a team yet. They are just "pending".
      // They will take up the NEXT available slots.
      // We need to simulate placing them to see if we hit a wall.

      // How many slots do we need? = currentSelectionCount + 1 (for the next potential toggle)
      // Wait, for `canAssign` (rendering the list enabled/disabled), we just check if AT LEAST ONE slot exists
      // AFTER accounting for current selection.

      // Let's conceptually "fill" spots with selected participants
      let pending = currentSelectionCount;

      let targetTeamForNext = -1;
      let isFull = true;

      // Simple Greedy Fill for validation:
      // Iterate teams 1..Max
      for (let i = 1; i <= limitInfo.maxTeams; i++) {
        let used = teamUsage.get(i) || 0;
        const capacity = limitInfo.maxPerTeam;
        const remaining = Math.max(0, capacity - used);

        if (pending > 0) {
          // Selected participants take these spots
          const take = Math.min(pending, remaining);
          used += take;
          pending -= take;
        }

        // If after filling satisfied pending, is there STILL room for one more?
        if (pending === 0 && used < capacity) {
          // Found our target for the NEXT click
          if (targetTeamForNext === -1) targetTeamForNext = i;
          isFull = false;
          // We can stop? No, we need to know if FULL globally, so check all?
          // Actually if we found one open spot, we are good to go.
          break;
        }
      }

      if (pending > 0) {
        // We couldn't even fit the SELECTED participants
        return {
          canAssign: false,
          limitReached: true,
          message: "That is more people than there is room for",
        };
      }

      if (isFull) {
        return {
          canAssign: false,
          limitReached: true,
          message: "Every team is already full",
        };
      }

      return { canAssign: true, type: "GROUP", nextTeam: targetTeamForNext };
    }
  }, [
    limitInfo,
    assignments,
    queue,
    selectedProgrammeId,
    selectedGroupId,
    selectedParticipantIds.size,
    selectedProgramme,
  ]);

  // Handler for adding to the list - MUST USE AUTO-ASSIGN
  const handleAddToQueue = () => {
    addParticipantsToQueue(selectedParticipantIds);
  };

  // Generic queue impl, used by both the manual "Add selected" button and the
  // "Add everyone" quick action. Takes an explicit set of participant IDs so
  // the bulk path can supply it directly without waiting on a batched state
  // update.
  const addParticipantsToQueue = (ids: Set<string>) => {
    if (isReadOnly) return;
    if (!selectedProgramme || ids.size === 0) return;
    if (
      !assignmentState.canAssign &&
      assignmentState.limitReached &&
      ids.size === 0
    )
      return;
    // Note: if selection exists but limit reached, we MIGHT be able to commit if valid?
    // Based on logic above, if 'limitReached' is true, it implies checking for +1.
    // But Render logic disables inputs. So if we have selection, it fits.

    const newItems: QueueItem[] = [];

    // We need to assign teams to the selected IDs cleanly.
    // Re-run the greedy placement just for these specific IDs to get their Team Numbers.

    // Copy of usage logic
    const dbAssignments = assignments.filter(
      (a: any) =>
        a.programmeId === selectedProgrammeId &&
        (a.groupId === selectedGroupId ||
          a.participant?.groupId === selectedGroupId),
    );
    const queueAssignments = queue.filter(
      (q) =>
        q.programmeId === selectedProgrammeId && q.groupId === selectedGroupId,
    );

    const teamUsage = new Map<number, number>();
    if (limitInfo && limitInfo.type === "GROUP") {
      for (let i = 1; i <= limitInfo.maxTeams; i++) teamUsage.set(i, 0);
      dbAssignments.forEach((a: any) => {
        const t = a.teamNumber || 1;
        teamUsage.set(t, (teamUsage.get(t) || 0) + 1);
      });
      queueAssignments.forEach((q) => {
        const t = q.teamNumber;
        teamUsage.set(t, (teamUsage.get(t) || 0) + 1);
      });
    }

    Array.from(ids).forEach((sId) => {
      const participant = participants.find((s: any) => s.id === sId);
      if (!participant) return;

      // Check if already in the list (sanity check)
      if (
        queue.some(
          (q) =>
            q.programmeId === selectedProgrammeId && q.participantId === sId,
        )
      )
        return;

      // Determine Team
      let assignedTeam = 1;
      if (limitInfo?.type === "GROUP") {
        // Find first bucket with room
        let found = false;
        for (let i = 1; i <= limitInfo.maxTeams; i++) {
          const used = teamUsage.get(i) || 0;
          if (used < (limitInfo.maxPerTeam || 0)) {
            assignedTeam = i;
            teamUsage.set(i, used + 1); // Increment usage for next participant in this batch
            found = true;
            break;
          }
        }
        if (!found) {
          // Should not happen if UI disabled correctly, but fail safe
          toast.error(
            `No team has room left for ${participant.name}. Remove someone first.`,
          );
          return;
        }
      }

      newItems.push({
        id: Math.random().toString(36).substr(2, 9),
        programmeId: selectedProgrammeId,
        programmeName: selectedProgramme.name,
        participantId: sId,
        participantName: participant.name ?? "",
        groupId: selectedGroupId,
        groupName: selectedGroup?.name,
        teamNumber: assignedTeam, // Auto-assigned
        categoryName: selectedCategory?.name || "",
        isGroupType: limitInfo?.type === "GROUP",
      });
    });

    if (newItems.length === 0) return;
    setQueue((prev) => [...prev, ...newItems]);
    if (ids === selectedParticipantIds) setSelectedParticipantIds(new Set()); // Clear selection only for the manual path
  };

  // "Add everyone" quick action — selects every eligible (unassigned,
  // not-yet-listed) participant and adds them in one go, respecting the
  // programme's per-group capacity. For programmes that are already full the
  // button is disabled.
  const eligibleUnassignedCount = useMemo(() => {
    if (!selectedProgramme) return 0;
    return filteredParticipants.filter((s: any) => !s.isAssigned).length;
  }, [filteredParticipants, selectedProgramme]);

  // Total slots the group still has on this programme (across all teams).
  // Used both to surface "capacity full" and to clamp the "add everyone" batch.
  const remainingProgrammeSlots = useMemo(() => {
    if (!selectedProgramme || !selectedGroupId || !limitInfo) return 0;
    const dbCount = assignments.filter(
      (a: any) =>
        a.programmeId === selectedProgrammeId &&
        (a.groupId === selectedGroupId ||
          a.participant?.groupId === selectedGroupId),
    ).length;
    const queueCount = queue.filter(
      (q) =>
        q.programmeId === selectedProgrammeId && q.groupId === selectedGroupId,
    ).length;
    const cap =
      limitInfo.type === "INDIVIDUAL"
        ? limitInfo.max
        : limitInfo.maxTeams * limitInfo.maxPerTeam;
    return Math.max(0, cap - dbCount - queueCount);
  }, [
    assignments,
    queue,
    selectedProgrammeId,
    selectedGroupId,
    selectedProgramme,
    limitInfo,
  ]);

  const handleAddAllEligible = () => {
    if (isReadOnly || !selectedProgramme) return;
    if (remainingProgrammeSlots <= 0) {
      toast.info("This programme is already full for this group");
      return;
    }
    const eligibleIds = filteredParticipants
      .filter((s: any) => !s.isAssigned)
      .slice(0, remainingProgrammeSlots)
      .map((s: any) => s.id);
    if (eligibleIds.length === 0) {
      toast.info("Everyone here is already on this programme");
      return;
    }
    addParticipantsToQueue(new Set(eligibleIds));
  };

  const isLimitReached = assignmentState.limitReached || false;

  const handleRemoveFromQueue = (itemId: string) => {
    const removed = queue.find((item) => item.id === itemId);
    setQueue((prev) => prev.filter((item) => item.id !== itemId));

    // If the person being removed was picked as their team's lead, drop that
    // choice too — otherwise the save would send a lead who is no longer there.
    if (!removed) return;
    const teamKey = `${removed.programmeId}:${removed.groupId}:${removed.teamNumber}`;
    setTeamLeadChoice((prev) => {
      if (prev[teamKey] !== removed.participantId) return prev;
      const next = { ...prev };
      delete next[teamKey];
      return next;
    });
  };

  /**
   * The review list, bundled the way it will actually exist after saving:
   * one block per team (group programmes) or per programme (individual ones),
   * instead of one flat row per person.
   */
  const reviewBlocks = useMemo(() => {
    const byKey = new Map<
      string,
      {
        key: string;
        programmeName: string;
        groupName?: string;
        teamNumber: number;
        isGroupType?: boolean;
        items: QueueItem[];
      }
    >();

    for (const item of queue) {
      const key = item.isGroupType
        ? `${item.programmeId}:${item.groupId}:${item.teamNumber}`
        : `${item.programmeId}:${item.groupId}`;
      if (!byKey.has(key)) {
        byKey.set(key, {
          key,
          programmeName: item.programmeName,
          groupName: item.groupName,
          teamNumber: item.teamNumber,
          isGroupType: item.isGroupType,
          items: [],
        });
      }
      byKey.get(key)!.items.push(item);
    }

    return Array.from(byKey.values());
  }, [queue]);

  const handleSave = async () => {
    if (isReadOnly) return;
    if (queue.length === 0) return;
    setIsSubmitting(true);
    try {
      const teamLeadsByTeam = requiresTeamLead
        ? Object.fromEntries(
            Array.from(leadRequiredKeys)
              .map((key) => [key, teamLeadChoice[key]] as const)
              .filter(([, participantId]) => Boolean(participantId)),
          )
        : undefined;

      await bulkCreateAssignment.mutateAsync({
        festivalId,
        data: {
          assignments: queue.map((item) => ({
            programmeId: item.programmeId,
            participantId: item.participantId,
            teamNumber: item.teamNumber,
          })),
          teamLeadsByTeam,
        },
      });
      setQueue([]);
      setTeamLeadChoice({});
      onOpenChange(false);
      // Reset form
      setSelectedProgrammeId("");
      setSelectedParticipantIds(new Set());
      setParticipantSearch("");
      setView("SELECTION");
    } catch (error) {
      console.error(error);
      // Error handled by hook toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleParticipant = (participantId: string) => {
    if (isReadOnly) return;
    const next = new Set(selectedParticipantIds);
    if (next.has(participantId)) {
      next.delete(participantId);
    } else {
      if (isLimitReached) {
        // Double check: if unchecked, we can always uncheck.
        // Logic 'isLimitReached' renders the LIST disabled, checking is handled by onClick wrapper?
        // But if we are here, and limit reached, we simply don't add.
        return;
      }
      next.add(participantId);
    }
    setSelectedParticipantIds(next);
  };

  const needsCategory = !selectedCategoryId;
  const needsGroup = hasGroupStep && !selectedGroupId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-[calc(100%-1rem)] sm:w-[95vw] h-[95vh] max-h-dvh flex flex-col p-0 gap-0 border rounded-lg sm:rounded-xl mx-auto my-auto ring-0 outline-none overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b flex items-start justify-between gap-3 bg-card z-10 shrink-0">
          <div className="min-w-0">
            <DialogTitle className="text-lg sm:text-xl">
              New assignment
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {view === "SELECTION"
                ? "Step 1 of 2 — choose a programme and the people taking part."
                : "Step 2 of 2 — check the list, then save."}
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* --- VIEW: SELECTION --- */}
        {view === "SELECTION" && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {/* Context bar — category and group, on one line */}
            <div className="shrink-0 border-b bg-muted/20 px-4 sm:px-6 py-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="min-w-0 flex-1 sm:max-w-xs">
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                    Category
                  </p>
                  <Select
                    value={selectedCategoryId}
                    onValueChange={(val) => {
                      setSelectedCategoryId(val);
                      setSelectedProgrammeId("");
                      setSelectedParticipantIds(new Set());
                      setParticipantSearch("");
                    }}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue placeholder="Choose a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                          {c.type === "GENERAL" ? " (General)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {hasGroupStep && (
                  <div className="min-w-0 flex-1 sm:max-w-xs">
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                      Group
                    </p>
                    <Select
                      value={selectedGroupId}
                      onValueChange={(val) => {
                        setSelectedGroupId(val);
                        // Group comes after category — only reset downstream
                        // selections, keep the category.
                        setSelectedProgrammeId("");
                        setSelectedParticipantIds(new Set());
                        setParticipantSearch("");
                      }}
                      disabled={isReadOnly || !selectedCategoryId}
                    >
                      <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder="Choose a group" />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {selectedCategoryType === "GENERAL" && (
                <p className="mt-2 text-xs text-muted-foreground">
                  General category — anyone can take part, whatever their own
                  category.
                </p>
              )}
            </div>

            {/* Two panes: programmes on the left, people on the right */}
            <div className="flex-1 flex flex-col lg:grid lg:grid-cols-2 overflow-hidden bg-background min-h-0">
              {/* Programmes */}
              <div className="flex-1 flex flex-col min-h-0 border-b lg:border-b-0 lg:border-r">
                <div className="px-4 sm:px-6 h-12 border-b bg-muted/5 flex items-center justify-between gap-2 shrink-0">
                  <h3 className="text-sm font-semibold">Pick a programme</h3>
                  {filteredProgrammes.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {filteredProgrammes.length} available
                    </span>
                  )}
                </div>
                <ScrollArea className="flex-1 p-4 sm:p-6">
                  {needsCategory || needsGroup ? (
                    <div className="flex flex-col items-center justify-center gap-1 py-12 text-center text-muted-foreground">
                      <ClipboardList className="h-8 w-8 opacity-20" />
                      <p className="text-sm">
                        {needsCategory
                          ? "Choose a category above to see its programmes."
                          : "Choose a group above to continue."}
                      </p>
                    </div>
                  ) : filteredProgrammes.length === 0 ? (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                      No programmes in this category yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredProgrammes.map((p: any) => (
                        <button
                          type="button"
                          key={p.id}
                          disabled={isReadOnly}
                          onClick={() => {
                            if (isReadOnly) return;
                            setSelectedProgrammeId(p.id);
                            setSelectedParticipantIds(new Set());
                            setParticipantSearch("");
                          }}
                          className={cn(
                            "flex flex-col items-start gap-2 text-left p-3 rounded-lg border transition-all hover:shadow-md",
                            selectedProgrammeId === p.id
                              ? "border-primary bg-primary/5 ring-1 ring-primary/50"
                              : "bg-card hover:bg-accent/50",
                            isReadOnly
                              ? "cursor-not-allowed opacity-60 hover:shadow-none"
                              : "",
                          )}
                        >
                          <div className="flex w-full items-start justify-between gap-2">
                            <span className="font-semibold text-sm">
                              {p.name}
                            </span>
                            <Badge
                              variant={
                                p.type === "INDIVIDUAL"
                                  ? "outline"
                                  : "secondary"
                              }
                              className="shrink-0 text-[10px] h-5"
                            >
                              {p.type === "INDIVIDUAL" ? "Solo" : "Team"}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {describeLimits(p)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* People */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="px-4 sm:px-6 py-2.5 border-b bg-muted/5 shrink-0 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">
                      {selectedProgramme?.type === "GROUP"
                        ? "Pick team members"
                        : "Pick participants"}
                    </h3>
                    {selectedProgramme && (
                      <span
                        className={cn(
                          "text-xs",
                          remainingProgrammeSlots > 0
                            ? "text-muted-foreground"
                            : "font-medium text-destructive",
                        )}
                      >
                        {remainingProgrammeSlots > 0
                          ? `${remainingProgrammeSlots} place${
                              remainingProgrammeSlots === 1 ? "" : "s"
                            } left`
                          : "No places left"}
                      </span>
                    )}
                  </div>

                  {selectedProgramme && (
                    <>
                      {filteredParticipants.length > 8 && (
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            inputSize="s"
                            className="pl-8"
                            placeholder="Search by name"
                            value={participantSearch}
                            onChange={(e) =>
                              setParticipantSearch(e.target.value)
                            }
                          />
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          className="h-8"
                          disabled={
                            isReadOnly || selectedParticipantIds.size === 0
                          }
                          onClick={handleAddToQueue}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {selectedParticipantIds.size > 0
                            ? `Add ${selectedParticipantIds.size} to list`
                            : "Add to list"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          disabled={
                            isReadOnly ||
                            eligibleUnassignedCount === 0 ||
                            remainingProgrammeSlots <= 0
                          }
                          onClick={handleAddAllEligible}
                          title="Adds everyone who is free, up to the places left"
                        >
                          Add everyone (
                          {Math.min(
                            eligibleUnassignedCount,
                            remainingProgrammeSlots,
                          )}
                          )
                        </Button>

                        {isLimitReached ? (
                          <span className="text-xs font-medium text-destructive">
                            {assignmentState.message}
                          </span>
                        ) : selectedProgramme.type === "GROUP" ? (
                          <span className="text-xs text-muted-foreground">
                            Next picks join Team{" "}
                            {assignmentState.nextTeam || "?"}
                          </span>
                        ) : null}
                      </div>
                    </>
                  )}
                </div>

                <ScrollArea className="flex-1 p-4 sm:p-6">
                  {!selectedProgramme ? (
                    <div className="flex flex-col items-center justify-center gap-1 py-12 text-center text-muted-foreground">
                      <Users className="h-8 w-8 opacity-20" />
                      <p className="text-sm">
                        Pick a programme first, then choose who takes part.
                      </p>
                    </div>
                  ) : filteredParticipants.length === 0 ? (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                      Nobody in this group can take part in this programme.
                    </p>
                  ) : visibleParticipants.length === 0 ? (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                      No names match your search.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {visibleParticipants.map((s: any) => {
                        const isSelected = selectedParticipantIds.has(s.id);
                        const isAssigned = s.isAssigned;
                        // Disabled if already on the programme, or if there is
                        // no room left and this person is not already picked.
                        const isDisabled =
                          isReadOnly ||
                          isAssigned ||
                          (isLimitReached && !isSelected);

                        return (
                          <button
                            type="button"
                            key={s.id}
                            onClick={() =>
                              !isDisabled && toggleParticipant(s.id)
                            }
                            disabled={isDisabled}
                            className={cn(
                              "relative flex w-full items-center justify-between gap-2 overflow-hidden rounded-md border p-3 text-left text-sm transition-all",
                              isAssigned
                                ? "bg-muted/40 border-border text-muted-foreground cursor-default"
                                : isReadOnly
                                  ? "bg-muted opacity-50 cursor-not-allowed"
                                  : isSelected
                                    ? "bg-primary/10 border-primary text-primary font-medium ring-1 ring-primary cursor-pointer"
                                    : isDisabled
                                      ? "bg-muted opacity-50 cursor-not-allowed"
                                      : "bg-card hover:border-primary/50 hover:shadow-sm cursor-pointer",
                            )}
                          >
                            <span className="truncate">{s.name}</span>

                            {isSelected && (
                              <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                            )}

                            {isAssigned && (
                              <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                Already added
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>

            {/* Sticky footer — the list so far, and the way forward */}
            <div className="shrink-0 border-t bg-card px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
              <p className="text-sm">
                {queue.length === 0 ? (
                  <span className="text-muted-foreground">
                    Nothing added yet
                  </span>
                ) : (
                  <>
                    <span className="font-semibold">{queue.length}</span>{" "}
                    <span className="text-muted-foreground">
                      {queue.length === 1 ? "person" : "people"} ready to save
                    </span>
                  </>
                )}
              </p>
              <Button
                onClick={() => setView("REVIEW")}
                disabled={isReadOnly || queue.length === 0}
              >
                Review and save <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* --- VIEW: REVIEW --- */}
        {view === "REVIEW" && (
          <div className="flex-1 flex flex-col bg-muted/5 animate-in slide-in-from-right-10 duration-200 overflow-hidden min-h-0">
            <div className="flex-1 flex justify-center p-4 sm:p-8 overflow-hidden min-h-0">
              <div className="w-full max-w-3xl flex flex-col bg-background rounded-lg border h-full shadow-sm overflow-hidden">
                <div className="p-4 border-b flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold">
                      {queue.length} {queue.length === 1 ? "person" : "people"}{" "}
                      ready to save
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Remove anyone who should not be here.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setView("SELECTION")}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
                  </Button>
                </div>

                {/* One banner, so the only thing left to do is impossible to miss */}
                {teamsMissingLeadCount > 0 && (
                  <div className="flex items-start gap-2 border-b border-amber-500/40 bg-amber-500/10 px-4 py-3">
                    <Crown className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
                    <p className="text-sm text-amber-900 dark:text-amber-200">
                      <span className="font-semibold">
                        {teamsMissingLeadCount === 1
                          ? "1 team still needs a lead."
                          : `${teamsMissingLeadCount} teams still need a lead.`}
                      </span>{" "}
                      Tap a name to make that person the lead.
                    </p>
                  </div>
                )}

                <ScrollArea className="flex-1">
                  {reviewBlocks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-1 p-12 text-center text-muted-foreground">
                      <ClipboardList className="h-8 w-8 opacity-20" />
                      <p className="text-sm">
                        The list is empty. Go back and add some people.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 p-4">
                      {reviewBlocks.map((block) => {
                        const needsLead = leadRequiredKeys.has(block.key);
                        const leadId = teamLeadChoice[block.key];
                        const leadMissing = needsLead && !leadId;

                        return (
                          <div
                            key={block.key}
                            className={cn(
                              "rounded-lg border p-3",
                              leadMissing
                                ? "border-amber-500/50 bg-amber-500/5"
                                : "bg-card",
                            )}
                          >
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              {block.programmeName}
                              {block.groupName ? ` · ${block.groupName}` : ""}
                              {block.isGroupType
                                ? ` · Team ${block.teamNumber}`
                                : ""}
                            </p>

                            <ul className="mt-2 space-y-1">
                              {block.items.map((item) => (
                                <li
                                  key={item.id}
                                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40"
                                >
                                  <span className="flex min-w-0 items-center gap-1.5">
                                    <span className="truncate text-sm font-medium">
                                      {item.participantName}
                                    </span>
                                    {leadId === item.participantId && (
                                      <Crown className="h-3.5 w-3.5 shrink-0 text-primary" />
                                    )}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                                    aria-label={`Remove ${item.participantName}`}
                                    onClick={() =>
                                      handleRemoveFromQueue(item.id)
                                    }
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </li>
                              ))}
                            </ul>

                            {needsLead && (
                              <div className="mt-3 border-t pt-3">
                                <p className="text-xs font-medium mb-2">
                                  {leadId
                                    ? "Team lead"
                                    : "Who leads this team?"}
                                </p>
                                <Select
                                  value={leadId || ""}
                                  onValueChange={(val) =>
                                    setTeamLeadChoice((prev) => ({
                                      ...prev,
                                      [block.key]: val,
                                    }))
                                  }
                                >
                                  <SelectTrigger className="w-full sm:w-[250px] bg-background">
                                    <SelectValue placeholder="Select team lead" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {block.items.map((item) => (
                                      <SelectItem key={item.id} value={item.participantId}>
                                        <div className="flex items-center gap-2">
                                          <Crown className="h-3.5 w-3.5 text-amber-500 opacity-70" />
                                          {item.participantName}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>

                <div className="p-4 border-t bg-muted/10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setView("SELECTION")}
                    disabled={isReadOnly}
                  >
                    Add more people
                  </Button>
                  <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
                    <Button
                      onClick={handleSave}
                      disabled={
                        isReadOnly ||
                        isSubmitting ||
                        queue.length === 0 ||
                        missingTeamLead
                      }
                    >
                      {isSubmitting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Save {queue.length}{" "}
                      {queue.length === 1 ? "assignment" : "assignments"}
                    </Button>
                    {missingTeamLead && (
                      <span className="text-xs text-muted-foreground">
                        Pick a lead for every team to continue.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
