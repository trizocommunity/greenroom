"use client";

import { useState, useTransition, useMemo } from "react";
import {
  Plus,
  Eye,
  EyeOff,
  Check,
  Sparkles,
  Award,
  Filter,
  Search,
  X,
  Pencil,
  Trash2,
  Users,
  Lock,
  Unlock,
  HelpCircle,
  Medal,
  Trophy,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  saveResult,
  deleteResult,
  bulkPublishProgrammeResults,
} from "@/server/actions/results";
import {
  calculateGrade,
  calculatePosition,
  calculatePoints,
  calculatePositionPoints,
  getGradeBadgeColor,
} from "@/lib/results-calculator";
import { cn } from "@/lib/utils";

type Programme = {
  id: string;
  name: string;
  type: "INDIVIDUAL" | "GROUP";
  category: { id: string; name: string };
  assignments: Array<{
    id: string;
    teamNumber: number;
    student: { id: string; name: string; chestNumber: string | null } | null;
    group: { id: string; name: string } | null;
    result: {
      id: string;
      grade: string | null;
      position: number | null;
      score: number;
      points: number;
      remarks: string | null;
      isPublished: boolean;
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
  scoringSystem?: "POSITION_BASED" | "SCORE_BASED";
};

interface ResultsManagementClientProps {
  festival: Festival;
  programmes: Programme[];
  categories: Category[];
  existingResults: Array<{
    id: string;
    grade: string | null;
    position: number | null;
    score: number;
    points: number;
    remarks: string | null;
    isPublished: boolean;
    assignmentId: string;
  }>;
}

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
}: ResultsManagementClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedProgramme, setSelectedProgramme] = useState<string>("");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [isPending, startTransition] = useTransition();

  // View Details Modal State - REMOVED

  // Filter states for main table
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Compute Programme Stats and Status
  const programmeStats = useMemo(() => {
    return programmes
      .map((prog) => {
        // Base counts (Students)
        const totalParticipants = prog.assignments.length;
        const enteredScores = prog.assignments.filter(
          (a) => a.result?.score != null,
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
            if (a.result?.score != null) scoredTeams.add(teamId);
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

  // Filter programmes by selected category in modal
  const filteredModalProgrammes = selectedCategory
    ? programmeStats.filter((p) => p.category.id === selectedCategory)
    : [];

  const currentProgramme = programmeStats.find(
    (p) => p.id === selectedProgramme,
  );

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

    return result;
  }, [programmeStats, searchQuery, filterCategory, filterStatus]);

  // Modal Calculation Logic
  const calculateResults = () => {
    if (!currentProgramme) return [];

    // Map to store scores by Team Identifier
    const teamScoresMap = new Map<string, number>();

    // First pass: Collect all valid scores (from Input or DB)
    currentProgramme.assignments.forEach((assignment) => {
      const teamId = getTeamIdentifier(assignment, currentProgramme.type);

      const inputScore = scores[teamId]; // "scores" state holds judge scores
      const dbScore = assignment.result?.score; // Use score from DB

      // Use input first, then DB score.
      const finalScore =
        inputScore !== undefined
          ? inputScore
          : assignment.result
            ? dbScore
            : undefined;

      if (finalScore !== undefined && finalScore !== null && finalScore >= 0) {
        teamScoresMap.set(teamId, finalScore);
      }
    });

    const validScores = Array.from(teamScoresMap.values());

    return currentProgramme.assignments.map((assignment) => {
      const teamId = getTeamIdentifier(assignment, currentProgramme.type);
      const score = teamScoresMap.get(teamId) ?? null;

      if (score === null || score < 0) {
        return {
          assignmentId: assignment.id,
          teamId,
          chestNumber: assignment.student?.chestNumber || "N/A",
          studentName: assignment.student?.name || "Unknown",
          displayName: getTeamName(assignment, currentProgramme.type),
          grade: "-",
          position: "-",
          score: 0,
          points: 0,
          remarks: "-",
          hasExisting: !!assignment.result,
          resultId: assignment.result?.id,
        };
      }

      // Calculate Grade based on Score (10/10 basis)
      const gradeData = calculateGrade(score);
      // Calculate Position based on Score comparison
      const position = calculatePosition(score, validScores);
      // Calculate Leaderboard Points based on Position
      // Calculate Leaderboard Points based on Position
      const leaderboardPoints = calculatePoints(
        festival.scoringSystem || "POSITION_BASED",
        score,
        position,
      );

      return {
        assignmentId: assignment.id,
        teamId,
        chestNumber: assignment.student?.chestNumber || "N/A",
        studentName: assignment.student?.name || "Unknown",
        displayName: getTeamName(assignment, currentProgramme.type),
        grade: gradeData.grade,
        position,
        score: score, // Judge score
        points: leaderboardPoints, // Leaderboard points
        remarks: gradeData.remarks,
        hasExisting: !!assignment.result,
        resultId: assignment.result?.id,
      };
    });
  };

  const results = calculateResults();
  const hasAnyScore = results.some((r) => r.score !== null && r.score > 0);

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
    if (!currentProgramme) return;

    const resultsToSave = results.filter((r) => r.score !== null);
    if (resultsToSave.length === 0) return;

    startTransition(async () => {
      let successCount = 0;
      let errorCount = 0;

      for (const result of resultsToSave) {
        const response = await saveResult({
          festivalId: festival.id,
          programmeId: currentProgramme.id,
          assignmentId: result.assignmentId,
          grade: result.grade,
          position:
            result.position !== "-" ? (result.position as number) : null,
          score: result.score,
          points: result.points,
          remarks: result.remarks,
          isPublished: shouldPublish,
        });

        if (response?.success) successCount++;
        else errorCount++;
      }

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
    startTransition(async () => {
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
      } else {
        toast.error("Failed to update status");
      }
    });
  };

  const handleDeleteResult = async (
    resultIds: string[],
    identifier: string,
  ) => {
    startTransition(async () => {
      setScores((prev) => {
        const newScores = { ...prev };
        delete newScores[identifier];
        return newScores;
      });

      let successAll = true;
      for (const id of resultIds) {
        if (!id) continue;
        const response = await deleteResult(id, festival.slug);
        if (!response?.success) successAll = false;
      }

      if (successAll) toast.success("Result deleted successfully");
      else toast.error("Failed to delete some results");
    });
  };

  const handleEditResult = (programme: (typeof programmeStats)[0]) => {
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
  };

  // Group assignments for UI Rendering (Inputs) with Section Support
  const groupedInputs = useMemo(() => {
    if (!currentProgramme) return {};

    // Structure: { "Group Name": [AssignmentRepresentative1, AssignmentRepresentative2] }
    const groups: Record<string, Programme["assignments"][0][]> = {};
    const uniqueTeams = new Set<string>();

    currentProgramme.assignments.forEach((a) => {
      const teamId = getTeamIdentifier(a, currentProgramme.type);
      if (!uniqueTeams.has(teamId)) {
        uniqueTeams.add(teamId);

        // Determine Section Key
        const groupName =
          currentProgramme.type === "GROUP" && a.group
            ? a.group.name
            : "All Participants";

        if (!groups[groupName]) {
          groups[groupName] = [];
        }
        groups[groupName].push(a);
      }
    });

    return groups;
  }, [currentProgramme]);

  // Group results for UI Rendering (Preview Table)
  const groupedPreviewResults = useMemo(() => {
    if (!results.length || !currentProgramme) return [];

    const uniqueResultMap = new Map<
      string,
      (typeof results)[0] & { allResultIds: string[] }
    >();

    results
      .filter((r) => r.score !== null)
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
      (a, b) => (b.score as number) - (a.score as number),
    );
  }, [results, currentProgramme]);

  return (
    <div className="space-y-6">
      {/* Header and Filters (Unchanged mostly) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Results Overview
              </CardTitle>
              <CardDescription className="flex items-center gap-4 mt-2">
                <span>Total Programmes: {programmeStats.length}</span>
                <span className="text-green-600">
                  Published:{" "}
                  {
                    programmeStats.filter((p) => p.stats.status === "published")
                      .length
                  }
                </span>
                <span className="text-blue-600">
                  Ready:{" "}
                  {
                    programmeStats.filter((p) => p.stats.status === "ready")
                      .length
                  }
                </span>
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <HelpCircle className="w-4 h-4" />
                    How it Works
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl">
                  <DialogHeader>
                    <DialogTitle>How Results work?</DialogTitle>
                    <DialogDescription>
                      Simple guide to scoring and points.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <h4 className="font-bold text-sm flex items-center gap-2">
                        <Medal className="w-4 h-4 text-yellow-500" /> Scoring
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Judges give a score out of 10. This score decides the
                        Grade (like A, B, C).
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-bold text-sm flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-orange-500" /> Points
                        for Groups
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Winners earn points for their group. More points mean a
                        better chance at winning the championship.
                      </p>
                      {festival.scoringSystem === "SCORE_BASED" ? (
                        <p className="text-sm font-medium mt-2">
                          Points are equal to the judge's score.
                          <br />
                          <span className="text-muted-foreground font-normal">
                            Example: Score 9.5 = 9.5 Points.
                          </span>
                        </p>
                      ) : (
                        <ul className="list-disc list-inside text-sm text-muted-foreground ml-2">
                          <li>
                            <span className="font-bold text-foreground">
                              1st Place:
                            </span>{" "}
                            10 Points
                          </li>
                          <li>
                            <span className="font-bold text-foreground">
                              2nd Place:
                            </span>{" "}
                            7 Points
                          </li>
                          <li>
                            <span className="font-bold text-foreground">
                              3rd Place:
                            </span>{" "}
                            5 Points
                          </li>
                        </ul>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-bold text-sm flex items-center gap-2">
                        <Crown className="w-4 h-4 text-primary" /> Championship
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        The group with the most points at the end of the
                        festival wins the Championship Trophy.
                      </p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2" suppressHydrationWarning>
                    <Plus className="w-4 h-4" />
                    Enter Results
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-blue-600" />
                      Enter Programme Results
                    </DialogTitle>
                    <DialogDescription>
                      Select a programme and enter scores. Grades and positions
                      will be calculated automatically.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-5 mt-4">
                    {/* Programme Selection - Compact */}
                    <div className="grid md:grid-cols-2 gap-3">
                      {/* ... (Selectors remain same) ... */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="modal-category"
                          className="text-xs font-medium"
                        >
                          Category
                        </Label>
                        <Select
                          value={selectedCategory}
                          onValueChange={handleCategoryChange}
                          disabled={selectedProgramme !== "" && hasAnyScore}
                        >
                          <SelectTrigger id="modal-category" className="h-9">
                            <SelectValue placeholder="Select category..." />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
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
                          <SelectTrigger id="modal-programme" className="h-9">
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

                    {/* Score Entry Section */}
                    {currentProgramme && (
                      <div className="space-y-4">
                        {/* Compact Programme Info with Progress */}
                        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/5 to-primary/0 rounded-lg border border-primary/10">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-base">
                                {currentProgramme.name}
                              </h3>
                              {currentProgramme.type === "GROUP" && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] h-5 border-primary/30"
                                >
                                  <Users className="w-3 h-3 mr-1" />
                                  Group
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <span className="font-medium text-primary">
                                  {Object.keys(scores).length}
                                </span>
                                <span>/</span>
                                <span>
                                  {Object.values(groupedInputs).flat().length}
                                </span>
                                <span>scored</span>
                              </span>
                              <span className="w-px h-3 bg-border" />
                              <span>
                                {currentProgramme.assignments.length}{" "}
                                participants
                              </span>
                            </div>
                          </div>
                          {/* Unpublish Control if Published */}
                          {currentProgramme.stats?.status === "published" ||
                          currentProgramme.stats?.status ===
                            "partial-published" ? (
                            <div className="flex items-center gap-3 ml-auto">
                              <div className="flex items-center text-amber-700 dark:text-amber-400 text-sm font-medium gap-2 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-md border border-amber-200 dark:border-amber-700/50">
                                <Lock className="w-4 h-4" />
                                <span>Results Locked</span>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-2 border-amber-200 dark:border-amber-700/50 hover:bg-amber-100 dark:hover:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                                onClick={() =>
                                  handlePublishProgramme(
                                    currentProgramme.id,
                                    false,
                                  )
                                }
                                disabled={isPending}
                              >
                                <Unlock className="w-3.5 h-3.5" />
                                Unpublish to Edit
                              </Button>
                            </div>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="gap-1.5 font-medium ml-auto"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              Auto
                            </Badge>
                          )}
                        </div>

                        {/* Grouped Score Input Grid - More Compact & Highlighted */}
                        <div className="space-y-5">
                          {Object.entries(groupedInputs).map(
                            ([groupName, assignments]) => (
                              <div key={groupName} className="space-y-2.5">
                                {groupName !== "All Participants" && (
                                  <div className="flex items-center gap-2 pb-1.5 border-b">
                                    <h4 className="font-bold text-sm">
                                      {groupName}
                                    </h4>
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] h-4 px-1.5"
                                    >
                                      {assignments.length}{" "}
                                      {assignments.length === 1
                                        ? "Team"
                                        : "Teams"}
                                    </Badge>
                                  </div>
                                )}
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                                  {assignments.map((assignment) => {
                                    const teamId = getTeamIdentifier(
                                      assignment,
                                      currentProgramme.type,
                                    );
                                    const subLabel = getSubLabel(
                                      assignment,
                                      currentProgramme.type,
                                    );
                                    const currentScore =
                                      scores[teamId] ??
                                      assignment.result?.score ??
                                      "";
                                    const displayName =
                                      currentProgramme.type === "GROUP"
                                        ? `Team ${assignment.teamNumber || 1}`
                                        : assignment.student?.chestNumber ||
                                          "N/A";
                                    const isFilled =
                                      typeof currentScore === "number" ||
                                      currentScore !== "";

                                    const teamMembers =
                                      currentProgramme?.type === "GROUP"
                                        ? currentProgramme.assignments
                                            .filter(
                                              (a) =>
                                                getTeamIdentifier(
                                                  a,
                                                  "GROUP",
                                                ) === teamId,
                                            )
                                            .map((a) => a.student?.name)
                                            .filter(Boolean)
                                            .join(", ")
                                        : assignment.student?.name || "";

                                    return (
                                      <div
                                        key={teamId}
                                        title={teamMembers}
                                        className={cn(
                                          "relative group rounded-lg border-2 transition-all duration-200 cursor-help",
                                          isFilled
                                            ? "border-primary/30 bg-primary/5"
                                            : "border-border hover:border-primary/20 bg-card",
                                        )}
                                      >
                                        {/* Highlighted Chest Number/Team Badge */}
                                        <div className="p-2 pb-1.5">
                                          {currentProgramme.type === "GROUP" ? (
                                            <div className="flex items-center justify-center mb-1.5">
                                              <Badge
                                                variant="outline"
                                                className="font-bold text-xs px-2 py-0.5 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30"
                                              >
                                                <Users className="w-3 h-3 mr-1" />
                                                {displayName}
                                              </Badge>
                                            </div>
                                          ) : (
                                            <div className="flex items-center justify-center mb-1.5">
                                              <Badge className="font-bold text-sm px-3 py-1 bg-gradient-to-br from-primary to-primary/80 shadow-sm">
                                                #{displayName}
                                              </Badge>
                                            </div>
                                          )}

                                          {/* Score Input */}
                                          <div className="relative">
                                            <Input
                                              id={`score-${teamId}`}
                                              type="number"
                                              step="0.5" // Allow half points input
                                              min="0"
                                              max="10"
                                              placeholder={
                                                currentProgramme.stats
                                                  ?.status === "published" ||
                                                currentProgramme.stats
                                                  ?.status ===
                                                  "partial-published"
                                                  ? "Locked"
                                                  : "Pts"
                                              }
                                              value={currentScore}
                                              disabled={
                                                currentProgramme.stats
                                                  ?.status === "published" ||
                                                currentProgramme.stats
                                                  ?.status ===
                                                  "partial-published"
                                              }
                                              onChange={(e) =>
                                                handleScoreChange(
                                                  teamId,
                                                  e.target.value,
                                                )
                                              }
                                              className={cn(
                                                "text-center font-mono font-bold h-9 transition-all",
                                                isFilled &&
                                                  "ring-2 ring-primary/20",
                                                (currentProgramme.stats
                                                  ?.status === "published" ||
                                                  currentProgramme.stats
                                                    ?.status ===
                                                    "partial-published") &&
                                                  "bg-muted/50 text-muted-foreground cursor-not-allowed",
                                              )}
                                              suppressHydrationWarning
                                            />
                                            {(currentProgramme.stats?.status ===
                                              "published" ||
                                              currentProgramme.stats?.status ===
                                                "partial-published") && (
                                              <Lock className="w-3 h-3 text-muted-foreground/50 absolute top-3 right-2" />
                                            )}
                                          </div>

                                          {/* Student Name/Sub-label */}
                                          {currentProgramme.type ===
                                            "INDIVIDUAL" &&
                                            assignment.student?.name && (
                                              <p className="text-[10px] text-muted-foreground text-center truncate mt-1 px-1 font-medium">
                                                {assignment.student.name}
                                              </p>
                                            )}
                                          {currentProgramme.type ===
                                            "GROUP" && (
                                            <p className="text-[10px] text-muted-foreground text-center truncate mt-1 px-1">
                                              {/* Show Count of members */}
                                              {
                                                currentProgramme.assignments.filter(
                                                  (a) =>
                                                    getTeamIdentifier(
                                                      a,
                                                      "GROUP",
                                                    ) === teamId,
                                                ).length
                                              }{" "}
                                              Members
                                            </p>
                                          )}
                                        </div>

                                        {/* Filled Indicator */}
                                        {isFilled && (
                                          <div className="absolute top-1 right-1">
                                            <Check className="w-3 h-3 text-primary" />
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ),
                          )}
                        </div>

                        {/* Results Preview */}
                        {hasAnyScore && (
                          <div className="space-y-3 pt-2 border-t mt-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-bold text-sm flex items-center gap-2">
                                <Eye className="w-4 h-4 text-primary" />
                                Preview Results
                              </h4>
                              <Badge variant="secondary" className="text-xs">
                                {groupedPreviewResults.length}{" "}
                                {groupedPreviewResults.length === 1
                                  ? "Entry"
                                  : "Entries"}
                              </Badge>
                            </div>
                            <div className="border rounded-lg overflow-hidden max-h-72 overflow-y-auto bg-muted/20">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted/50">
                                    <TableHead className="font-bold">
                                      {currentProgramme.type === "GROUP"
                                        ? "Team"
                                        : "Chest"}
                                    </TableHead>
                                    <TableHead className="font-bold">
                                      {currentProgramme.type === "GROUP"
                                        ? "Info"
                                        : "Name"}
                                    </TableHead>
                                    <TableHead className="text-center font-bold">
                                      Score
                                    </TableHead>
                                    <TableHead className="text-center font-bold">
                                      Points
                                    </TableHead>
                                    <TableHead className="text-center font-bold">
                                      Grade
                                    </TableHead>
                                    <TableHead className="text-center font-bold">
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
                                          {currentProgramme.type === "GROUP" ? (
                                            <Badge
                                              variant="outline"
                                              className="font-bold"
                                            >
                                              <Users className="w-3 h-3 mr-1" />
                                              {result.displayName}
                                            </Badge>
                                          ) : (
                                            <Badge className="font-bold bg-primary">
                                              #{result.chestNumber}
                                            </Badge>
                                          )}
                                        </TableCell>
                                        <TableCell className="text-sm font-medium">
                                          {currentProgramme.type === "GROUP"
                                            ? "Team Score"
                                            : result.studentName}
                                        </TableCell>
                                        <TableCell className="text-center">
                                          <span className="font-mono font-bold text-base text-primary">
                                            {result.score?.toFixed(1)}
                                          </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                          <Badge variant="secondary">
                                            {result.points} pts
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                          <Badge
                                            className={cn(
                                              getGradeBadgeColor(result.grade),
                                              "font-bold",
                                            )}
                                          >
                                            {result.grade}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                          <Badge
                                            variant={
                                              index < 3 ? "default" : "outline"
                                            }
                                            className={cn(
                                              "font-mono font-bold",
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
                                            className="h-7 w-7 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                            onClick={() =>
                                              handleDeleteResult(
                                                result.allResultIds,
                                                result.teamId,
                                              )
                                            }
                                            disabled={
                                              isPending ||
                                              currentProgramme.stats?.status ===
                                                "published" ||
                                              currentProgramme.stats?.status ===
                                                "partial-published"
                                            }
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    ),
                                  )}
                                </TableBody>
                              </Table>
                            </div>

                            <Button
                              onClick={() => handleSaveResults(false)}
                              disabled={
                                isPending ||
                                currentProgramme.stats?.status === "published"
                              }
                              className="w-full h-11 text-base font-bold"
                              size="lg"
                            >
                              {currentProgramme.stats?.status ===
                              "published" ? (
                                <span className="flex items-center gap-2">
                                  <Lock className="w-4 h-4" />
                                  Results Locked (Unpublish to Save)
                                </span>
                              ) : (
                                "Save Changes"
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
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by programme or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  suppressHydrationWarning
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[180px]" suppressHydrationWarning>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]" suppressHydrationWarning>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="ready">Ready to Publish</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                </SelectContent>
              </Select>

              {(searchQuery ||
                filterCategory !== "all" ||
                filterStatus !== "all") && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearFilters}
                  suppressHydrationWarning
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Programme Results ({filteredTableProgrammes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTableProgrammes.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Programme</TableHead>
                    <TableHead className="text-center">Participants</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right w-16">Edit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTableProgrammes.map((prog) => (
                    <TableRow key={prog.id}>
                      <TableCell>
                        <Badge variant="outline">{prog.category.name}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{prog.name}</div>
                        {prog.type === "GROUP" && (
                          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                            Group
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {prog.stats.enteredScores}/
                        {prog.stats.totalParticipants}
                      </TableCell>
                      <TableCell className="text-center">
                        {prog.stats.status === "published" ? (
                          <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                            Published
                          </Badge>
                        ) : prog.stats.status === "partial-published" ? (
                          <Badge
                            variant="destructive"
                            className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200"
                          >
                            Partial
                          </Badge>
                        ) : prog.stats.status === "ready" ? (
                          <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                            Ready
                          </Badge>
                        ) : prog.stats.status === "in-progress" ? (
                          <Badge
                            variant="secondary"
                            className="text-orange-600"
                          >
                            In Progress
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-muted-foreground"
                          >
                            Not Started
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditResult(prog)}
                            title="Edit Results"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-16">
              <Award className="w-16 h-16 mx-auto text-muted-foreground opacity-20 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No Programmes Found
              </h3>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
