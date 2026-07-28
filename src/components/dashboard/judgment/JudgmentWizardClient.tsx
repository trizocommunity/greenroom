"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, MoreVertical, Play, Plus, RefreshCcw } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import { queryKeys } from "@/api/client/_query-keys";
import { useUnsavedChanges } from "@/components/common/useUnsavedChanges";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { ProgrammeJudgmentStatus } from "@/core/types/app-enums";
import {
  formatStoredDateTime,
  parseStoredInstant,
} from "@/core/utils/date-time";
import { createJudgeAction } from "@/features/judges/actions/judge.actions";
import {
  getJudgmentDashboardDataAction,
  restartJudgmentAction,
  startJudgmentAction,
} from "@/features/judgment/actions/judgment.actions";

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
  judgmentStatus: ProgrammeJudgmentStatus;
};
type JudgedProgrammeCard = {
  configId: string;
  createdAt: string | Date;
  programmeId: string;
  programmeName: string;
  programmeStatus: string;
  programmeCategory?: string | null;
  scoreLimit: number;
  judgingMode: "SINGLE" | "GROUP";
  requiredCodeLetters: number;
  totalJudgments: number;
  isJudgmentComplete: boolean;
  judgmentStatus: ProgrammeJudgmentStatus;
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
    judgeScores: Record<string, number>;
  }>;
};

/** Snapshot shape for React Query; server actions infer narrower DB enums that clash with `initialData`. */
type JudgmentDashboardQueryData = {
  judgeProgrammes: Programme[];
  rejudgeProgrammes: Programme[];
  judges: Judge[];
  activeConfigs: ActiveConfig[];
  judgedProgrammes: JudgedProgrammeCard[];
};

function resetWizardForm() {
  return {
    selectedJudgeIds: [] as string[],
    judgingMode: "GROUP" as "SINGLE" | "GROUP",
  };
}

