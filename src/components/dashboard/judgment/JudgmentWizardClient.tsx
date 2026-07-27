"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Eye, Link2, MoreVertical, Plus, RefreshCcw } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import { queryKeys } from "@/api/client/_query-keys";
import { useCreateJudge } from "@/api/client/judges";
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
import { ERROR_MESSAGES } from "@/core/errors/errors";
import type { ProgrammeJudgmentStatus } from "@/core/types/app-enums";
import {
  formatStoredDateTime,
  parseStoredInstant,
} from "@/core/utils/date-time";
import {
  createJudgmentConfigurationAction,
  getJudgmentDashboardDataAction,
  regenerateJudgmentConfigurationLinkAction,
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
  activeLinkId: string | null;
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

function normalizeJudgeName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function resetWizardForm() {
  return {
    step: 2 as 2 | 3 | 4,
    selectedJudgeIds: [] as string[],
    newJudgeName: "",
    newJudgeDescription: "",
    pinMode: "auto" as "auto" | "manual",
    manualPin: "",
    pinLength: 4 as 4 | 5 | 6,
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
      case "LINK_ACTIVE":
        return "Link active";
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
  const [reportedStudentsView, setReportedStudentsView] = useState<{
    programmeName: string;
    programmeCategory: string | null;
    programmeType: "INDIVIDUAL" | "GROUP";
    details: NonNullable<Programme["reportingDetails"]>;
  } | null>(null);
  const [wizardProgrammeId, setWizardProgrammeId] = useState<string | null>(
    null,
  );
  const [wizardKind, setWizardKind] = useState<"create" | "rejudge">("create");

  const [step, setStep] = useState<2 | 3 | 4>(2);
  const [selectedJudgeIds, setSelectedJudgeIds] = useState<string[]>([]);
  const [generatedUrlByConfigId, setGeneratedUrlByConfigId] = useState<
    Record<string, string>
  >({});
  const [generatedPinByConfigId, setGeneratedPinByConfigId] = useState<
    Record<string, string>
  >({});
  const [newJudgeName, setNewJudgeName] = useState("");
  const [newJudgeDescription, setNewJudgeDescription] = useState("");
  const [inlineJudgeError, setInlineJudgeError] = useState<string | null>(null);
  const [pinMode, setPinMode] = useState<"auto" | "manual">("auto");
  const [manualPin, setManualPin] = useState("");
  const [pinLength, setPinLength] = useState<4 | 5 | 6>(4);
  const [judgingMode, setJudgingMode] = useState<"SINGLE" | "GROUP">("GROUP");
  /** Config id from the most recent successful generate in this dialog (covers pre-refresh). */
  const [lastCreatedConfigId, setLastCreatedConfigId] = useState<string | null>(
    null,
  );
  const createJudge = useCreateJudge();
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
    dialogOpen &&
    (selectedJudgeIds.length > 0 ||
      step !== 2 ||
      newJudgeName.trim().length > 0 ||
      newJudgeDescription.trim().length > 0 ||
      pinMode === "manual" ||
      manualPin.trim().length > 0);

  const openWizardForProgramme = (
    programmeId: string,
    kind: "create" | "rejudge" = "create",
  ) => {
    const r = resetWizardForm();
    setWizardKind(kind);
    setWizardProgrammeId(programmeId);
    setStep(r.step);
    setSelectedJudgeIds(r.selectedJudgeIds);
    setNewJudgeName(r.newJudgeName);
    setNewJudgeDescription(r.newJudgeDescription);
    setPinMode(r.pinMode);
    setManualPin(r.manualPin);
    setPinLength(r.pinLength);
    setJudgingMode(r.judgingMode);
    setLastCreatedConfigId(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setWizardProgrammeId(null);
    setWizardKind("create");
    setStep(2);
    setLastCreatedConfigId(null);
  };

  const toggleJudge = (judgeId: string) => {
    setSelectedJudgeIds((prev) =>
      prev.includes(judgeId)
        ? prev.filter((id) => id !== judgeId)
        : [...prev, judgeId],
    );
  };

  const onInlineCreateJudge = async () => {
    const trimmedName = newJudgeName.trim();
    if (!trimmedName) {
      setInlineJudgeError(ERROR_MESSAGES.JUDGE_NAME_REQUIRED);
      return;
    }
    const duplicateJudge = judges.find(
      (judge) =>
        normalizeJudgeName(judge.name) === normalizeJudgeName(trimmedName),
    );
    if (duplicateJudge) {
      setInlineJudgeError(ERROR_MESSAGES.JUDGE_NAME_DUPLICATE);
      return;
    }
    setInlineJudgeError(null);
    try {
      await createJudge.mutateAsync({
        festivalId,
        data: {
          name: trimmedName,
          description: newJudgeDescription || undefined,
        },
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.judgment.dashboard(festivalId),
      });
      toast.success("Judge created.");
      setNewJudgeName("");
      setNewJudgeDescription("");
      setInlineJudgeError(null);
    } catch (error: any) {
      setInlineJudgeError(error?.message ?? ERROR_MESSAGES.DEFAULT);
    }
  };

  const onGenerate = () => {
    if (!wizardProgramme) return;
    startTransition(async () => {
      try {
        const result = await createJudgmentConfigurationAction({
          festivalId,
          programmeId: wizardProgramme.id,
          scoreLimit: POLICY_SCORE_LIMIT,
          judgeIds: selectedJudgeIds,
          judgingMode,
          manualPin: pinMode === "manual" ? manualPin : null,
          pinLength,
        });
        setGeneratedUrlByConfigId((prev) => ({
          ...prev,
          [result.configId]: result.judgeUrl,
        }));
        setGeneratedPinByConfigId((prev) => ({
          ...prev,
          [result.configId]: result.judgePin,
        }));
        setLastCreatedConfigId(result.configId);
        await queryClient.invalidateQueries({
          queryKey: queryKeys.judgment.dashboard(festivalId),
        });
        toast.success("Judgment link generated.");
        setStep(4);
      } catch (error: any) {
        toast.error(error?.message ?? "Failed to generate judgment link.");
      }
    });
  };

  const onRegenerate = (configId: string) => {
    startTransition(async () => {
      try {
        const result = await regenerateJudgmentConfigurationLinkAction({
          festivalId,
          configId,
          manualPin: pinMode === "manual" ? manualPin : null,
          pinLength,
        });
        setGeneratedUrlByConfigId((prev) => ({
          ...prev,
          [configId]: result.judgeUrl,
        }));
        setGeneratedPinByConfigId((prev) => ({
          ...prev,
          [configId]: result.judgePin,
        }));
        setLastCreatedConfigId(configId);
        await queryClient.invalidateQueries({
          queryKey: queryKeys.judgment.dashboard(festivalId),
        });
        toast.success("Judgment link regenerated.");
      } catch (error: any) {
        toast.error(error?.message ?? "Failed to regenerate link.");
      }
    });
  };

  const activeForWizard = wizardProgrammeId
    ? activeByProgrammeId.get(wizardProgrammeId)
    : undefined;
  const step4ConfigId = lastCreatedConfigId ?? activeForWizard?.id;
  const dialogGeneratedUrl = step4ConfigId
    ? generatedUrlByConfigId[step4ConfigId]
    : undefined;
  const dialogGeneratedPin = step4ConfigId
    ? generatedPinByConfigId[step4ConfigId]
    : undefined;

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
              const url = active
                ? generatedUrlByConfigId[active.id]
                : undefined;
              const pin = active
                ? generatedPinByConfigId[active.id]
                : undefined;
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
                          {active.judges.length !== 1 ? "s" : ""}
                          {!active.activeLinkId ? " · link closed" : ""}
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
                        <div className="grid grid-cols-2 gap-1 sm:flex sm:flex-wrap sm:gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-[10px] sm:h-7 sm:px-2.5 sm:text-xs"
                            onClick={() => {
                              if (!p.reportingDetails) return;
                              setReportedStudentsView({
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
                              : "View reported students"}
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-6 px-2 text-[10px] sm:h-7 sm:px-2.5 sm:text-xs"
                            onClick={async () => {
                              if (!url) {
                                toast.info(
                                  "Regenerate first to copy a fresh URL.",
                                );
                                return;
                              }
                              await navigator.clipboard.writeText(url);
                              toast.success("Link copied.");
                            }}
                            disabled={isPending}
                          >
                            <Copy className="mr-1 h-3 w-3" />
                            Copy
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-6 px-2 text-[10px] sm:h-7 sm:px-2.5 sm:text-xs"
                            onClick={async () => {
                              if (!pin) {
                                toast.info(
                                  "Regenerate first to copy a fresh PIN.",
                                );
                                return;
                              }
                              await navigator.clipboard.writeText(pin);
                              toast.success("PIN copied.");
                            }}
                            disabled={isPending}
                          >
                            <Copy className="mr-1 h-3 w-3" />
                            Copy PIN
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="h-6 px-2 text-[10px] sm:h-7 sm:px-2.5 sm:text-xs"
                            onClick={() => onRegenerate(active.id)}
                            disabled={isPending}
                          >
                            <RefreshCcw className="mr-1 h-3 w-3" />
                            Regenerate
                          </Button>
                        </div>
                        {url ? (
                          <div className="space-y-1 rounded-md border border-purple/40 bg-purple/10 px-2 py-1.5">
                            <p
                              className="truncate font-mono text-[9px] text-foreground sm:text-[10px]"
                              title={url}
                            >
                              {url}
                            </p>
                            {pin ? (
                              <p className="font-mono text-[10px] sm:text-[11px]">
                                <span className="text-muted-foreground">
                                  Pincode{" "}
                                </span>
                                <span className="font-semibold tracking-wider text-purple">
                                  {pin}
                                </span>
                              </p>
                            ) : null}
                          </div>
                        ) : null}
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
                            setReportedStudentsView({
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
                            <Link2 className="mr-1.5 h-3.5 w-3.5" />
                            Generate link
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
        open={Boolean(reportedStudentsView)}
        onOpenChange={(open) => !open && setReportedStudentsView(null)}
      >
        <DialogContent className="max-h-[min(90dvh,720px)] w-[calc(100%-1rem)] max-w-lg overflow-y-auto p-4 sm:w-[calc(100%-1.5rem)] sm:p-6">
          {reportedStudentsView ? (
            <>
              <DialogHeader>
                <DialogTitle>{reportedStudentsView.programmeName}</DialogTitle>
                <DialogDescription>
                  Stage {reportedStudentsView.details.stageName ?? "—"} ·{" "}
                  {reportedStudentsView.details.scheduleStart
                    ? formatCardDateTime(
                        reportedStudentsView.details.scheduleStart,
                      )
                    : "No schedule time"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <p className="text-sm text-muted-foreground">
                  {reportedStudentsView.programmeType === "GROUP"
                    ? `Reported teams (${reportedStudentsView.details.reportedCount})`
                    : `Reported students (${reportedStudentsView.details.reportedCount})`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Category: {reportedStudentsView.programmeCategory ?? "—"}
                </p>
                {reportedStudentsView.details.reportedEntries.length === 0 ? (
                  <Card>
                    <CardContent className="p-4 text-sm text-muted-foreground">
                      No reported student details available.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="max-h-[min(56vh,26rem)] space-y-1 overflow-y-auto rounded-lg border bg-card p-1.5">
                    {reportedStudentsView.details.reportedEntries.map(
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
                              {reportedStudentsView.programmeType === "GROUP"
                                ? `Team ${entry.codeLetter ?? "—"}`
                                : (entry.codeLetter ?? "—")}
                            </span>
                          </div>
                          {reportedStudentsView.programmeType === "GROUP" ? (
                            <div className="mt-1 text-[10px] leading-tight text-muted-foreground">
                              <p className="truncate">
                                Group ·{" "}
                                {reportedStudentsView.programmeCategory ?? "—"}
                              </p>
                            </div>
                          ) : (
                            <div className="mt-1 text-[10px] leading-tight text-muted-foreground">
                              <p className="truncate">
                                Individual · {entry.groupName ?? "—"} ·{" "}
                                {entry.categoryName ??
                                  reportedStudentsView.programmeCategory ??
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
              {wizardKind === "rejudge"
                ? "Rejudge — new link"
                : "Generate judge link"}
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
                "Select score limit and judges, then generate."
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-1 sm:space-y-4 sm:pt-2">
            <p className="text-xs text-muted-foreground sm:text-sm">
              Step {step - 1} of 3
            </p>

            {step === 2 ? (
              <div className="space-y-3">
                <div className="rounded-md border bg-muted/20 px-2.5 py-2">
                  <p className="text-[11px] text-muted-foreground">
                    Score limit is enforced by scoring policy.
                  </p>
                  <p className="mt-1 text-xs font-medium text-foreground">
                    Selected judges: {selectedJudgeIds.length}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Select judges
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
                  </div>
                </div>

                <div className="space-y-1.5 rounded-md border p-2 bg-muted/10">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Add judge
                  </Label>
                  <div className="grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center">
                    <Input
                      value={newJudgeName}
                      onChange={(e) => {
                        setNewJudgeName(e.target.value);
                        if (inlineJudgeError) setInlineJudgeError(null);
                      }}
                      placeholder="Name"
                      className="h-8 text-xs sm:text-sm"
                    />
                    <Input
                      value={newJudgeDescription}
                      onChange={(e) => {
                        setNewJudgeDescription(e.target.value);
                        if (inlineJudgeError) setInlineJudgeError(null);
                      }}
                      placeholder="Description (optional)"
                      className="h-8 text-xs sm:text-sm"
                    />
                    <Button
                      type="button"
                      className="h-8 px-2.5 text-xs"
                      onClick={onInlineCreateJudge}
                      disabled={!newJudgeName.trim() || createJudge.isPending}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  {inlineJudgeError ? (
                    <p className="text-xs text-destructive">
                      {inlineJudgeError}
                    </p>
                  ) : null}
                </div>

                <Button
                  className="h-8 text-xs w-full sm:h-9"
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={!canGenerate}
                >
                  Continue
                </Button>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-3">
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

                <div className="space-y-2 rounded-lg border border-border/70 bg-muted/10 p-2.5">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Pincode
                  </Label>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                    <Button
                      type="button"
                      variant={pinMode === "auto" ? "default" : "outline"}
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setPinMode("auto")}
                    >
                      Auto
                    </Button>
                    <Button
                      type="button"
                      variant={pinMode === "manual" ? "default" : "outline"}
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setPinMode("manual")}
                    >
                      Manual
                    </Button>
                    <select
                      className="col-span-2 h-8 rounded-md border bg-background px-2 text-xs sm:col-span-1 sm:h-9 sm:text-sm"
                      value={pinLength}
                      onChange={(e) =>
                        setPinLength(Number(e.target.value) as 4 | 5 | 6)
                      }
                    >
                      <option value={4}>4 digits</option>
                      <option value={5}>5 digits</option>
                      <option value={6}>6 digits</option>
                    </select>
                  </div>
                  {pinMode === "manual" ? (
                    <Input
                      value={manualPin}
                      onChange={(e) =>
                        setManualPin(
                          e.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                      placeholder="4–6 digit PIN"
                      inputMode="numeric"
                      className="h-8 text-xs sm:h-9 sm:text-sm"
                    />
                  ) : null}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    className="h-8 flex-1 text-xs sm:h-9 sm:flex-none"
                    type="button"
                    variant="outline"
                    onClick={() => setStep(2)}
                  >
                    Back
                  </Button>
                  <Button
                    className="h-8 flex-1 text-xs sm:h-9 sm:flex-none"
                    type="button"
                    onClick={onGenerate}
                    disabled={
                      !canGenerate ||
                      isPending ||
                      (pinMode === "manual" && !/^\d{4,6}$/.test(manualPin))
                    }
                  >
                    Generate link
                  </Button>
                </div>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Share the link and PIN with judges. Copy now — the PIN is not
                  stored in plain text.
                </p>
                {dialogGeneratedUrl ? (
                  <div className="space-y-2 rounded-lg border border-purple/40 bg-purple/10 p-3 text-xs shadow-sm">
                    <div className="rounded-md border border-purple/20 bg-background/70 p-2">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Judge link
                      </p>
                      <p className="mt-1 break-all font-mono text-[11px] text-foreground">
                        {dialogGeneratedUrl}
                      </p>
                    </div>
                    {dialogGeneratedPin ? (
                      <div className="rounded-md border border-purple/20 bg-background/70 p-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Pincode
                        </p>
                        <p className="mt-1 font-mono text-base font-bold tracking-widest text-purple">
                          {dialogGeneratedPin}
                        </p>
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-1.5 pt-1 sm:gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await navigator.clipboard.writeText(
                            dialogGeneratedUrl,
                          );
                          toast.success("Link copied.");
                        }}
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Copy link
                      </Button>
                      {dialogGeneratedPin ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            await navigator.clipboard.writeText(
                              dialogGeneratedPin,
                            );
                            toast.success("PIN copied.");
                          }}
                        >
                          Copy pincode
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="h-8 text-xs sm:h-9 sm:text-sm"
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const r = resetWizardForm();
                      setStep(r.step);
                      setSelectedJudgeIds(r.selectedJudgeIds);
                      setPinMode(r.pinMode);
                      setManualPin(r.manualPin);
                      setPinLength(r.pinLength);
                      setJudgingMode(r.judgingMode);
                      setLastCreatedConfigId(null);
                    }}
                  >
                    New link (same programme)
                  </Button>
                  <Button
                    className="h-8 text-xs sm:h-9 sm:text-sm"
                    type="button"
                    onClick={closeDialog}
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : null}
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
