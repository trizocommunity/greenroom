"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Eye,
  KeyRound,
  MoreVertical,
  Play,
  Plus,
  RefreshCcw,
  Search,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { queryKeys } from "@/api/client/_query-keys";
import {
  useCancelJudgement,
  useForceCompleteJudgement,
} from "@/api/client/server-actions";
import { useUnsavedChanges } from "@/components/common/useUnsavedChanges";
import { HowItWorksButton } from "@/components/dashboard/HowItWorksButton";
import { ProgrammeProgressFunnel } from "@/components/dashboard/judgement/ProgrammeProgressFunnel";
import { StagePortalCredentialDialog } from "@/components/festival/stage-assignment/StagePortalCredentialDialog";
import { useDisplayTimezone } from "@/components/providers/user-timezone-provider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
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
import { Separator } from "@/components/ui/separator";
import { formatDateTime, parseInstant } from "@/core/datetime";
import type { ProgrammeJudgementStatus } from "@/core/types/app-enums";
import {
  getJudgementDashboardDataAction,
  restartJudgementAction,
  startJudgementAction,
} from "@/features/judgement/actions/judgement.actions";
import { createJudgeAction } from "@/features/judges/actions/judge.actions";
import { toast } from "@/lib/toast";

type Judge = { id: string; name: string; description?: string | null };
type Programme = {
  id: string;
  name: string;
  status: string;
  programmeType: "INDIVIDUAL" | "GROUP";
  programmeCategory?: string | null;
  reportingDetails?: {
    stageName: string | null;
    scheduleStart: string | null;
    scheduleEnd: string | null;
    reportedCount: number;
    reportedEntries: Array<{
      label: string;
      groupName: string | null;
      categoryName: string | null;
      codeLetter: string | null;
    }>;
    assignedCount: number;
    absentCount: number;
    stageId: string | null;
  } | null;
};
type ActiveConfig = {
  id: string;
  programmeId: string;
  programmeName: string;
  programmeStatus: string;
  programmeCategory?: string | null;
  scoreLimit: number;
  judgingMode: "SINGLE" | "GROUP";
  judges: Array<{ id: string; name: string }>;
  startedAt: string | null;
  startedBy: string | null;
  judgementStatus: ProgrammeJudgementStatus;
};
type JudgedProgrammeCard = {
  configId: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  programmeId: string;
  programmeName: string;
  programmeStatus: string;
  programmeCategory?: string | null;
  scoreLimit: number;
  judgingMode: "SINGLE" | "GROUP";
  requiredCodeLetters: number;
  totalJudgements: number;
  isJudgementComplete: boolean;
  judgementStatus: ProgrammeJudgementStatus;
  completionSummary: string;
  judgeProgress: Array<{
    judgeId: string;
    judgeName: string;
    scoredCount: number;
    requiredCount: number;
    isComplete: boolean;
  }>;
  pendingJudgeNames: string[];
  judges: Array<{
    id: string;
    name: string;
    firstScoredAt: string | null;
    submittedAt: string | null;
  }>;
  codeLetterRows: Array<{
    codeLetterId: string;
    code: string;
    average: number;
    grade: string | null;
    awardPoints: number | null;
    isAbsent: boolean;
    judgeScores: Record<string, number>;
  }>;
};

/** Snapshot shape for React Query; server actions infer narrower DB enums that clash with `initialData`. */
type JudgementDashboardQueryData = {
  judgeProgrammes: Programme[];
  rejudgeProgrammes: Programme[];
  judges: Judge[];
  activeConfigs: ActiveConfig[];
  judgedProgrammes: JudgedProgrammeCard[];
  judgesByStageId: Record<string, string[]>;
};

function resetWizardForm() {
  return {
    selectedJudgeIds: [] as string[],
    judgingMode: "GROUP" as "SINGLE" | "GROUP",
  };
}

