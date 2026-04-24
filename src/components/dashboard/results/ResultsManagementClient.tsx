"use client";

import type { ProgrammeStatus } from "@/lib/app-enums";
import {
  AlertCircle,
  Award,
  Check,
  CheckCircle2,
  Eye,
  Filter,
  Loader2,
  Lock,
  Medal,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Trophy,
  Unlock,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { HowItWorksButton } from "@/components/dashboard/HowItWorksButton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFeature, useFeatureTag } from "@/hooks/useFeature";
import { useFestivalReadOnly } from "@/hooks/useFestivalReadOnly";
import { formatCountdownHms } from "@/lib/format-countdown-hms";
import {
  calculateGrade,
  calculatePosition,
  getGradeBadgeColor,
} from "@/lib/results-calculator";
import { cn } from "@/lib/utils";
import { createProgrammeJudgeLinkAction } from "@/server/actions/programme-judging.actions";
import {
  bulkPublishProgrammeResults,
  deleteResult,
  saveResult,
} from "@/server/actions/results";

type Programme = {
  id: string;
  name: string;
  status?: ProgrammeStatus;
  type: "INDIVIDUAL" | "GROUP";
  category: { id: string; name: string };
  programme_judge_session?: Array<{
    id: string;
    started_at: Date;
    used_at: Date | null;
    ended_at: Date | null;
  }>;
  assignments: Array<{
    id: string;
    teamNumber: number;
    student: { id: string; name: string; chestNumber: string | null } | null;
    group: { id: string; name: string } | null;
    result: {
      id: string;
      grade: string | null;
      position: number | null;
      points: number;
      remarks: string | null;
      isPublished: boolean;
      codeLetter?: { code: string } | null;
    } | null;
  }>;
  stats?: {
    totalParticipants: number;
    enteredScores: number;
    publishedCount: number;
    isFullyScored: boolean;
    status:
      | "published"
      | "ready"
      | "in-progress"
      | "not-started"
      | "partial-published";
  };
};

type Category = {
  id: string;
  name: string;
};

type Festival = {
  id: string;
  name: string;
  slug: string;
};

interface ResultsManagementClientProps {
  festival: Festival;
  programmes: Programme[];
  categories: Category[];
  children?: React.ReactNode;
}

// Judgment entry mode: Basic = manual entry (this UI). Standard/Pro = shareable link
// for external marking; code-letter system used there for real-time programme reporting.

// Helper to identify teams
const getTeamIdentifier = (
  assignment: Programme["assignments"][0],
  type: string,
) => {
  if (type === "GROUP" && assignment.group) {
    return `${assignment.group.id}-${assignment.teamNumber || 1}`;
  }
  return assignment.id;
};

const getTeamName = (assignment: Programme["assignments"][0], type: string) => {
  if (type === "GROUP" && assignment.group) {
    return `${assignment.group.name}${
      assignment.teamNumber > 1 ? ` (Team ${assignment.teamNumber})` : ""
    }`;
  }
  return assignment.student?.name || "Unknown";
};

const getSubLabel = (assignment: Programme["assignments"][0], type: string) => {
  if (type === "GROUP") {
    return `Team ${assignment.teamNumber || 1}`;
  }
  return `#${assignment.student?.chestNumber || "N/A"}`;
};

export function ResultsManagementClient({
  festival,
  programmes,
  categories,
  children,
}: ResultsManagementClientProps) {
  const { isReadOnly } = useFestivalReadOnly();
  const canUseExternalJudging = useFeatureTag("eventWorks.externalJudging");
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedProgramme, setSelectedProgramme] = useState<string>("");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [isPending, startTransition] = useTransition();
  const [viewProgramme, setViewProgramme] = useState<Programme | null>(null);
  const [publishingProgrammeId, setPublishingProgrammeId] = useState<
    string | null
  >(null);
  // Avoid hydration mismatch: timers should not be based on Date.now() during SSR.
  // We start ticking after mount.
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [judgeLinksByProgrammeId, setJudgeLinksByProgrammeId] = useState<
    Record<string, { judgeUrl: string; startedAt: Date }>
  >({});
  const [creatingJudgeLinkProgrammeId, setCreatingJudgeLinkProgrammeId] =
    useState<string | null>(null);

  useEffect(() => {
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // View details rows for modal (same shape as Results/Leaderboard view details)
  const viewDetailsRows = useMemo(() => {
    if (!viewProgramme) return [];

    if (viewProgramme.type === "GROUP") {
      const teamMap = new Map<
        string,
        {
          assignmentId: string;
          displayName: string;
          subText: string;
          chestNumber: string;
          codeLetter: string;
          grade: string | null;
          points: number;
          position: number | null;
          remarks: string | null;
        }
      >();
      viewProgramme.assignments.forEach((assignment) => {
        if (!assignment.result) return;
        const teamId = getTeamIdentifier(assignment, "GROUP");
        if (!teamMap.has(teamId)) {
          const studentAndTeam = `${assignment.student?.name || "Unknown"} and team`;
          const groupName = assignment.group?.name || "";
          teamMap.set(teamId, {
            assignmentId: assignment.id,
            displayName: studentAndTeam,
            subText: groupName,
            chestNumber: "",
            codeLetter: assignment.result?.codeLetter?.code ?? "-",
            grade: assignment.result.grade,
            points: assignment.result.points,
            position: assignment.result.position ?? null,
            remarks: assignment.result.remarks,
          });
        }
      });
      return Array.from(teamMap.values()).sort((a, b) => {
        if (a.position != null && b.position != null)
          return a.position - b.position;
        return (b.points || 0) - (a.points || 0);
      });
    }

    const details = viewProgramme.assignments
      .filter((a) => a.result != null)
      .map((assignment) => {
        const result = assignment.result!;
        return {
          assignmentId: assignment.id,
          displayName: assignment.student?.name || "Unknown",
          subText: "",
          chestNumber: assignment.student?.chestNumber
            ? `#${assignment.student.chestNumber}`
            : "",
          codeLetter: assignment.result?.codeLetter?.code ?? "-",
          grade: result.grade,
          points: result.points,
          position: result.position ?? null,
          remarks: result.remarks,
        };
      });
    return details.sort((a, b) => {
      if (a.position != null && b.position != null)
        return a.position - b.position;
      return (b.points || 0) - (a.points || 0);
    });
  }, [viewProgramme]);

  // Filter states for main table
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterProgrammeType, setFilterProgrammeType] = useState<string>("all");

  // Compute Programme Stats and Status
  const programmeStats = useMemo(() => {
    return programmes
      .map((prog) => {
        // Base counts (Students)
        const totalParticipants = prog.assignments.length;
        const enteredScores = prog.assignments.filter(
          (a) => a.result?.points != null,
        ).length;
        const publishedCount = prog.assignments.filter(
          (a) => a.result?.isPublished,
        ).length;

        // Effective Counts (Teams for Groups, Students for Individual)
        let finalTotal = totalParticipants;
        let finalEntered = enteredScores;
        let finalPublished = publishedCount;

        if (prog.type === "GROUP") {
          const uniqueTeams = new Set<string>();
          const scoredTeams = new Set<string>();
          const publishedTeams = new Set<string>();

          prog.assignments.forEach((a) => {
            const teamId = getTeamIdentifier(a, "GROUP");
            uniqueTeams.add(teamId);
            if (a.result?.points != null) scoredTeams.add(teamId);
            if (a.result?.isPublished) publishedTeams.add(teamId);
          });

          finalTotal = uniqueTeams.size;
          finalEntered = scoredTeams.size;
          finalPublished = publishedTeams.size;
        }

        const isFullyScored = finalTotal > 0 && finalEntered === finalTotal;

        let status:
          | "published"
          | "ready"
          | "in-progress"
          | "not-started"
          | "partial-published" = "not-started";

        if (finalPublished === finalTotal && finalTotal > 0) {
          status = "published";
        } else if (finalPublished > 0) {
          status = "partial-published";
        } else if (isFullyScored) {
          status = "ready";
        } else if (finalEntered > 0) {
          status = "in-progress";
        }

        return {
          ...prog,
          stats: {
            totalParticipants: finalTotal,
            enteredScores: finalEntered,
            publishedCount: finalPublished,
            isFullyScored,
            status,
          },
        };
      })
      .sort((a, b) => {
        if (a.category.name !== b.category.name) {
          return a.category.name < b.category.name ? -1 : 1;
        }
        return a.name < b.name ? -1 : 1;
      });
  }, [programmes]);

  // Filter programmes by selected category in modal - only include those with assignments
  const filteredModalProgrammes = useMemo(() => {
    if (!selectedCategory) return [];
    return programmeStats.filter(
      (p) =>
        p.category.id === selectedCategory && p.stats.totalParticipants > 0,
    );
  }, [selectedCategory, programmeStats]);

  // Derived categories that actually have assigned programmes
  const categoriesWithAssignments = useMemo(() => {
    const activeCategoryIds = new Set(
      programmeStats
        .filter((p) => p.stats.totalParticipants > 0)
        .map((p) => p.category.id),
    );
    return categories.filter((c) => activeCategoryIds.has(c.id));
  }, [categories, programmeStats]);

  const currentProgramme = programmeStats.find(
    (p) => p.id === selectedProgramme,
  );

  const pendingProgrammes = useMemo(() => {
    return programmeStats.filter(
      (p) =>
        p.stats.totalParticipants > 0 &&
        (p.stats.status === "not-started" || p.stats.status === "in-progress"),
    );
  }, [programmeStats]);

  const summaryStats = useMemo(() => {
    return {
      total: programmeStats.length,
      published: programmeStats.filter(
        (p) =>
          p.stats.status === "published" ||
          p.stats.status === "partial-published",
      ).length,
      ready: programmeStats.filter((p) => p.stats.status === "ready").length,
      pending: pendingProgrammes.length,
    };
  }, [programmeStats, pendingProgrammes]);

  // Filter programmes for the table
  const filteredTableProgrammes = useMemo(() => {
    // Hide Not Started programmes by default
    let result = programmeStats.filter((p) => p.stats.status !== "not-started");

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.category.name.toLowerCase().includes(query),
      );
    }

    if (filterCategory !== "all") {
      result = result.filter((p) => p.category.id === filterCategory);
    }

    if (filterStatus !== "all") {
      if (filterStatus === "published") {
        result = result.filter(
          (p) =>
            p.stats.status === "published" ||
            p.stats.status === "partial-published",
        );
      } else if (filterStatus === "ready") {
        result = result.filter((p) => p.stats.status === "ready");
      } else if (filterStatus === "in-progress") {
        result = result.filter((p) => p.stats.status === "in-progress");
      }
    }

    if (filterProgrammeType !== "all") {
      result = result.filter((p) => p.type === filterProgrammeType);
    }

    return result.sort((a, b) => {
      const aPublished =
        a.stats.status === "published" ||
        a.stats.status === "partial-published";
      const bPublished =
        b.stats.status === "published" ||
        b.stats.status === "partial-published";

      // Keep unpublished programmes at top by default.
      if (aPublished !== bPublished) {
        return aPublished ? 1 : -1;
      }

      // Then prioritize more recently active items by scored count.
      if (b.stats.enteredScores !== a.stats.enteredScores) {
        return b.stats.enteredScores - a.stats.enteredScores;
      }

      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
  }, [
    programmeStats,
    searchQuery,
    filterCategory,
    filterStatus,
    filterProgrammeType,
  ]);

  // PERF: memoized so recalculation only happens when scores or the selected
  // programme changes, not on every keystroke / state update.
  const results = useMemo(() => {
    if (!currentProgramme) return [];

    const teamPointsMap = new Map<string, number>();

    currentProgramme.assignments.forEach((assignment) => {
      const teamId = getTeamIdentifier(assignment, currentProgramme.type);
      const inputPoints = scores[teamId];
      const dbPoints = assignment.result?.points;
      const finalPoints =
        inputPoints !== undefined
          ? inputPoints
          : assignment.result != null
            ? dbPoints
            : undefined;

      if (
        finalPoints !== undefined &&
        finalPoints !== null &&
        finalPoints >= 0
      ) {
        teamPointsMap.set(teamId, finalPoints);
      }
    });

    const validPoints = Array.from(teamPointsMap.values());

    return currentProgramme.assignments.map((assignment) => {
      const teamId = getTeamIdentifier(assignment, currentProgramme.type);
      const points = teamPointsMap.get(teamId) ?? null;

      if (points === null || points < 0) {
        return {
          assignmentId: assignment.id,
          teamId,
          chestNumber: assignment.student?.chestNumber || "N/A",
          studentName: assignment.student?.name || "Unknown",
          displayName: getTeamName(assignment, currentProgramme.type),
          grade: "-",
          position: "-",
          points: 0,
          remarks: "-",
          hasExisting: !!assignment.result,
          resultId: assignment.result?.id,
        };
      }

      const maxPoints = validPoints.length > 0 ? Math.max(...validPoints) : 10;
      const gradeData = calculateGrade(points, maxPoints);
      const position = calculatePosition(points, validPoints);
      const roundedPoints = Math.round(points);

      return {
        assignmentId: assignment.id,
        teamId,
        chestNumber: assignment.student?.chestNumber || "N/A",
        studentName: assignment.student?.name || "Unknown",
        displayName: getTeamName(assignment, currentProgramme.type),
        grade: gradeData.grade,
        position,
        points: roundedPoints,
        remarks: gradeData.remarks,
        hasExisting: !!assignment.result,
        resultId: assignment.result?.id,
      };
    });
  }, [scores, currentProgramme]);
  const hasAnyPoints = results.some((r) => r.points !== null && r.points > 0);

  const handleScoreChange = (teamId: string, value: string) => {
    const points = parseFloat(value);
    if (!Number.isNaN(points)) {
      setScores((prev) => ({ ...prev, [teamId]: points }));
    } else {
      setScores((prev) => {
        const newScores = { ...prev };
        delete newScores[teamId];
        return newScores;
      });
    }
  };

  const handleSaveResults = async (shouldPublish = false) => {
    if (isReadOnly) return;
    if (!currentProgramme) return;

    const resultsToSave = results.filter((r) => r.grade !== "-");
    if (resultsToSave.length === 0) return;

    startTransition(async () => {
      // Run all saves in parallel instead of sequential awaits
      const responses = await Promise.all(
        resultsToSave.map((result) =>
          saveResult({
            festivalId: festival.id,
            programmeId: currentProgramme.id,
            assignmentId: result.assignmentId,
            grade: result.grade,
            position:
              result.position !== "-" ? (result.position as number) : null,
            points: result.points,
            remarks: result.remarks,
            isPublished: shouldPublish,
          }),
        ),
      );

      const errorCount = responses.filter((r) => !r?.success).length;

      if (errorCount === 0) {
        toast.success(
          shouldPublish
            ? "Results published successfully"
            : "Results saved successfully",
        );
        setScores({});
        setSelectedCategory("");
        setSelectedProgramme("");
        setIsModalOpen(false);
      } else {
        toast.error(`Failed to save ${errorCount} results`);
      }
    });
  };

  const handlePublishProgramme = (
    programmeId: string,
    isPublished: boolean,
  ) => {
    if (isReadOnly) return;
    setPublishingProgrammeId(programmeId);
    startTransition(async () => {
      try {
        const response = await bulkPublishProgrammeResults(
          programmeId,
          isPublished,
          festival.slug,
        );
        if (response.success) {
          toast.success(
            isPublished
              ? "Results published successfully"
              : "Results unpublished successfully",
          );
          router.refresh();
        } else {
          toast.error("Failed to update status");
        }
      } finally {
        setPublishingProgrammeId(null);
      }
    });
  };

  const handleCreateJudgeLink = (programmeId: string) => {
    if (isReadOnly) return;
    setCreatingJudgeLinkProgrammeId(programmeId);
    startTransition(async () => {
      try {
        const response = await createProgrammeJudgeLinkAction(
          festival.id,
          programmeId,
        );
        if (!response.success) {
          toast.error(response.error);
          return;
        }

        const startedAt = new Date(response.data.startedAt);
        setJudgeLinksByProgrammeId((prev) => ({
          ...prev,
          [programmeId]: {
            judgeUrl: response.data.judgeUrl,
            startedAt,
          },
        }));
        toast.success("Judge link created");
      } finally {
        setCreatingJudgeLinkProgrammeId(null);
      }
    });
  };

  const handleCopyJudgeLink = async (programmeId: string) => {
    const url = judgeLinksByProgrammeId[programmeId]?.judgeUrl;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Judge link copied");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleShareJudgeLinkWhatsApp = (programmeId: string) => {
    const url = judgeLinksByProgrammeId[programmeId]?.judgeUrl;
    if (!url) return;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(url)}`;
    window.open(waUrl, "_blank", "noopener");
  };

  const handleDeleteResult = async (
    resultIds: string[],
    identifier: string,
  ) => {
    if (isReadOnly) return;
    startTransition(async () => {
      setScores((prev) => {
        const newScores = { ...prev };
        delete newScores[identifier];
        return newScores;
      });

      // Run all deletes in parallel
      const responses = await Promise.all(
        resultIds.filter(Boolean).map((id) => deleteResult(id, festival.slug)),
      );

      const allSucceeded = responses.every((r) => r?.success);
      if (allSucceeded) toast.success("Result deleted successfully");
      else toast.error("Failed to delete some results");
    });
  };

  const handleEditResult = (programme: (typeof programmeStats)[0]) => {
    if (isReadOnly || canUseExternalJudging) return;
    setSelectedCategory(programme.category.id);
    setSelectedProgramme(programme.id);
    setScores({});
    setIsModalOpen(true);
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedProgramme("");
    setScores({});
  };

  const handleProgrammeChange = (programmeId: string) => {
    setSelectedProgramme(programmeId);
    setScores({});
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilterCategory("all");
    setFilterStatus("all");
    setFilterProgrammeType("all");
  };

  // Flattened assignments for mark inputs (one entry per chest/team)
  const markEntries = useMemo(() => {
    if (!currentProgramme) return [] as Programme["assignments"];

    const uniqueTeams = new Set<string>();
    const entries: Programme["assignments"] = [];

    currentProgramme.assignments.forEach((assignment) => {
      const teamId = getTeamIdentifier(assignment, currentProgramme.type);
      if (!uniqueTeams.has(teamId)) {
        uniqueTeams.add(teamId);
        entries.push(assignment);
      }
    });

    return entries;
  }, [currentProgramme]);

  // Group results for UI Rendering (Preview Table)
  const groupedPreviewResults = useMemo(() => {
    if (!results.length || !currentProgramme) return [];

    const uniqueResultMap = new Map<
      string,
      (typeof results)[0] & { allResultIds: string[] }
    >();

    results
      .filter((r) => r.points !== null && r.points > 0)
      .forEach((r) => {
        const existing = uniqueResultMap.get(r.teamId);
        if (existing) {
          if (r.resultId) existing.allResultIds.push(r.resultId);
        } else {
          uniqueResultMap.set(r.teamId, {
            ...r,
            allResultIds: r.resultId ? [r.resultId] : [],
          });
        }
      });

    return Array.from(uniqueResultMap.values()).sort(
      (a, b) => (b.points as number) - (a.points as number),
    );
  }, [results, currentProgramme]);

  const hasTableFilters =
    searchQuery ||
    filterCategory !== "all" ||
    filterStatus !== "all" ||
    filterProgrammeType !== "all";

  return (
    <div className="space-y-4">
      {/* Header row: children left, Enter Judgment right — icon only on mobile */}
      <div className="flex flex-row items-center justify-between gap-4">
        {children ?? (
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Judgment
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-0.5">
              Enter points per programme; grade and rank update automatically.
            </p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <HowItWorksButton
            title="How marks work"
            description="Enter points per chest; grade and rank are calculated automatically."
          >
            <p className="text-sm text-muted-foreground">
              Enter <strong>points</strong> per student. Grade and rank update
              automatically from the highest entered value.
            </p>
          </HowItWorksButton>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="gap-2"
                suppressHydrationWarning
                disabled={isReadOnly || canUseExternalJudging}
              >
                <Plus className="w-4 h-4 sm:mr-0" />
                <span className="hidden sm:inline">Add results</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100%-0.5rem)] sm:w-[calc(100%-2rem)] max-w-3xl max-h-[90dvh] sm:max-h-[90vh] overflow-y-auto p-2.5 sm:p-6 rounded-lg sm:rounded-xl">
              <DialogHeader className="text-left space-y-0.5 sm:space-y-1.5 px-0.5 sm:px-0">
                <DialogTitle className="text-sm sm:text-lg pr-7 sm:pr-8">
                  Add results
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                  Select programme and enter points. Grade and rank update
                  automatically.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 sm:space-y-4 mt-2 sm:mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <div className="space-y-1">
                    <Label
                      htmlFor="modal-category"
                      className="text-xs font-medium"
                    >
                      Category
                    </Label>
                    <Select
                      value={selectedCategory}
                      onValueChange={handleCategoryChange}
                      disabled={selectedProgramme !== "" && hasAnyPoints}
                    >
                      <SelectTrigger
                        id="modal-category"
                        className="h-9 sm:h-10 w-full text-sm"
                      >
                        <SelectValue placeholder="Select category..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categoriesWithAssignments.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label
                      htmlFor="modal-programme"
                      className="text-xs font-medium"
                    >
                      Programme
                    </Label>
                    <Select
                      value={selectedProgramme}
                      onValueChange={handleProgrammeChange}
                      disabled={
                        !selectedCategory ||
                        filteredModalProgrammes.length === 0
                      }
                    >
                      <SelectTrigger
                        id="modal-programme"
                        className="h-9 sm:h-10 w-full text-sm"
                      >
                        <SelectValue
                          placeholder={
                            !selectedCategory
                              ? "Select category first..."
                              : "Select programme..."
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredModalProgrammes.length > 0 ? (
                          filteredModalProgrammes.map((prog) => (
                            <SelectItem key={prog.id} value={prog.id}>
                              {prog.name}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                            No programmes available
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {currentProgramme && (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border border-primary/10 bg-primary/5">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <h3 className="font-semibold text-xs sm:text-base truncate">
                            {currentProgramme.name}
                          </h3>
                          {currentProgramme.type === "GROUP" && (
                            <Badge
                              variant="outline"
                              className="text-[10px] sm:text-xs shrink-0 px-1.5 py-0"
                            >
                              <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                              Group
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5">
                          <span className="font-medium text-primary">
                            {Object.keys(scores).length}
                          </span>
                          {" / "}
                          {currentProgramme.type === "GROUP"
                            ? `${markEntries.length} groups`
                            : `${currentProgramme.assignments.length} chests`}
                          {" · "}
                          <span className="text-primary/80">
                            Grade & rank auto
                          </span>
                        </p>
                      </div>
                      {/* Unpublish Control if Published */}
                      {currentProgramme.stats?.status === "published" ||
                      currentProgramme.stats?.status === "partial-published" ? (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-3 sm:ml-auto shrink-0">
                          <div className="flex items-center justify-center text-amber-700 dark:text-amber-400 text-[10px] sm:text-sm font-medium gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-1 bg-amber-100 dark:bg-amber-900/30 rounded-md border border-amber-200 dark:border-amber-700/50">
                            <Lock className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                            <span>Results Locked</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 sm:h-8 gap-1.5 sm:gap-2 text-xs sm:text-sm border-amber-200 dark:border-amber-700/50 hover:bg-amber-100 dark:hover:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                            onClick={() =>
                              handlePublishProgramme(currentProgramme.id, false)
                            }
                            disabled={isReadOnly || isPending}
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            Unpublish to Edit
                          </Button>
                        </div>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="gap-1 font-medium sm:ml-auto w-fit shrink-0 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0"
                        >
                          <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          Auto
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-3 sm:space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 sm:gap-3">
                        {markEntries.map((assignment) => {
                          const teamId = getTeamIdentifier(
                            assignment,
                            currentProgramme.type,
                          );
                          const currentPoints =
                            scores[teamId] ?? assignment.result?.points ?? "";
                          const chestNumber =
                            assignment.student?.chestNumber || "N/A";
                          const studentAndTeamLabel =
                            currentProgramme.type === "GROUP"
                              ? `${assignment.student?.name || "Unknown"}`
                              : null;
                          const groupName =
                            currentProgramme.type === "GROUP" &&
                            assignment.group
                              ? assignment.group.name
                              : null;
                          const displayLabel =
                            currentProgramme.type === "GROUP"
                              ? studentAndTeamLabel || "Group"
                              : `#${chestNumber}`;
                          const isFilled =
                            typeof currentPoints === "number" ||
                            currentPoints !== "";

                          return (
                            <div
                              key={teamId}
                              className={cn(
                                "relative rounded-lg sm:rounded-xl border-2 transition-all duration-200 min-h-[64px] sm:min-h-[72px] flex flex-col justify-center touch-manipulation",
                                isFilled
                                  ? "border-primary/30 bg-primary/5"
                                  : "border-border hover:border-primary/20 bg-card active:bg-muted/30",
                              )}
                            >
                              <div className="p-2 sm:p-3 space-y-1 sm:space-y-2">
                                {currentProgramme.type === "GROUP" ? (
                                  <div className="space-y-0.5 sm:space-y-1">
                                    {groupName && (
                                      <p className="text-[9px] sm:text-[10px] text-muted-foreground text-start font-medium truncate">
                                        {groupName}
                                      </p>
                                    )}
                                    <div className="flex justify-start">
                                      <Badge
                                        variant="outline"
                                        className="font-medium text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 sm:py-1 bg-primary/10 border-primary/30 text-center truncate max-w-full"
                                      >
                                        <span className="truncate">
                                          {displayLabel}
                                        </span>
                                        <span className="text-muted-foreground shrink-0">
                                          {" "}
                                          +
                                        </span>
                                        <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 ml-0.5 shrink-0 inline" />
                                      </Badge>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex justify-center">
                                    <Badge className="font-semibold text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1.5 bg-primary text-primary-foreground">
                                      {displayLabel}
                                    </Badge>
                                  </div>
                                )}

                                <div className="relative">
                                  <Input
                                    id={`score-${teamId}`}
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max="10"
                                    placeholder={
                                      isReadOnly ||
                                      currentProgramme.stats?.status ===
                                        "published" ||
                                      currentProgramme.stats?.status ===
                                        "partial-published"
                                        ? "Locked"
                                        : "Pts"
                                    }
                                    value={currentPoints}
                                    disabled={
                                      currentProgramme.stats?.status ===
                                        "published" ||
                                      currentProgramme.stats?.status ===
                                        "partial-published"
                                    }
                                    onChange={(e) =>
                                      handleScoreChange(teamId, e.target.value)
                                    }
                                    className={cn(
                                      "text-center font-mono font-semibold h-9 sm:h-10 text-sm sm:text-base transition-all touch-manipulation min-h-[36px]",
                                      isFilled && "ring-2 ring-primary/20",
                                      (currentProgramme.stats?.status ===
                                        "published" ||
                                        currentProgramme.stats?.status ===
                                          "partial-published") &&
                                        "bg-muted/50 text-muted-foreground cursor-not-allowed",
                                    )}
                                    suppressHydrationWarning
                                  />
                                  {(currentProgramme.stats?.status ===
                                    "published" ||
                                    currentProgramme.stats?.status ===
                                      "partial-published") && (
                                    <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-muted-foreground/50 absolute top-1/2 -translate-y-1/2 right-2" />
                                  )}
                                </div>
                              </div>

                              {isFilled && (
                                <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2">
                                  <Check className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {hasAnyPoints && (
                      <div className="space-y-3 sm:space-y-4 pt-2 border-t mt-3 sm:mt-4">
                        <Accordion
                          type="single"
                          collapsible
                          className="w-full border rounded-lg bg-muted/20"
                        >
                          <AccordionItem value="preview" className="border-0">
                            <AccordionTrigger className="px-2.5 sm:px-4 py-2 sm:py-3 hover:no-underline hover:bg-muted/30 rounded-t-lg data-[state=open]:rounded-b-none text-left">
                              <span className="flex items-center gap-1.5 sm:gap-2 font-medium text-xs sm:text-sm">
                                <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
                                Preview judgment
                              </span>
                              <Badge
                                variant="secondary"
                                className="text-[10px] sm:text-xs font-normal shrink-0"
                              >
                                {groupedPreviewResults.length}
                              </Badge>
                            </AccordionTrigger>
                            <AccordionContent className="px-0 pb-0 pt-0">
                              {/* Mobile: compact cards */}
                              <div className="md:hidden border-t divide-y max-h-40 overflow-y-auto">
                                {groupedPreviewResults.map((result, index) => (
                                  <div
                                    key={result.teamId}
                                    className={cn(
                                      "flex items-center justify-between gap-2 p-2 sm:p-3",
                                      index < 3 && "bg-primary/5",
                                    )}
                                  >
                                    <div className="min-w-0 flex-1 flex items-center gap-2">
                                      {currentProgramme.type === "GROUP" ? (
                                        <Badge
                                          variant="outline"
                                          className="font-semibold text-xs shrink-0"
                                        >
                                          <Users className="w-3 h-3 mr-1" />
                                          <span className="truncate">
                                            {result.displayName}
                                          </span>
                                        </Badge>
                                      ) : (
                                        <Badge className="font-semibold bg-primary text-xs">
                                          #{result.chestNumber}
                                        </Badge>
                                      )}
                                      <span className="font-mono font-semibold text-primary text-sm">
                                        {result.points}
                                      </span>
                                      <Badge
                                        className={cn(
                                          getGradeBadgeColor(result.grade),
                                          "font-semibold text-xs",
                                        )}
                                      >
                                        {result.grade}
                                      </Badge>
                                      <Badge
                                        variant={
                                          index < 3 ? "default" : "outline"
                                        }
                                        className={cn(
                                          "font-mono font-semibold text-xs shrink-0",
                                          index === 0 &&
                                            "bg-yellow-500 text-yellow-950",
                                          index === 1 &&
                                            "bg-gray-400 text-gray-950",
                                          index === 2 &&
                                            "bg-orange-600 text-orange-950",
                                        )}
                                      >
                                        #{result.position}
                                      </Badge>
                                    </div>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10"
                                      onClick={() =>
                                        handleDeleteResult(
                                          result.allResultIds,
                                          result.teamId,
                                        )
                                      }
                                      disabled={
                                        isReadOnly ||
                                        isPending ||
                                        currentProgramme.stats?.status ===
                                          "published" ||
                                        currentProgramme.stats?.status ===
                                          "partial-published"
                                      }
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                              {/* Desktop: table */}
                              <div className="hidden md:block border-t overflow-x-auto overflow-y-auto max-h-56">
                                <Table className="min-w-[320px]">
                                  <TableHeader>
                                    <TableRow className="bg-muted/50">
                                      <TableHead className="font-semibold">
                                        {currentProgramme.type === "GROUP"
                                          ? "Team"
                                          : "Chest"}
                                      </TableHead>
                                      <TableHead className="text-center font-semibold">
                                        Points
                                      </TableHead>
                                      <TableHead className="text-center font-semibold">
                                        Grade
                                      </TableHead>
                                      <TableHead className="text-center font-semibold">
                                        Rank
                                      </TableHead>
                                      <TableHead className="w-12"></TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {groupedPreviewResults.map(
                                      (result, index) => (
                                        <TableRow
                                          key={result.teamId}
                                          className={cn(
                                            "transition-colors",
                                            index < 3 && "bg-primary/5",
                                          )}
                                        >
                                          <TableCell>
                                            {currentProgramme.type ===
                                            "GROUP" ? (
                                              <Badge
                                                variant="outline"
                                                className="font-semibold"
                                              >
                                                <Users className="w-3 h-3 mr-1" />
                                                {result.displayName}
                                              </Badge>
                                            ) : (
                                              <Badge className="font-semibold bg-primary">
                                                #{result.chestNumber}
                                              </Badge>
                                            )}
                                          </TableCell>
                                          <TableCell className="text-center">
                                            <span className="font-mono font-semibold text-primary">
                                              {result.points}
                                            </span>
                                          </TableCell>
                                          <TableCell className="text-center">
                                            <Badge
                                              className={cn(
                                                getGradeBadgeColor(
                                                  result.grade,
                                                ),
                                                "font-semibold",
                                              )}
                                            >
                                              {result.grade}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="text-center">
                                            <Badge
                                              variant={
                                                index < 3
                                                  ? "default"
                                                  : "outline"
                                              }
                                              className={cn(
                                                "font-mono font-semibold",
                                                index === 0 &&
                                                  "bg-yellow-500 text-yellow-950",
                                                index === 1 &&
                                                  "bg-gray-400 text-gray-950",
                                                index === 2 &&
                                                  "bg-orange-600 text-orange-950",
                                              )}
                                            >
                                              #{result.position}
                                            </Badge>
                                          </TableCell>
                                          <TableCell>
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                              onClick={() =>
                                                handleDeleteResult(
                                                  result.allResultIds,
                                                  result.teamId,
                                                )
                                              }
                                              disabled={
                                                isReadOnly ||
                                                isPending ||
                                                currentProgramme.stats
                                                  ?.status === "published" ||
                                                currentProgramme.stats
                                                  ?.status ===
                                                  "partial-published"
                                              }
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      ),
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>

                        <Button
                          onClick={() => handleSaveResults(false)}
                          disabled={
                            isReadOnly ||
                            isPending ||
                            currentProgramme.stats?.status === "published"
                          }
                          className="w-full h-10 sm:h-12 text-xs sm:text-base font-semibold gap-2 touch-manipulation"
                          size="lg"
                        >
                          {currentProgramme.stats?.status === "published" ? (
                            <span className="flex items-center gap-2">
                              <Lock className="w-4 h-4" />
                              Locked (Unpublish to edit)
                            </span>
                          ) : isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Saving…
                            </>
                          ) : (
                            "Save changes"
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filter bar – highlighted, distinct from judgment cards (same as Results page) */}
      <div className="rounded-xl border-2 border-primary/20 bg-primary/5 shadow-sm">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/10 bg-primary/10">
          <Filter className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-semibold text-foreground">Filters</span>
          <span className="text-xs text-muted-foreground ml-1">
            ({filteredTableProgrammes.length} programme
            {filteredTableProgrammes.length !== 1 ? "s" : ""})
          </span>
        </div>
        <div className="p-3 sm:p-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          {/* Summary stats: wrap on mobile */}
          <div className="flex flex-wrap items-center justify-between md:justify-start gap-2 ">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 text-xs font-medium">
              Ready: {summaryStats.ready}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium">
              <CheckCircle2 className="w-3 h-3" />
              Published: {summaryStats.published}
            </span>
            {summaryStats.pending > 0 && (
              <Dialog>
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-medium overflow-hidden">
                  <span className="pl-2.5 pr-1.5 py-1 flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3" />
                    Pending: {pendingProgrammes.length}
                  </span>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center justify-center pr-2.5 py-1 h-full hover:bg-orange-200 dark:hover:bg-orange-800/50 transition-colors"
                      aria-label="View pending programmes"
                    >
                      <Eye className="w-3 h-3" />
                    </button>
                  </DialogTrigger>
                </span>
                <DialogContent className="w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                      Pending Programmes
                    </DialogTitle>
                    <DialogDescription>
                      These programmes have assignments but are missing scores
                      for some or all students.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="max-h-[60vh] overflow-y-auto space-y-2 mt-4 pr-2">
                    {pendingProgrammes.map((prog) => (
                      <div
                        key={prog.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors gap-3"
                      >
                        <div>
                          <p className="font-medium text-sm">{prog.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {prog.category.name}
                          </p>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                          <div className="flex flex-col items-end">
                            <span
                              className={cn(
                                "text-xs font-mono font-medium",
                                prog.stats.enteredScores > 0
                                  ? "text-orange-600"
                                  : "text-muted-foreground",
                              )}
                            >
                              {prog.stats.enteredScores}/
                              {prog.stats.totalParticipants}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                              Scored
                            </span>
                          </div>
                          <Button
                            size="sm"
                            disabled={canUseExternalJudging || isReadOnly}
                            onClick={() => {
                              if (canUseExternalJudging) return;
                              handleEditResult(prog);
                              document.dispatchEvent(
                                new KeyboardEvent("keydown", {
                                  key: "Escape",
                                }),
                              );
                            }}
                          >
                            Edit results
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
          {/* Filter row: flex-col on mobile, full width controls */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
            <div className="relative w-full sm:w-48 order-first">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search programme or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-sm w-full"
                suppressHydrationWarning
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-9 w-full sm:w-[140px] text-sm">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9 w-full sm:w-[120px] text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="in-progress">Partial</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filterProgrammeType}
              onValueChange={setFilterProgrammeType}
            >
              <SelectTrigger className="h-9 w-full sm:w-[110px] text-sm">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                <SelectItem value="GROUP">Team</SelectItem>
              </SelectContent>
            </Select>
            {hasTableFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-9 w-full sm:w-9 shrink-0"
                title="Clear filters"
              >
                <X className="w-3.5 h-3.5 sm:mr-0" />
                <span className="sm:hidden">Clear filters</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {filteredTableProgrammes.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTableProgrammes.map((prog) => {
            const isPublished =
              prog.stats.status === "published" ||
              prog.stats.status === "partial-published";
            const openJudgeSession = prog.programme_judge_session?.[0] ?? null;
            const startedAtForTimer =
              judgeLinksByProgrammeId[prog.id]?.startedAt ??
              openJudgeSession?.started_at;
            const elapsedSeconds =
              startedAtForTimer != null && nowMs != null
                ? Math.max(
                    0,
                    Math.floor(
                      (nowMs - new Date(startedAtForTimer).getTime()) / 1000,
                    ),
                  )
                : null;

            return (
              <Card
                key={prog.id}
                className={cn(
                  "overflow-hidden rounded-xl border border-border/80 transition-all hover:border-primary/25 hover:shadow-md active:scale-[0.99]",
                  viewProgramme?.id === prog.id &&
                    "ring-2 ring-primary border-primary/50 shadow-md",
                )}
              >
                {/* Compact category strip */}
                <div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/30 border-b border-border/50">
                  <span className="text-xs font-medium text-muted-foreground truncate">
                    {prog.category.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant={isPublished ? "outline" : "default"}
                      className="h-7 text-[11px] px-2.5"
                      onClick={() =>
                        handlePublishProgramme(prog.id, !isPublished)
                      }
                      disabled={
                        isReadOnly ||
                        isPending ||
                        (!isPublished && prog.stats.enteredScores === 0)
                      }
                    >
                      {publishingProgrammeId === prog.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : isPublished ? (
                        "Unpublish"
                      ) : (
                        "Publish"
                      )}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
                          aria-label="Actions"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => setViewProgramme(prog)}
                          className="gap-2 cursor-pointer"
                        >
                          <Eye className="h-4 w-4" />
                          View details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleEditResult(prog)}
                          disabled={isReadOnly || canUseExternalJudging}
                          className="gap-2 cursor-pointer"
                        >
                          <Pencil className="h-4 w-4" />
                          Add results
                        </DropdownMenuItem>
                        {canUseExternalJudging &&
                        !isReadOnly &&
                        prog.status === "STARTED" ? (
                          <DropdownMenuItem
                            onClick={() => handleCreateJudgeLink(prog.id)}
                            disabled={creatingJudgeLinkProgrammeId === prog.id}
                            className="gap-2 cursor-pointer"
                          >
                            {creatingJudgeLinkProgrammeId === prog.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Sparkles className="h-4 w-4" />
                            )}
                            {openJudgeSession
                              ? "Recreate judge link"
                              : "Create judge link"}
                          </DropdownMenuItem>
                        ) : null}

                        {judgeLinksByProgrammeId[prog.id]?.judgeUrl ? (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleCopyJudgeLink(prog.id)}
                              className="gap-2 cursor-pointer"
                            >
                              Copy judge link
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleShareJudgeLinkWhatsApp(prog.id)
                              }
                              className="gap-2 cursor-pointer"
                            >
                              Share on WhatsApp
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-base leading-snug flex items-center gap-1.5 line-clamp-2 text-foreground mb-2">
                    {prog.name}
                    {prog.type === "GROUP" && (
                      <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </h3>
                  <div className="flex items-center justify-between gap-2">
                    {prog.stats.status === "published" ? (
                      <Badge className="bg-emerald-600 dark:bg-emerald-700 text-white text-xs font-medium">
                        Published
                      </Badge>
                    ) : prog.stats.status === "partial-published" ? (
                      <Badge className="bg-amber-500 dark:bg-amber-600 text-white text-xs font-medium">
                        Partial
                      </Badge>
                    ) : prog.stats.status === "ready" ? (
                      <Badge className="bg-sky-600 dark:bg-sky-700 text-white text-xs font-medium">
                        Ready
                      </Badge>
                    ) : prog.stats.status === "in-progress" ? (
                      <Badge className="bg-orange-500 dark:bg-orange-600 text-white text-xs font-medium">
                        In progress
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="text-xs font-medium text-muted-foreground"
                      >
                        Not started
                      </Badge>
                    )}
                  </div>
                  {canUseExternalJudging &&
                  prog.status === "STARTED" &&
                  openJudgeSession ? (
                    <div className="mt-2">
                      <Badge
                        variant="outline"
                        className="w-full justify-start gap-2 border-primary/30 bg-primary/5 text-primary"
                      >
                        <span className="font-mono text-xs">
                          External judging:{" "}
                          {elapsedSeconds != null
                            ? formatCountdownHms(elapsedSeconds)
                            : "00:00:00"}
                        </span>
                      </Badge>
                    </div>
                  ) : null}
                  {prog.status === "ENDED" ? (
                    <div className="mt-2">
                      <Badge
                        variant="secondary"
                        className="w-full justify-start gap-2"
                      >
                        Judging completed (awaiting admin publish)
                      </Badge>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Award className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-3" />
            <h3 className="text-sm font-semibold">No Programmes Found</h3>
          </CardContent>
        </Card>
      )}

      {/* View details modal – responsive, mobile cards + desktop table */}
      <Dialog
        open={!!viewProgramme}
        onOpenChange={(open) => !open && setViewProgramme(null)}
      >
        <DialogContent className="w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] max-w-4xl max-h-[90dvh] sm:max-h-[85vh] overflow-y-auto p-3 sm:p-6 rounded-lg sm:rounded-xl text-left">
          <DialogHeader className="text-left pr-8 sm:pr-0 space-y-1.5">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-xl truncate">
              <Medal className="w-5 h-5 shrink-0 text-primary" />
              {viewProgramme?.name}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {viewProgramme?.category.name} · {viewProgramme?.type} programme
            </DialogDescription>
          </DialogHeader>
          {viewDetailsRows.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No results for this programme.
            </div>
          ) : (
            <>
              {/* Mobile: result cards */}
              <div className="mt-4 space-y-3 md:hidden">
                {viewDetailsRows.map((row, index) => (
                  <div
                    key={row.assignmentId}
                    className={cn(
                      "rounded-xl border p-3 sm:p-4 bg-card",
                      index < 3 && "border-primary/20 bg-primary/5",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-foreground truncate">
                          {row.displayName}
                        </div>
                        {(row.chestNumber ||
                          row.subText ||
                          row.codeLetter !== "-") && (
                          <div className="text-xs text-muted-foreground truncate">
                            {row.codeLetter !== "-"
                              ? `Code ${row.codeLetter} · `
                              : ""}
                            {row.chestNumber} {row.subText}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {row.position != null && row.position > 0 && (
                          <span
                            className={cn(
                              "text-lg font-bold tabular-nums",
                              row.position === 1 && "text-yellow-600",
                              row.position === 2 && "text-gray-500",
                              row.position === 3 && "text-amber-700",
                            )}
                          >
                            #{row.position}
                          </span>
                        )}
                        <Badge
                          className={cn(
                            "font-mono font-semibold",
                            getGradeBadgeColor(row.grade ?? ""),
                          )}
                        >
                          {row.grade}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge
                        variant="secondary"
                        className="font-mono font-semibold"
                      >
                        {row.points} pts
                      </Badge>
                      {row.remarks && (
                        <span className="text-muted-foreground text-xs line-clamp-2">
                          {row.remarks}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop: table */}
              <div className="mt-4 hidden md:block overflow-x-auto -mx-2 px-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead>
                        {viewProgramme?.type === "GROUP"
                          ? "Team"
                          : "Chest & Name"}
                      </TableHead>
                      <TableHead className="text-center">Code</TableHead>
                      <TableHead className="text-center">Grade</TableHead>
                      <TableHead className="text-center">Points</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewDetailsRows.map((row) => (
                      <TableRow key={row.assignmentId}>
                        <TableCell className="font-semibold">
                          {row.position != null && row.position > 0 ? (
                            <div className="flex items-center gap-1">
                              {row.position === 1 && (
                                <span className="text-yellow-500">🥇</span>
                              )}
                              {row.position === 2 && (
                                <span className="text-gray-400">🥈</span>
                              )}
                              {row.position === 3 && (
                                <span className="text-amber-700">🥉</span>
                              )}
                              <span>{row.position}</span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{row.displayName}</div>
                          {(row.chestNumber ||
                            row.subText ||
                            row.codeLetter !== "-") && (
                            <div className="text-xs text-muted-foreground">
                              {row.chestNumber} {row.subText}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-mono">
                            {row.codeLetter}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-mono font-semibold",
                              getGradeBadgeColor(row.grade ?? ""),
                            )}
                          >
                            {row.grade}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="secondary"
                            className="font-mono font-semibold"
                          >
                            {row.points} pts
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {row.remarks || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