export function JudgmentWizardClient({
  festivalId,
  initialDashboardData,
}: {
  festivalId: string;
  initialDashboardData: JudgmentDashboardQueryData;
}) {
  const formatCardDateTime = useCallback(
    (value: string | Date) =>
      formatStoredDateTime(value, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [],
  );
  const toEpoch = useCallback((value: string | Date) => {
    return parseStoredInstant(value).getTime();
  }, []);

  const judgmentStatusLabel = (status: ProgrammeJudgmentStatus) => {
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

  const dirtySourceId = `judgment-wizard:${festivalId}`;
  const { registerDirtySource, unregisterDirtySource, setDirty } =
    useUnsavedChanges();
  const POLICY_SCORE_LIMIT = 100;
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [judgedDetail, setJudgedDetail] = useState<JudgedProgrammeCard | null>(
    null,
  );
  const [completedDetail, setCompletedDetail] =
    useState<JudgedProgrammeCard | null>(null);
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

  const [selectedJudgeIds, setSelectedJudgeIds] = useState<string[]>([]);
  const [judgingMode, setJudgingMode] = useState<"SINGLE" | "GROUP">("GROUP");
  const [newJudgeName, setNewJudgeName] = useState("");
  const [isAddingJudge, startAddJudgeTransition] = useTransition();
  const dashboardQuery = useQuery<JudgmentDashboardQueryData>({
    queryKey: queryKeys.judgment.dashboard(festivalId),
    queryFn: () =>
      getJudgmentDashboardDataAction(
        festivalId,
      ) as Promise<JudgmentDashboardQueryData>,
    initialData: initialDashboardData,
    enabled: Boolean(festivalId),
    staleTime: 0,
    refetchInterval: dialogOpen || Boolean(judgedDetail) ? false : 8000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  const judgeProgrammes = dashboardQuery.data?.judgeProgrammes ?? [];
  const rejudgeProgrammes = dashboardQuery.data?.rejudgeProgrammes ?? [];
  const judges = dashboardQuery.data?.judges ?? [];
  const activeConfigs = dashboardQuery.data?.activeConfigs ?? [];
  const judgedProgrammes = dashboardQuery.data?.judgedProgrammes ?? [];

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
      judgeProgrammes.find((p) => p.id === wizardProgrammeId) ??
      rejudgeProgrammes.find((p) => p.id === wizardProgrammeId) ??
      null
    );
  }, [judgeProgrammes, rejudgeProgrammes, wizardProgrammeId]);

  const sortedJudgedCodeRows = useMemo(() => {
    if (!judgedDetail) return [];
    return [...judgedDetail.codeLetterRows].sort((a, b) =>
      a.code.localeCompare(b.code, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
  }, [judgedDetail]);
  const completedJudgments = useMemo(() => {
    return judgedProgrammes
      .filter((item) => item.isJudgmentComplete)
      .sort((a, b) => {
        const aPublished = (a.programmeStatus ?? "")
          .toUpperCase()
          .includes("PUBLISHED");
        const bPublished = (b.programmeStatus ?? "")
          .toUpperCase()
          .includes("PUBLISHED");
        if (aPublished !== bPublished) return aPublished ? 1 : -1;
        return b.totalJudgments - a.totalJudgments;
      });
  }, [judgedProgrammes]);
  const completedDetailTimeline = useMemo(() => {
    if (!completedDetail) return [];

    const events: Array<{
      at: number;
      title: string;
      detail: string;
    }> = [
      {
        at: toEpoch(completedDetail.createdAt),
        title: "Configuration created",
        detail: `Mode ${completedDetail.judgingMode} • ${completedDetail.requiredCodeLetters} code letters`,
      },
    ];

    for (const judge of completedDetail.judges) {
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
          at: toEpoch(completedDetail.createdAt),
          title: `${judge.name} pending`,
          detail: "No submission recorded",
        });
      }
    }

    events.push({
      at: toEpoch(completedDetail.createdAt) + 1,
      title: "Judgment completion",
      detail: completedDetail.completionSummary,
    });

    return events.sort((a, b) => a.at - b.at);
  }, [completedDetail, formatCardDateTime, toEpoch]);

  const canGenerate = Boolean(wizardProgramme) && selectedJudgeIds.length > 0;
  const hasUnsavedWizardInputs =
    dialogOpen && (selectedJudgeIds.length > 0 || newJudgeName.trim().length > 0);

  const openWizardForProgramme = (
    programmeId: string,
    kind: "create" | "rejudge" = "create",
  ) => {
    const r = resetWizardForm();
    const priorJudgeIds =
      judgedByProgrammeId.get(programmeId)?.judges.map((j) => j.id) ?? [];
    setWizardKind(kind);
    setWizardProgrammeId(programmeId);
    setSelectedJudgeIds(priorJudgeIds.length ? priorJudgeIds : r.selectedJudgeIds);
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
          queryKey: queryKeys.judgment.dashboard(festivalId),
        });
        toast.success("Judge added.");
      } catch (error: any) {
        toast.error(error?.message ?? "Failed to add judge.");
      }
    });
  };

  const onStartJudgment = () => {
    if (!wizardProgramme) return;
    startTransition(async () => {
      try {
        if (wizardKind === "rejudge") {
          await restartJudgmentAction({
            festivalId,
            programmeId: wizardProgramme.id,
            judgeIds: selectedJudgeIds,
          });
        } else {
          await startJudgmentAction({
            festivalId,
            programmeId: wizardProgramme.id,
            scoreLimit: POLICY_SCORE_LIMIT,
            judgeIds: selectedJudgeIds,
            judgingMode,
          });
        }
        await queryClient.invalidateQueries({
          queryKey: queryKeys.judgment.dashboard(festivalId),
        });
        toast.success("Judgment started — live on the stage portal now.");
        closeDialog();
      } catch (error: any) {
        toast.error(error?.message ?? "Failed to start judgment.");
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

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="px-1">
        <h1 className="text-lg font-bold tracking-tight sm:text-2xl">
          Judgment
        </h1>
      </div>

      <section className="space-y-3 min-h-[60vh]">
        <div className="flex items-center justify-end gap-2">
          <Badge variant="outline" className="text-[10px]">
            {judgeProgrammes.length} programme
            {judgeProgrammes.length === 1 ? "" : "s"}
          </Badge>
        </div>
        {judgeProgrammes.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No programmes are ready to judge right now.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {judgeProgrammes.map((p) => {
              const active = activeByProgrammeId.get(p.id);
              return (
                <Card
                  key={p.id}
                  className="flex flex-col overflow-hidden rounded-lg bg-background/40 transition-colors hover:bg-muted/20"
                >
                  <CardHeader className="space-y-1 p-2 pb-1.5 sm:p-3 sm:pb-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-[13px] font-semibold leading-snug line-clamp-2 sm:text-sm">
                        {p.name}
                      </CardTitle>
                      <Badge
                        variant="secondary"
                        className="shrink-0 text-[10px]"
                      >
                        {p.status}
                      </Badge>
                    </div>
                    {p.programmeCategory ? (
                      <p className="text-[11px] text-muted-foreground">
                        Category: {p.programmeCategory}
                      </p>
                    ) : null}
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-1.5 p-2 pt-0 sm:gap-2 sm:p-3 sm:pt-0">
                    {active ? (
                      <>
                        <p className="rounded-md border bg-muted/20 px-2 py-1 text-[10px] leading-relaxed text-muted-foreground">
                          {active.judgingMode} · {active.judges.length} judge
                          {active.judges.length !== 1 ? "s" : ""} ·{" "}
                          {judgmentStatusLabel(active.judgmentStatus)}
                        </p>
                        {p.reportingDetails ? (
                          <div className="space-y-0.5 text-[10px] text-muted-foreground">
                            <p>Stage: {p.reportingDetails.stageName ?? "—"}</p>
                            <p>
                              Time:{" "}
                              {p.reportingDetails.scheduleStart
                                ? formatCardDateTime(
                                    p.reportingDetails.scheduleStart,
                                  )
                                : "—"}
                              {p.reportingDetails.scheduleEnd
                                ? ` - ${formatCardDateTime(p.reportingDetails.scheduleEnd)}`
                                : ""}
                            </p>
                          </div>
                        ) : null}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[10px] sm:h-7 sm:px-2.5 sm:text-xs"
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
                          {p.programmeType === "GROUP"
                            ? "View reported teams"
                            : "View reported participants"}
                        </Button>
                      </>
                    ) : null}
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
                        {!active ? (
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 text-[11px] sm:h-8 sm:flex-1 sm:text-xs"
                            onClick={() =>
                              openWizardForProgramme(p.id, "create")
                            }
                          >
                            <Play className="mr-1.5 h-3.5 w-3.5" />
                            Start Judgment
                          </Button>
                        ) : null}
                      </div>
                    </div>
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
            Completed judgments
            <Badge variant="outline" className="text-[10px]">
              {completedJudgments.length}
            </Badge>
          </h2>
          {completedJudgments.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No completed judgments yet.
            </div>
          ) : (
            <div className="space-y-2">
              {completedJudgments.map((item) => (
                <div
                  key={item.configId}
                  className="group/card relative flex flex-col overflow-hidden rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/20"
                >
                  <div className="flex flex-1 flex-col p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base leading-tight text-foreground line-clamp-2">
                          {item.programmeName}
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {(item.programmeStatus ?? "")
                            .toUpperCase()
                            .includes("PUBLISHED") ? (
                            <Badge
                              variant="outline"
                              className="border-purple/60 text-purple bg-purple/10 text-[10px]"
                            >
                              Published
                            </Badge>
                          ) : null}
                          <Badge variant="secondary" className="text-[10px]">
                            {item.programmeStatus}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {item.judgingMode}
                          </Badge>
                        </div>
                        {item.programmeCategory ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            Category: {item.programmeCategory}
                          </p>
                        ) : null}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() => setCompletedDetail(item)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => setJudgedDetail(item)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Review scores
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex-1 min-h-4" />

                    <div className="mt-4 flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="default" className="text-[10px]">
                          {judgmentStatusLabel(item.judgmentStatus)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {item.completionSummary}
                        </span>
                      </div>
                      {item.judgingMode === "SINGLE" &&
                      item.pendingJudgeNames.length > 0 ? (
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Pending:</span>{" "}
                          {item.pendingJudgeNames.join(", ")}
                        </p>
                      ) : null}
                    </div>

                    {/* Stats strip */}
                    <div className="mt-4 flex items-center gap-4 rounded-lg bg-muted/40 px-3 py-2.5 overflow-x-auto">
                      <div className="flex items-center gap-2">
                        <span className="text-sm whitespace-nowrap">
                          <span className="font-semibold text-foreground">
                            {item.totalJudgments}
                          </span>
                          <span className="text-muted-foreground">
                            {" "}
                            entries
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 border-l border-border pl-4">
                        <span className="text-sm whitespace-nowrap text-muted-foreground">
                          Created {formatCardDateTime(item.createdAt)}
                        </span>
                      </div>
                    </div>
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
              {rejudgeProgrammes.length}
            </Badge>
          </h2>
          {rejudgeProgrammes.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No judged programmes available for rejudge (published items never
              appear here).
            </div>
          ) : (
            <div className="space-y-2">
              {rejudgeProgrammes.map((p) => (
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

      <Dialog
        open={Boolean(reportedParticipantsView)}
        onOpenChange={(open) => !open && setReportedParticipantsView(null)}
      >
        <DialogContent className="max-h-[min(90dvh,720px)] w-[calc(100%-1rem)] max-w-lg overflow-y-auto p-4 sm:w-[calc(100%-1.5rem)] sm:p-6">
          {reportedParticipantsView ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {reportedParticipantsView.programmeName}
                </DialogTitle>
                <DialogDescription>
                  Stage {reportedParticipantsView.details.stageName ?? "—"} ·{" "}
                  {reportedParticipantsView.details.scheduleStart
                    ? formatCardDateTime(
                        reportedParticipantsView.details.scheduleStart,
                      )
                    : "No schedule time"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <p className="text-sm text-muted-foreground">
                  {reportedParticipantsView.programmeType === "GROUP"
                    ? `Reported teams (${reportedParticipantsView.details.reportedCount})`
                    : `Reported participants (${reportedParticipantsView.details.reportedCount})`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Category: {reportedParticipantsView.programmeCategory ?? "—"}
                </p>
                {reportedParticipantsView.details.reportedEntries.length ===
                0 ? (
                  <Card>
                    <CardContent className="p-4 text-sm text-muted-foreground">
                      No reported participant details available.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="max-h-[min(56vh,26rem)] space-y-1 overflow-y-auto rounded-lg border bg-card p-1.5">
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
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="max-h-[min(90dvh,720px)] w-[calc(100%-1rem)] max-w-lg overflow-y-auto p-4 sm:w-[calc(100%-1.5rem)] sm:p-6">
          <DialogHeader>
            <DialogTitle>
              {wizardKind === "rejudge" ? "Rejudge" : "Start Judgment"}
            </DialogTitle>
            <DialogDescription>
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
            </DialogDescription>
          </DialogHeader>

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

            <Button
              className="h-9 w-full text-xs sm:text-sm"
              type="button"
              onClick={onStartJudgment}
              disabled={!canGenerate || isPending}
            >
              <Play className="mr-1.5 h-3.5 w-3.5" />
              {isPending
                ? "Starting…"
                : wizardKind === "rejudge"
                  ? "Restart judgment"
                  : "Start judgment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(completedDetail)}
        onOpenChange={(open) => !open && setCompletedDetail(null)}
      >
        <DialogContent className="max-h-[min(90dvh,720px)] w-[calc(100%-1rem)] max-w-2xl overflow-y-auto p-3 sm:w-[calc(100%-1.5rem)] sm:p-6">
          {completedDetail ? (
            <>
              <DialogHeader>
                <DialogTitle>{completedDetail.programmeName}</DialogTitle>
                <DialogDescription>
                  Completed judgment summary and timeline
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2.5 sm:space-y-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-md border bg-muted/20 px-2.5 py-2 text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">
                      Status
                    </p>
                    <p className="text-xs font-semibold">
                      {judgmentStatusLabel(completedDetail.judgmentStatus)}
                    </p>
                  </div>
                  <div className="rounded-md border bg-muted/20 px-2.5 py-2 text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">
                      Mode
                    </p>
                    <p className="text-xs font-semibold">
                      {completedDetail.judgingMode}
                    </p>
                  </div>
                  <div className="rounded-md border bg-muted/20 px-2.5 py-2 text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">
                      Entries
                    </p>
                    <p className="text-xs font-semibold">
                      {completedDetail.totalJudgments}
                    </p>
                  </div>
                  <div className="rounded-md border bg-muted/20 px-2.5 py-2 text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">
                      Code letters
                    </p>
                    <p className="text-xs font-semibold">
                      {completedDetail.requiredCodeLetters}
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
                      value="judgment-timeline"
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

                <div className="rounded-lg border bg-card/60 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Judges
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {completedDetail.judges.map((judge) => (
                      <div
                        key={judge.id}
                        className="flex flex-col items-start justify-between gap-0.5 rounded-md border bg-background px-2.5 py-2 text-xs sm:flex-row sm:items-center"
                      >
                        <span className="font-medium">{judge.name}</span>
                        <span className="text-muted-foreground">
                          {judge.submittedAt
                            ? `Submitted ${formatCardDateTime(judge.submittedAt)}`
                            : judge.firstScoredAt
                              ? `Opened/started ${formatCardDateTime(judge.firstScoredAt)}`
                              : "Not opened"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(judgedDetail)}
        onOpenChange={(open) => !open && setJudgedDetail(null)}
      >
        <DialogContent className="max-h-[min(90dvh,720px)] w-[calc(100%-1rem)] max-w-3xl overflow-y-auto p-4 sm:w-[calc(100%-1.5rem)] sm:p-6">
          {judgedDetail ? (
            <>
              <DialogHeader>
                <DialogTitle>{judgedDetail.programmeName}</DialogTitle>
                <DialogDescription>
                  Status {judgedDetail.programmeStatus} · Mode{" "}
                  {judgedDetail.judgingMode} · {judgedDetail.totalJudgments}{" "}
                  score entries
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 pt-1 sm:space-y-4 sm:pt-2">
                <div className="rounded-md border p-2.5 sm:p-3">
                  <p className="text-xs font-medium mb-2">Judge submissions</p>
                  <div className="flex flex-wrap gap-2">
                    {judgedDetail.judges.map((j) => (
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
                {judgedDetail.judgingMode === "SINGLE" ? (
                  <div className="rounded-md border p-2.5 sm:p-3">
                    <p className="mb-2 text-xs font-medium">
                      Single-mode completion
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {judgedDetail.judgeProgress.map((progress) => (
                        <div
                          key={progress.judgeId}
                          className="rounded-md border bg-muted/20 px-2.5 py-2 text-xs"
                        >
                          <p className="font-medium">{progress.judgeName}</p>
                          <p className="text-muted-foreground">
                            {progress.scoredCount}/{progress.requiredCount} code
                            letters
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
                        {judgedDetail.judges.map((j) => (
                          <th
                            key={j.id}
                            className="px-3 py-2 text-left whitespace-nowrap"
                          >
                            {j.name}
                          </th>
                        ))}
                        <th className="px-3 py-2 text-left">Average</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedJudgedCodeRows.map((row) => (
                        <tr key={row.codeLetterId} className="border-t">
                          <td className="px-3 py-2 font-mono">{row.code}</td>
                          {judgedDetail.judges.map((j) => (
                            <td key={j.id} className="px-3 py-2">
                              {row.judgeScores[j.id] ?? "—"}
                            </td>
                          ))}
                          <td className="px-3 py-2 font-semibold">
                            {row.average.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