export function JudgementWizardClient({
  festivalId,
  initialDashboardData,
  stages = [],
  initialStageId = null,
  hideStageFilter = false,
}: {
  festivalId: string;
  initialDashboardData: JudgementDashboardQueryData;
  stages?: Array<{ id: string; name: string }>;
  initialStageId?: string | null;
  hideStageFilter?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const displayTz = useDisplayTimezone();
  const formatCardDateTime = useCallback(
    (value: string | Date) =>
      formatDateTime(value, {
        tz: displayTz,
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [displayTz],
  );
  const toEpoch = useCallback((value: string | Date) => {
    return parseInstant(value)?.getTime() ?? 0;
  }, []);

  const autoLockedStageId =
    hideStageFilter && stages.length === 1 ? stages[0]!.id : null;
  const [selectedStageId, setSelectedStageId] = useState<string>(
    autoLockedStageId ?? initialStageId ?? "",
  );
  const effectiveStageId = autoLockedStageId ?? selectedStageId;
  const showStageDropdown = !hideStageFilter && stages.length > 1;

  const judgementStatusLabel = (status: ProgrammeJudgementStatus) => {
    switch (status) {
      case "COMPLETED":
        return "Completed";
      case "AWAITING_JUDGES":
        return "Awaiting judges";
      case "SCORING_IN_PROGRESS":
        return "Scoring in progress";
      case "LIVE":
        return "Live";
      default:
        return "Not started";
    }
  };

  const dirtySourceId = `judgement-wizard:${festivalId}`;
  const { registerDirtySource, unregisterDirtySource, setDirty } =
    useUnsavedChanges();
  const POLICY_SCORE_LIMIT = 100;
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const [dialogOpen, setDialogOpen] = useState(false);

  const { mutate: cancelJudgement, isPending: isCancelling } =
    useCancelJudgement();
  const { mutate: completeJudgement, isPending: isCompleting } =
    useForceCompleteJudgement();
  const [cancelProgrammeId, setCancelProgrammeId] = useState<string | null>(
    null,
  );

  const [reportedParticipantsView, setReportedParticipantsView] = useState<{
    programmeName: string;
    programmeCategory: string | null;
    programmeType: "INDIVIDUAL" | "GROUP";
    details: NonNullable<Programme["reportingDetails"]>;
  } | null>(null);
  const [wizardProgrammeId, setWizardProgrammeId] = useState<string | null>(
    null,
  );
  const [wizardKind, setWizardKind] = useState<"create" | "rejudge">("create");
  const [credentialView, setCredentialView] = useState<{
    stageId: string;
    stageName: string | null;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchDrawerOpen, setSearchDrawerOpen] = useState(false);
  const [combinedDrawerDetail, setCombinedDrawerDetail] =
    useState<JudgedProgrammeCard | null>(null);

  const [selectedJudgeIds, setSelectedJudgeIds] = useState<string[]>([]);
  const [judgingMode, setJudgingMode] = useState<"SINGLE" | "GROUP">("GROUP");
  const [newJudgeName, setNewJudgeName] = useState("");
  const [isAddingJudge, startAddJudgeTransition] = useTransition();
  const dashboardQuery = useQuery<JudgementDashboardQueryData>({
    queryKey: queryKeys.judgement.dashboard(festivalId),
    queryFn: () =>
      getJudgementDashboardDataAction(
        festivalId,
      ) as Promise<JudgementDashboardQueryData>,
    initialData: initialDashboardData,
    enabled: Boolean(festivalId),
    staleTime: 0,
    refetchInterval: dialogOpen || Boolean(combinedDrawerDetail) ? false : 8000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  const judgeProgrammes = dashboardQuery.data?.judgeProgrammes ?? [];
  const rejudgeProgrammes = dashboardQuery.data?.rejudgeProgrammes ?? [];
  const judges = dashboardQuery.data?.judges ?? [];
  const activeConfigs = dashboardQuery.data?.activeConfigs ?? [];
  const judgedProgrammes = dashboardQuery.data?.judgedProgrammes ?? [];
  const judgesByStageId = dashboardQuery.data?.judgesByStageId ?? {};

  const matchesStageFilter = useCallback(
    (stageId: string | null | undefined) =>
      effectiveStageId === "" || stageId === effectiveStageId,
    [effectiveStageId],
  );
  const filteredJudgeProgrammes = useMemo(
    () =>
      judgeProgrammes.filter((p) =>
        matchesStageFilter(p.reportingDetails?.stageId ?? null),
      ),
    [judgeProgrammes, matchesStageFilter],
  );
  const filteredRejudgeProgrammes = useMemo(
    () =>
      rejudgeProgrammes.filter((p) =>
        matchesStageFilter(p.reportingDetails?.stageId ?? null),
      ),
    [rejudgeProgrammes, matchesStageFilter],
  );

  const activeByProgrammeId = useMemo(() => {
    const m = new Map<string, ActiveConfig>();
    for (const c of activeConfigs) {
      if (!m.has(c.programmeId)) m.set(c.programmeId, c);
    }
    return m;
  }, [activeConfigs]);

  const judgedByProgrammeId = useMemo(() => {
    const m = new Map<string, JudgedProgrammeCard>();
    for (const j of judgedProgrammes) {
      if (!m.has(j.programmeId)) m.set(j.programmeId, j);
    }
    return m;
  }, [judgedProgrammes]);

  const wizardProgramme = useMemo(() => {
    if (!wizardProgrammeId) return null;
    return (
      filteredJudgeProgrammes.find((p) => p.id === wizardProgrammeId) ??
      filteredRejudgeProgrammes.find((p) => p.id === wizardProgrammeId) ??
      null
    );
  }, [filteredJudgeProgrammes, filteredRejudgeProgrammes, wizardProgrammeId]);

  const sortedJudgedCodeRows = useMemo(() => {
    if (!combinedDrawerDetail) return [];
    return [...combinedDrawerDetail.codeLetterRows].sort((a, b) =>
      a.code.localeCompare(b.code, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
  }, [combinedDrawerDetail]);
  const completedJudgements = useMemo(() => {
    return judgedProgrammes
      .filter((item) => item.isJudgementComplete)
      .sort((a, b) => {
        const aPublished = (a.programmeStatus ?? "")
          .toUpperCase()
          .includes("PUBLISHED");
        const bPublished = (b.programmeStatus ?? "")
          .toUpperCase()
          .includes("PUBLISHED");
        if (aPublished !== bPublished) return aPublished ? 1 : -1;

        // Sort by completion time (updatedAt) descending (newest first)
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bTime - aTime;
      });
  }, [judgedProgrammes]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const allProgrammes = [
      ...filteredJudgeProgrammes.map((p) => ({ ...p, _kind: "READY" })),
      ...filteredRejudgeProgrammes.map((p) => ({ ...p, _kind: "REJUDGE" })),
      ...completedJudgements.map((p) => ({
        id: p.programmeId,
        name: p.programmeName,
        status: p.programmeStatus,
        programmeCategory: p.programmeCategory,
        _kind: "COMPLETED",
        _completedItem: p,
      })),
    ];

    const unique = new Map();
    for (const p of allProgrammes) {
      if (!unique.has(p.id) || p._kind === "COMPLETED") {
        unique.set(p.id, p);
      }
    }

    return Array.from(unique.values()).filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.programmeCategory?.toLowerCase().includes(query),
    );
  }, [
    searchQuery,
    filteredJudgeProgrammes,
    filteredRejudgeProgrammes,
    completedJudgements,
  ]);

  const completedDetailTimeline = useMemo(() => {
    if (!combinedDrawerDetail) return [];

    const events: Array<{
      at: number;
      title: string;
      detail: string;
    }> = [
      {
        at: toEpoch(combinedDrawerDetail.createdAt),
        title: "Configuration created",
        detail: `Mode ${combinedDrawerDetail.judgingMode} • ${combinedDrawerDetail.requiredCodeLetters} code letters`,
      },
    ];

    for (const judge of combinedDrawerDetail.judges) {
      if (judge.firstScoredAt) {
        events.push({
          at: toEpoch(judge.firstScoredAt),
          title: `${judge.name} started scoring`,
          detail: formatCardDateTime(judge.firstScoredAt),
        });
      }
      if (judge.submittedAt) {
        events.push({
          at: toEpoch(judge.submittedAt),
          title: `${judge.name} submitted`,
          detail: formatCardDateTime(judge.submittedAt),
        });
      } else {
        events.push({
          at: toEpoch(combinedDrawerDetail.createdAt),
          title: `${judge.name} pending`,
          detail: "No submission recorded",
        });
      }
    }

    events.push({
      at: toEpoch(combinedDrawerDetail.createdAt) + 1,
      title: "Judgement completion",
      detail: combinedDrawerDetail.completionSummary,
    });

    return events.sort((a, b) => a.at - b.at);
  }, [combinedDrawerDetail, formatCardDateTime, toEpoch]);

  const canGenerate = Boolean(wizardProgramme) && selectedJudgeIds.length > 0;
  const hasUnsavedWizardInputs =
    dialogOpen &&
    (selectedJudgeIds.length > 0 || newJudgeName.trim().length > 0);

  const openWizardForProgramme = (
    programmeId: string,
    kind: "create" | "rejudge" = "create",
  ) => {
    const r = resetWizardForm();
    // Prefill judges: rejudge → prior panel; else the programme's stage default
    // panel (judge_stage_assignment); else empty.
    const priorJudgeIds =
      judgedByProgrammeId.get(programmeId)?.judges.map((j) => j.id) ?? [];
    const programme =
      filteredJudgeProgrammes.find((p) => p.id === programmeId) ??
      filteredRejudgeProgrammes.find((p) => p.id === programmeId);
    const stageId = programme?.reportingDetails?.stageId ?? null;
    const stagePanel = stageId ? (judgesByStageId[stageId] ?? []) : [];
    const prefill =
      kind === "rejudge" && priorJudgeIds.length
        ? priorJudgeIds
        : stagePanel.length
          ? stagePanel
          : priorJudgeIds;
    setWizardKind(kind);
    setWizardProgrammeId(programmeId);
    setSelectedJudgeIds(prefill.length ? prefill : r.selectedJudgeIds);
    setJudgingMode(r.judgingMode);
    setNewJudgeName("");
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setWizardProgrammeId(null);
    setWizardKind("create");
  };

  const toggleJudge = (judgeId: string) => {
    setSelectedJudgeIds((prev) =>
      prev.includes(judgeId)
        ? prev.filter((id) => id !== judgeId)
        : [...prev, judgeId],
    );
  };

  const onAddJudge = () => {
    const name = newJudgeName.trim();
    if (!name) return;
    startAddJudgeTransition(async () => {
      try {
        const created = await createJudgeAction(festivalId, { name });
        if (created) {
          setSelectedJudgeIds((prev) => [...prev, created.id]);
        }
        setNewJudgeName("");
        await queryClient.invalidateQueries({
          queryKey: queryKeys.judgement.dashboard(festivalId),
        });
        toast.success("Judge added.");
      } catch (error: any) {
        toast.error(error?.message ?? "Failed to add judge.");
      }
    });
  };

  const onStartJudgement = () => {
    if (!wizardProgramme) return;
    startTransition(async () => {
      try {
        if (wizardKind === "rejudge") {
          await restartJudgementAction({
            festivalId,
            programmeId: wizardProgramme.id,
            judgeIds: selectedJudgeIds,
          });
        } else {
          await startJudgementAction({
            festivalId,
            programmeId: wizardProgramme.id,
            scoreLimit: POLICY_SCORE_LIMIT,
            judgeIds: selectedJudgeIds,
            judgingMode,
          });
        }
        await queryClient.invalidateQueries({
          queryKey: queryKeys.judgement.dashboard(festivalId),
        });
        toast.success("Judgement started — live on the stage portal now.");
        closeDialog();
      } catch (error: any) {
        toast.error(error?.message ?? "Failed to start judgement.");
      }
    });
  };

  useEffect(() => {
    registerDirtySource(dirtySourceId);
    return () => unregisterDirtySource(dirtySourceId);
  }, [dirtySourceId, registerDirtySource, unregisterDirtySource]);

  useEffect(() => {
    setDirty(dirtySourceId, hasUnsavedWizardInputs);
  }, [dirtySourceId, hasUnsavedWizardInputs, setDirty]);

  // Auto-open the Start Judgement dialog when arriving from the reporting
  // screen's "Submit & start judgement" handoff (?start=<programmeId>).
  const startParam = searchParams.get("start");
  const handledStartRef = useRef<string | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: one-shot handoff; only re-run when the param or programme list changes.
  useEffect(() => {
    if (!startParam || handledStartRef.current === startParam) return;
    const ready = filteredJudgeProgrammes.some((p) => p.id === startParam);
    if (!ready) return;
    handledStartRef.current = startParam;
    openWizardForProgramme(startParam, "create");
    router.replace(pathname);
  }, [startParam, filteredJudgeProgrammes]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-bold tracking-tight sm:text-2xl">
          Judgement Panel
        </h1>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search programmes..."
              className="pl-8 h-9 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.trim()) {
                  setSearchDrawerOpen(true);
                }
              }}
            />
          </div>
          {showStageDropdown && (
            <Select
              value={effectiveStageId === "" ? "__all__" : effectiveStageId}
              onValueChange={(v) =>
                setSelectedStageId(v === "__all__" ? "" : v)
              }
            >
              <SelectTrigger className="w-[180px] h-9 text-sm">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem className="font-normal" value="__all__">
                  All stages
                </SelectItem>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <HowItWorksButton title="How judgement works">
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold">Starting Judgement</h4>
                <p className="text-muted-foreground">
                  Select a programme from the list. You can choose to judge in
                  'Single' or 'Group' mode, and assign judges.
                </p>
              </div>
              <div>
                <h4 className="font-semibold">Judging Modes</h4>
                <p className="text-muted-foreground">
                  <strong>Single:</strong> Judges score independently on their
                  own devices.
                  <br />
                  <strong>Group:</strong> Judges share a single screen and score
                  together.
                </p>
              </div>
              <div>
                <h4 className="font-semibold">Rejudge</h4>
                <p className="text-muted-foreground">
                  If a judgement is completed but needs adjustments, you can
                  restart it before it is published.
                </p>
              </div>
            </div>
          </HowItWorksButton>
        </div>
      </div>

      <section className="space-y-3 min-h-[60vh]">
        {filteredJudgeProgrammes.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No programmes are ready to judge right now.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredJudgeProgrammes.map((p) => {
              const active = activeByProgrammeId.get(p.id);
              const isUnscheduled = Boolean(
                p.reportingDetails && p.reportingDetails.stageId === null,
              );
              return (
                <Card
                  key={p.id}
                  className="flex flex-col overflow-hidden rounded-xl bg-background/40 transition-colors hover:bg-muted/20"
                >
                  <CardHeader className="space-y-2 p-4 pb-2.5 sm:p-5 sm:pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-base font-semibold leading-snug line-clamp-2 sm:text-lg">
                        {p.name}
                      </CardTitle>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant="secondary" className="text-[11px]">
                          {p.status}
                        </Badge>
                        {isUnscheduled && (
                          <Badge
                            variant="outline"
                            className="border-amber-500/60 bg-amber-500/10 text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300"
                          >
                            Off-Stage
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {p.programmeType === "GROUP" ? "Group" : "Individual"}
                      {p.programmeCategory ? ` · ${p.programmeCategory}` : ""}
                      {p.reportingDetails?.stageName
                        ? ` · Stage ${p.reportingDetails.stageName}`
                        : ""}
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-2.5 p-4 pt-0 sm:gap-3 sm:p-5 sm:pt-0">
                    {p.reportingDetails ? (
                      <ProgrammeProgressFunnel
                        assigned={p.reportingDetails.assignedCount}
                        reported={p.reportingDetails.reportedCount}
                        absent={p.reportingDetails.absentCount}
                        scored={
                          judgedByProgrammeId.get(p.id)?.requiredCodeLetters
                        }
                      />
                    ) : null}
                    {active ? (
                      <>
                        <div
                          className={`flex flex-col gap-1.5 rounded-md border px-2 py-1.5 text-[10px] ${
                            active.judgementStatus === "COMPLETED"
                              ? "border-green-500/25 bg-green-500/[0.06] text-green-700 dark:text-green-400"
                              : "border-primary/25 bg-primary/[0.06] text-primary"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-medium">
                            {active.judgementStatus === "COMPLETED" ? (
                              <span className="relative flex h-1.5 w-1.5 shrink-0">
                                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                              </span>
                            ) : (
                              <span className="relative flex h-1.5 w-1.5 shrink-0">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/70" />
                                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                              </span>
                            )}
                            <span>
                              {active.judgementStatus === "COMPLETED"
                                ? "Submitted"
                                : "Live"}{" "}
                              · {active.judges.length} judge
                              {active.judges.length !== 1 ? "s" : ""} ·{" "}
                              {active.judgingMode}
                            </span>
                          </div>
                          {judgedByProgrammeId.get(p.id) && (
                            <div className="flex flex-col border-t border-primary/10 pt-1.5 mt-0.5">
                              <span className="font-semibold">
                                {
                                  judgedByProgrammeId.get(p.id)!
                                    .completionSummary
                                }
                              </span>
                              {judgedByProgrammeId.get(p.id)!.pendingJudgeNames
                                .length > 0 && (
                                <span className="text-primary/70 line-clamp-1 mt-0.5">
                                  Pending:{" "}
                                  {judgedByProgrammeId
                                    .get(p.id)!
                                    .pendingJudgeNames.join(", ")}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="mt-auto pt-1 flex flex-col gap-1 sm:gap-1.5">
                          {(() => {
                            const sid = p.reportingDetails?.stageId;
                            const sname = p.reportingDetails?.stageName ?? null;
                            if (!sid) return null;
                            return (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 w-full text-[11px] sm:h-8 sm:text-xs"
                                onClick={() =>
                                  setCredentialView({
                                    stageId: sid,
                                    stageName: sname,
                                  })
                                }
                              >
                                <KeyRound className="mr-1.5 h-3.5 w-3.5" />
                                View credentials
                              </Button>
                            );
                          })()}
                          <div className="flex w-full">
                            {active.judgementStatus === "COMPLETED" ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="default"
                                className="h-7 w-full text-[11px] sm:h-8 sm:text-xs bg-green-600 hover:bg-green-700 text-white"
                                disabled={isCompleting}
                                onClick={() => {
                                  completeJudgement(active.id);
                                }}
                              >
                                Submit
                              </Button>
                            ) : active.judgementStatus === "CANCELLED" ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 w-full text-[11px] sm:h-8 sm:text-xs text-green-600 border-green-600 hover:bg-green-50"
                                onClick={() =>
                                  openWizardForProgramme(p.id, "rejudge")
                                }
                              >
                                Restart
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                className="h-7 w-full text-[11px] sm:h-8 sm:text-xs"
                                onClick={() => setCancelProgrammeId(p.id)}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="mt-auto">
                        <div className="grid grid-cols-2 gap-1 sm:flex sm:flex-wrap sm:gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] sm:h-8 sm:flex-1 sm:text-xs"
                            onClick={() => {
                              if (!p.reportingDetails) return;
                              setReportedParticipantsView({
                                programmeName: p.name,
                                programmeCategory: p.programmeCategory ?? null,
                                programmeType: p.programmeType,
                                details: p.reportingDetails,
                              });
                            }}
                            disabled={!p.reportingDetails}
                          >
                            View
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 text-[11px] sm:h-8 sm:flex-1 sm:text-xs"
                            onClick={() =>
                              openWizardForProgramme(p.id, "create")
                            }
                            title={
                              isUnscheduled
                                ? "This programme is unscheduled. It will be judged using the Off-Stage portal."
                                : undefined
                            }
                          >
                            <Play className="mr-1.5 h-3.5 w-3.5" />
                            Start Judgement
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <Separator />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight sm:text-lg flex items-center justify-between">
            Completed judgements
            <Badge variant="outline" className="text-[10px]">
              {completedJudgements.length}
            </Badge>
          </h2>
          {completedJudgements.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No completed judgements yet.
            </div>
          ) : (
            <div className="space-y-2">
              {completedJudgements.map((item) => (
                <div
                  key={item.configId}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm line-clamp-1">
                        {item.programmeName}
                      </h4>
                      {(item.programmeStatus ?? "")
                        .toUpperCase()
                        .includes("PUBLISHED") && (
                        <Badge
                          variant="outline"
                          className="border-purple/60 text-purple bg-purple/10 text-[10px] hidden sm:inline-flex"
                        >
                          Published
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <Badge variant="default" className="text-[10px]">
                        {judgementStatusLabel(item.judgementStatus)}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {item.judgingMode}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {item.totalJudgements} entries
                      </span>
                      {item.programmeCategory && (
                        <span className="text-xs text-muted-foreground hidden sm:inline-block">
                          · {item.programmeCategory}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground hidden md:inline-block">
                        · Created {formatCardDateTime(item.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="pl-3 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCombinedDrawerDetail(item)}
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight sm:text-lg flex items-center justify-between">
            Rejudge
            <Badge variant="outline" className="text-[10px]">
              {filteredRejudgeProgrammes.length}
            </Badge>
          </h2>
          {filteredRejudgeProgrammes.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No judged programmes available for rejudge (published items never
              appear here).
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRejudgeProgrammes.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-border/60 bg-linear-to-br from-background to-muted/30 px-3 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:px-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[13px] font-semibold sm:text-sm">
                          {p.name}
                        </p>
                        {p.programmeCategory ? (
                          <p className="text-[11px] text-muted-foreground">
                            {p.programmeCategory}
                          </p>
                        ) : null}
                      </div>
                      <Badge
                        variant="outline"
                        className="w-fit text-[10px] font-normal"
                      >
                        {p.status}
                      </Badge>
                    </div>
                    <div className="shrink-0 self-center">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
                        onClick={() => openWizardForProgramme(p.id, "rejudge")}
                      >
                        <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
                        Rejudge
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <StagePortalCredentialDialog
        festivalId={festivalId}
        stageId={credentialView?.stageId ?? null}
        stageName={credentialView?.stageName}
        open={Boolean(credentialView)}
        onOpenChange={(open) => !open && setCredentialView(null)}
      />

      <Drawer
        open={Boolean(reportedParticipantsView)}
        onOpenChange={(open) => !open && setReportedParticipantsView(null)}
      >
        <DrawerContent className="flex flex-col">
          {reportedParticipantsView ? (
            <>
              <DrawerHeader className="pb-2">
                <DrawerTitle>
                  {reportedParticipantsView.programmeName}
                </DrawerTitle>
                <DrawerDescription>
                  Stage {reportedParticipantsView.details.stageName ?? "—"} ·{" "}
                  {reportedParticipantsView.details.scheduleStart
                    ? formatCardDateTime(
                        reportedParticipantsView.details.scheduleStart,
                      )
                    : "No schedule time"}
                </DrawerDescription>
              </DrawerHeader>
              <div className="flex-1 overflow-y-auto pb-6">
                <div className="space-y-3 pt-2">
                  <p className="text-sm text-muted-foreground">
                    {reportedParticipantsView.programmeType === "GROUP"
                      ? `Reported teams (${reportedParticipantsView.details.reportedCount})`
                      : `Reported participants (${reportedParticipantsView.details.reportedCount})`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Category:{" "}
                    {reportedParticipantsView.programmeCategory ?? "—"}
                  </p>
                  {reportedParticipantsView.details.reportedEntries.length ===
                  0 ? (
                    <Card>
                      <CardContent className="p-4 text-sm text-muted-foreground">
                        No reported participant details available.
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-1 rounded-lg border bg-card p-1.5">
                      {reportedParticipantsView.details.reportedEntries.map(
                        (entry) => (
                          <div
                            key={`${entry.label}-${entry.codeLetter ?? "na"}`}
                            className="rounded-md border bg-background/70 px-2 py-1.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="min-w-0 truncate text-xs font-medium text-foreground">
                                {entry.label}
                              </p>
                              <span className="shrink-0 rounded border bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-foreground">
                                {reportedParticipantsView.programmeType ===
                                "GROUP"
                                  ? `Team ${entry.codeLetter ?? "—"}`
                                  : (entry.codeLetter ?? "—")}
                              </span>
                            </div>
                            {reportedParticipantsView.programmeType ===
                            "GROUP" ? (
                              <div className="mt-1 text-[10px] leading-tight text-muted-foreground">
                                <p className="truncate">
                                  Group ·{" "}
                                  {reportedParticipantsView.programmeCategory ??
                                    "—"}
                                </p>
                              </div>
                            ) : (
                              <div className="mt-1 text-[10px] leading-tight text-muted-foreground">
                                <p className="truncate">
                                  Individual · {entry.groupName ?? "—"} ·{" "}
                                  {entry.categoryName ??
                                    reportedParticipantsView.programmeCategory ??
                                    "—"}
                                </p>
                              </div>
                            )}
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </DrawerContent>
      </Drawer>

      <Drawer
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DrawerContent className="flex flex-col">
          <DrawerHeader className="pb-2">
            <DrawerTitle>
              {wizardKind === "rejudge" ? "Rejudge" : "Start Judgement"}
            </DrawerTitle>
            <DrawerDescription>
              {wizardProgramme ? (
                <>
                  <span className="font-medium text-foreground">
                    {wizardProgramme.name}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {wizardProgramme.status}
                  </span>
                </>
              ) : (
                "Select judges, then start."
              )}
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto pb-6">
            <div className="space-y-3 pt-1 sm:space-y-4 sm:pt-2">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Judges ({selectedJudgeIds.length} selected)
                </Label>
                <div className="grid max-h-[170px] gap-1.5 overflow-y-auto rounded-md border p-1.5 sm:max-h-[210px]">
                  {judges.map((j) => (
                    <label
                      key={j.id}
                      className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors sm:text-sm ${
                        selectedJudgeIds.includes(j.id)
                          ? "border-purple/60 bg-purple/10"
                          : "bg-background"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedJudgeIds.includes(j.id)}
                        onChange={() => toggleJudge(j.id)}
                      />
                      <span className="font-medium">{j.name}</span>
                    </label>
                  ))}
                  {judges.length === 0 ? (
                    <p className="px-1 py-1 text-xs text-muted-foreground">
                      No judges yet — add one below.
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-1.5">
                  <Input
                    value={newJudgeName}
                    onChange={(e) => setNewJudgeName(e.target.value)}
                    placeholder="New judge name"
                    className="h-8 text-xs sm:h-9 sm:text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        onAddJudge();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0 text-xs sm:h-9"
                    onClick={onAddJudge}
                    disabled={isAddingJudge || !newJudgeName.trim()}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add
                  </Button>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border border-border/70 bg-muted/10 p-2.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Judging mode
                </Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${judgingMode === "SINGLE" ? "border-purple/60 bg-purple/10" : "bg-background hover:bg-muted/40"}`}
                    onClick={() => setJudgingMode("SINGLE")}
                  >
                    <p className="font-medium">Single</p>
                    <p className="text-xs text-muted-foreground">
                      Each judge scores independently.
                    </p>
                  </button>
                  <button
                    type="button"
                    className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${judgingMode === "GROUP" ? "border-purple/60 bg-purple/10" : "bg-background hover:bg-muted/40"}`}
                    onClick={() => setJudgingMode("GROUP")}
                  >
                    <p className="font-medium">Group</p>
                    <p className="text-xs text-muted-foreground">
                      Shared screen, all judges at once.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <DrawerFooter>
            <Button
              className="h-9 w-full text-xs sm:text-sm"
              type="button"
              onClick={onStartJudgement}
              disabled={!canGenerate || isPending}
            >
              <Play className="mr-1.5 h-3.5 w-3.5" />
              {isPending
                ? "Starting…"
                : wizardKind === "rejudge"
                  ? "Restart judgement"
                  : "Start judgement"}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={searchDrawerOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSearchDrawerOpen(false);
            setSearchQuery("");
          }
        }}
      >
        <DrawerContent className=" flex flex-col">
          <DrawerHeader className="pb-2">
            <DrawerTitle>Search Results</DrawerTitle>
            <div className="mt-4 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search programmes..."
                className="pl-10 h-9 bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <DrawerDescription className="mt-2">
              {searchResults.length} matching programme
              {searchResults.length === 1 ? "" : "s"}
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto  pb-6 min-h-0">
            <div className="space-y-2">
              {searchResults.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <h4 className="font-semibold line-clamp-1">{item.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {item.programmeCategory && (
                        <Badge variant="secondary" className="text-[10px]">
                          {item.programmeCategory}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {item.status}
                      </span>
                    </div>
                  </div>
                  <div className="pl-3 shrink-0 flex items-center gap-2">
                    {item._kind === "READY" && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSearchDrawerOpen(false);
                          openWizardForProgramme(item.id, "create");
                        }}
                      >
                        Start judgement
                      </Button>
                    )}
                    {item._kind === "REJUDGE" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSearchDrawerOpen(false);
                          openWizardForProgramme(item.id, "rejudge");
                        }}
                      >
                        Restart judgement
                      </Button>
                    )}
                    {item._kind === "COMPLETED" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSearchDrawerOpen(false);
                            openWizardForProgramme(item.id, "rejudge");
                          }}
                        >
                          Rejudge
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSearchDrawerOpen(false);
                            setCombinedDrawerDetail(item._completedItem);
                          }}
                        >
                          View
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {searchResults.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No results found.
                </p>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={Boolean(combinedDrawerDetail)}
        onOpenChange={(open) => !open && setCombinedDrawerDetail(null)}
      >
        <DrawerContent className=" flex flex-col">
          <DrawerHeader>
            <DrawerTitle>{combinedDrawerDetail?.programmeName}</DrawerTitle>
            <DrawerDescription>
              Status {combinedDrawerDetail?.programmeStatus} · Mode{" "}
              {combinedDrawerDetail?.judgingMode} ·{" "}
              {combinedDrawerDetail?.totalJudgements} score entries
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto pb-6 min-h-0 space-y-6">
            {combinedDrawerDetail ? (
              <>
                <div className="space-y-3">
                  <h3 className="font-semibold tracking-tight text-lg">
                    Review Scores
                  </h3>
                  <div className="rounded-md border p-2.5 sm:p-3">
                    <p className="text-xs font-medium mb-2">
                      Judge submissions
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {combinedDrawerDetail.judges.map((j) => (
                        <span
                          key={j.id}
                          className="text-xs rounded-md bg-muted px-2 py-1"
                        >
                          {j.name}
                          {j.submittedAt
                            ? ` · ${formatCardDateTime(j.submittedAt)}`
                            : " · not submitted"}
                        </span>
                      ))}
                    </div>
                  </div>
                  {combinedDrawerDetail.judgingMode === "SINGLE" ? (
                    <div className="rounded-md border p-2.5 sm:p-3">
                      <p className="mb-2 text-xs font-medium">
                        Single-mode completion
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {combinedDrawerDetail.judgeProgress.map((progress) => (
                          <div
                            key={progress.judgeId}
                            className="rounded-md border bg-muted/20 px-2.5 py-2 text-xs"
                          >
                            <p className="font-medium">{progress.judgeName}</p>
                            <p className="text-muted-foreground">
                              {progress.scoredCount}/{progress.requiredCount}{" "}
                              code letters
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="overflow-x-auto rounded-md border">
                    <table className="min-w-full text-xs sm:text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="px-3 py-2 text-left">Code</th>
                          {combinedDrawerDetail.judges.map((j) => (
                            <th
                              key={j.id}
                              className="px-3 py-2 text-left whitespace-nowrap"
                            >
                              {j.name}
                            </th>
                          ))}
                          <th className="px-3 py-2 text-left">Average</th>
                          <th className="px-3 py-2 text-left">Grade</th>
                          <th className="px-3 py-2 text-left">Award Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedJudgedCodeRows.map((row) => (
                          <tr
                            key={row.codeLetterId}
                            className={`border-t ${row.isAbsent ? "opacity-50" : ""}`}
                          >
                            <td className="px-3 py-2 font-mono">
                              {row.code}
                              {row.isAbsent && (
                                <Badge
                                  variant="secondary"
                                  className="ml-2 text-[10px]"
                                >
                                  Absent
                                </Badge>
                              )}
                            </td>
                            {combinedDrawerDetail.judges.map((j) => (
                              <td key={j.id} className="px-3 py-2">
                                {row.isAbsent
                                  ? "—"
                                  : (row.judgeScores[j.id] ?? "—")}
                              </td>
                            ))}
                            <td className="px-3 py-2 font-semibold">
                              {row.isAbsent ? "—" : row.average.toFixed(2)}
                            </td>
                            <td className="px-3 py-2">
                              {row.isAbsent ? "—" : (row.grade ?? "—")}
                            </td>
                            <td className="px-3 py-2">
                              {row.isAbsent ? "—" : (row.awardPoints ?? "—")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h3 className="font-semibold tracking-tight text-lg">
                    View Details
                  </h3>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-md border bg-muted/20 px-2.5 py-2 text-center">
                      <p className="text-[10px] uppercase text-muted-foreground">
                        Status
                      </p>
                      <p className="text-xs font-semibold">
                        {judgementStatusLabel(
                          combinedDrawerDetail.judgementStatus,
                        )}
                      </p>
                    </div>
                    <div className="rounded-md border bg-muted/20 px-2.5 py-2 text-center">
                      <p className="text-[10px] uppercase text-muted-foreground">
                        Mode
                      </p>
                      <p className="text-xs font-semibold">
                        {combinedDrawerDetail.judgingMode}
                      </p>
                    </div>
                    <div className="rounded-md border bg-muted/20 px-2.5 py-2 text-center">
                      <p className="text-[10px] uppercase text-muted-foreground">
                        Entries
                      </p>
                      <p className="text-xs font-semibold">
                        {combinedDrawerDetail.totalJudgements}
                      </p>
                    </div>
                    <div className="rounded-md border bg-muted/20 px-2.5 py-2 text-center">
                      <p className="text-[10px] uppercase text-muted-foreground">
                        Code letters
                      </p>
                      <p className="text-xs font-semibold">
                        {combinedDrawerDetail.requiredCodeLetters}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-card/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Timeline
                      </p>
                      <Badge variant="outline" className="h-5 text-[10px]">
                        {completedDetailTimeline.length} events
                      </Badge>
                    </div>
                    <Accordion
                      type="single"
                      collapsible
                      className="mt-2 rounded-md border border-border/70 bg-background/70 px-2.5"
                    >
                      <AccordionItem
                        value="judgement-timeline"
                        className="border-b-0"
                      >
                        <AccordionTrigger className="py-2 hover:no-underline">
                          <div className="flex min-w-0 items-center gap-2 text-left">
                            <span className="truncate text-[11px] font-semibold sm:text-[12px]">
                              Timeline events
                            </span>
                            <span className="truncate text-[10px] text-muted-foreground">
                              {completedDetailTimeline.length} total
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-2 pt-0">
                          <div className="grid gap-1.5 sm:grid-cols-2">
                            {completedDetailTimeline.map((event, index) => (
                              <div
                                key={`${event.title}-${index}`}
                                className="rounded-md border border-border/70 bg-linear-to-br from-background via-background to-muted/30 px-2.5 py-2"
                              >
                                <div className="flex items-start gap-2">
                                  <span className="inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border border-purple/40 bg-purple/10 text-[9px] font-semibold text-purple">
                                    {index + 1}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="truncate text-[11px] font-semibold sm:text-[12px]">
                                      {event.title}
                                    </p>
                                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                                      {event.detail}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog
        open={!!cancelProgrammeId}
        onOpenChange={(open) => {
          if (!open) setCancelProgrammeId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel judgement?</AlertDialogTitle>
            <AlertDialogDescription>
              This will abort the active judgement round and lock out all judges
              instantly. Any partial scores that have not been submitted will be
              lost. The programme will remain as Cancelled and can be restarted
              later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>
              Keep active
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isCancelling}
              onClick={(e) => {
                e.preventDefault();
                if (cancelProgrammeId) {
                  cancelJudgement(
                    {
                      festivalId,
                      programmeId: cancelProgrammeId,
                    },
                    {
                      onSuccess: () => {
                        toast.success("Judgement cancelled");
                        setCancelProgrammeId(null);
                      },
                    },
                  );
                }
              }}
            >
              {isCancelling ? "Cancelling..." : "Yes, cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
