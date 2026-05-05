"use client";

import { Copy, Link2, Plus, RefreshCcw } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryKeys } from "@/core/http/query-keys";
import { createJudgeAction } from "@/features/judges/actions/judge.actions";
import {
  createJudgmentConfigurationAction,
  getJudgmentDashboardDataAction,
  regenerateJudgmentConfigurationLinkAction,
} from "@/features/judgment/actions/judgment.actions";
import { Separator } from "@/components/ui/separator";

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
    reportedStudents: string[];
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
};
type JudgedProgrammeCard = {
  configId: string;
  programmeId: string;
  programmeName: string;
  programmeStatus: string;
  programmeCategory?: string | null;
  scoreLimit: number;
  judgingMode: "SINGLE" | "GROUP";
  totalJudgments: number;
  judges: Array<{ id: string; name: string; submittedAt: string | null }>;
  codeLetterRows: Array<{
    codeLetterId: string;
    code: string;
    average: number;
    judgeScores: Record<string, number>;
  }>;
};

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
  initialDashboardData: {
    judgeProgrammes: Programme[];
    rejudgeProgrammes: Programme[];
    judges: Judge[];
    activeConfigs: ActiveConfig[];
    judgedProgrammes: JudgedProgrammeCard[];
  };
}) {
  const POLICY_SCORE_LIMIT = 100;
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [judgedDetail, setJudgedDetail] = useState<JudgedProgrammeCard | null>(
    null,
  );
  const [reportedStudentsView, setReportedStudentsView] = useState<{
    programmeName: string;
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
  const [pinMode, setPinMode] = useState<"auto" | "manual">("auto");
  const [manualPin, setManualPin] = useState("");
  const [pinLength, setPinLength] = useState<4 | 5 | 6>(4);
  const [judgingMode, setJudgingMode] = useState<"SINGLE" | "GROUP">("GROUP");
  /** Config id from the most recent successful generate in this dialog (covers pre-refresh). */
  const [lastCreatedConfigId, setLastCreatedConfigId] = useState<string | null>(
    null,
  );
  const dashboardQuery = useQuery({
    queryKey: queryKeys.judgment.dashboard(festivalId),
    queryFn: () => getJudgmentDashboardDataAction(festivalId),
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

  const canGenerate = Boolean(wizardProgramme) && selectedJudgeIds.length > 0;

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

  const onInlineCreateJudge = () => {
    if (!newJudgeName.trim()) return;
    startTransition(async () => {
      try {
        await createJudgeAction(festivalId, {
          name: newJudgeName,
          description: newJudgeDescription || null,
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.judgment.dashboard(festivalId),
        });
        toast.success("Judge created.");
        setNewJudgeName("");
        setNewJudgeDescription("");
      } catch (error: any) {
        toast.error(error?.message ?? "Failed to create judge.");
      }
    });
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

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-lg font-bold tracking-tight sm:text-2xl">
          Judgment
        </h1>
      </div>

      <section className="space-y-2.5 sm:space-y-3">
        {judgeProgrammes.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No programmes are ready to judge right now.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
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
                  className="flex flex-col overflow-hidden rounded-lg border border-border/70 shadow-sm"
                >
                  <CardHeader className="space-y-1 p-3 pb-2 sm:p-4 sm:pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-[13px] font-semibold leading-snug line-clamp-2 sm:text-sm">
                        {p.name}
                      </CardTitle>
                      <Badge
                        variant="secondary"
                        className="shrink-0 text-[10px] font-normal"
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
                  <CardContent className="flex flex-1 flex-col gap-2.5 p-3 pt-0 sm:gap-3 sm:p-4 sm:pt-0">
                    {active ? (
                      <>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          {active.judgingMode} · {active.judges.length} judge
                          {active.judges.length !== 1 ? "s" : ""}
                          {!active.activeLinkId ? " · link closed" : ""}
                        </p>
                        {p.reportingDetails ? (
                          <div className="space-y-0.5 text-[11px] text-muted-foreground">
                            <p>Stage: {p.reportingDetails.stageName ?? "—"}</p>
                            <p>
                              Time:{" "}
                              {p.reportingDetails.scheduleStart
                                ? new Date(
                                    p.reportingDetails.scheduleStart,
                                  ).toLocaleString()
                                : "—"}
                              {p.reportingDetails.scheduleEnd
                                ? ` - ${new Date(
                                    p.reportingDetails.scheduleEnd,
                                  ).toLocaleString()}`
                                : ""}
                            </p>
                          </div>
                        ) : null}
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs sm:h-8 sm:px-3 sm:text-sm"
                            onClick={() => {
                              if (!p.reportingDetails) return;
                              setReportedStudentsView({
                                programmeName: p.name,
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
                            className="h-7 px-2 text-xs sm:h-8 sm:px-3 sm:text-sm"
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
                            <Copy className="mr-1 h-3.5 w-3.5" />
                            Copy
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-7 px-2 text-xs sm:h-8 sm:px-3 sm:text-sm"
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
                            <Copy className="mr-1 h-3.5 w-3.5" />
                            Copy PIN
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 px-2 text-xs sm:h-8 sm:px-3 sm:text-sm"
                            onClick={() => onRegenerate(active.id)}
                            disabled={isPending}
                          >
                            <RefreshCcw className="mr-1 h-3.5 w-3.5" />
                            Regenerate
                          </Button>
                        </div>
                        {url ? (
                          <div className="space-y-1 rounded-md border border-border/50 bg-muted/20 px-2 py-1.5">
                            <p
                              className="truncate font-mono text-[10px] text-muted-foreground"
                              title={url}
                            >
                              {url}
                            </p>
                            {pin ? (
                              <p className="font-mono text-[10px]">
                                PIN{" "}
                                <span className="font-semibold text-foreground">
                                  {pin}
                                </span>
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </>
                    ) : null}
                    <div className="mt-auto">
                      {!active ? (
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 w-full text-xs sm:h-9 sm:text-sm"
                          onClick={() => openWizardForProgramme(p.id, "create")}
                        >
                          <Link2 className="mr-1.5 h-3.5 w-3.5" />
                          Generate link
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <Separator />

      <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 ">
        <section className="space-y-2.5 sm:space-y-3">
          <h2 className="text-base font-semibold tracking-tight sm:text-lg">
            Rejudge
          </h2>
          {rejudgeProgrammes.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No judged programmes available for rejudge (published items
                never appear here).
              </CardContent>
            </Card>
          ) : (
            <div className="divide-y rounded-lg border border-border/70 bg-card">
              {rejudgeProgrammes.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <p className="truncate text-[13px] font-medium sm:text-sm">
                      {p.name}
                    </p>
                    <Badge
                      variant="outline"
                      className="shrink-0 text-[10px] font-normal"
                    >
                      {p.status}
                    </Badge>
                  </div>
                  {p.programmeCategory ? (
                    <p className="w-full text-[11px] text-muted-foreground sm:w-auto sm:mr-auto sm:pl-2">
                      {p.programmeCategory}
                    </p>
                  ) : null}
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
              ))}
            </div>
          )}
        </section>

        <section className="space-y-2.5 sm:space-y-3">
          <h2 className="text-base font-semibold tracking-tight sm:text-lg">
            Judged programmes
          </h2>
          {judgedProgrammes.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-sm text-muted-foreground">
                No submitted judging data yet.
              </CardContent>
            </Card>
          ) : (
            <div className="divide-y rounded-xl border bg-card">
              {judgedProgrammes.map((item) => (
                <div
                  key={item.configId}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm hover:bg-muted/40 sm:px-4 sm:py-3"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-[13px] font-medium leading-snug sm:text-sm">
                      {item.programmeName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.programmeStatus} · {item.judgingMode} ·{" "}
                      {item.programmeCategory ?? "No category"} ·{" "}
                      {item.totalJudgments} entries
                    </p>
                  </div>
                  <Button
                    className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setJudgedDetail(item)}
                  >
                    View details
                  </Button>
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
                    ? new Date(
                        reportedStudentsView.details.scheduleStart,
                      ).toLocaleString()
                    : "No schedule time"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <p className="text-sm text-muted-foreground">
                  {reportedStudentsView.programmeType === "GROUP"
                    ? `Reported teams (${reportedStudentsView.details.reportedCount})`
                    : `Reported students (${reportedStudentsView.details.reportedCount})`}
                </p>
                {reportedStudentsView.details.reportedStudents.length === 0 ? (
                  <Card>
                    <CardContent className="p-4 text-sm text-muted-foreground">
                      No reported student details available.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="divide-y rounded-lg border bg-card">
                    {reportedStudentsView.details.reportedStudents.map(
                      (studentLabel) => (
                        <div
                          key={studentLabel}
                          className="px-3 py-2 text-sm text-foreground"
                        >
                          {studentLabel}
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

          <div className="space-y-4 pt-1 sm:space-y-5 sm:pt-2">
            <p className="text-xs text-muted-foreground sm:text-sm">
              Step {step - 1} of 3
            </p>

            {step === 2 ? (
              <div className="space-y-3 sm:space-y-4">
                <p className="text-xs text-muted-foreground">
                  Score limit is enforced by scoring policy.
                </p>
                <div className="space-y-2">
                  <Label>Select judges</Label>
                  <div className="grid max-h-[220px] gap-2 overflow-y-auto sm:max-h-[280px]">
                    {judges.map((j) => (
                      <label
                        key={j.id}
                        className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs sm:text-sm"
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

                <div className="space-y-2 rounded-md border p-2.5 sm:p-3">
                  <Label>Add judge</Label>
                  <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                    <Input
                      value={newJudgeName}
                      onChange={(e) => setNewJudgeName(e.target.value)}
                      placeholder="Judge name"
                    />
                    <Input
                      value={newJudgeDescription}
                      onChange={(e) => setNewJudgeDescription(e.target.value)}
                      placeholder="Description (optional)"
                    />
                    <Button
                      type="button"
                      className="h-8 text-xs sm:h-9 sm:text-sm"
                      onClick={onInlineCreateJudge}
                      disabled={!newJudgeName.trim() || isPending}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>

                <Button
                  className="h-8 text-xs sm:h-9 sm:text-sm"
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={!canGenerate}
                >
                  Continue to mode
                </Button>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-3 sm:space-y-4">
                <div className="space-y-2 rounded-md border p-2.5 sm:p-3">
                  <Label>Judging mode</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      className={`rounded-md border px-3 py-2 text-left text-sm ${judgingMode === "SINGLE" ? "border-primary bg-primary/5" : ""}`}
                      onClick={() => setJudgingMode("SINGLE")}
                    >
                      <p className="font-medium">Single</p>
                      <p className="text-xs text-muted-foreground">
                        Each judge scores independently.
                      </p>
                    </button>
                    <button
                      type="button"
                      className={`rounded-md border px-3 py-2 text-left text-sm ${judgingMode === "GROUP" ? "border-primary bg-primary/5" : ""}`}
                      onClick={() => setJudgingMode("GROUP")}
                    >
                      <p className="font-medium">Group</p>
                      <p className="text-xs text-muted-foreground">
                        Shared screen, all judges at once.
                      </p>
                    </button>
                  </div>
                </div>

                <div className="space-y-2 rounded-md border p-2.5 sm:p-3">
                  <Label>PIN</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={pinMode === "auto" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPinMode("auto")}
                    >
                      Auto
                    </Button>
                    <Button
                      type="button"
                      variant={pinMode === "manual" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPinMode("manual")}
                    >
                      Manual
                    </Button>
                    <select
                      className="h-9 rounded-md border bg-background px-2 text-sm"
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
                    />
                  ) : null}
                </div>

                <div className="flex gap-2">
                  <Button
                    className="h-8 text-xs sm:h-9 sm:text-sm"
                    type="button"
                    variant="outline"
                    onClick={() => setStep(2)}
                  >
                    Back
                  </Button>
                  <Button
                    className="h-8 text-xs sm:h-9 sm:text-sm"
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
              <div className="space-y-3 sm:space-y-4">
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Share the link and PIN with judges. Copy now — the PIN is not
                  stored in plain text.
                </p>
                {dialogGeneratedUrl ? (
                  <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-xs">
                    <p className="break-all text-muted-foreground">
                      {dialogGeneratedUrl}
                    </p>
                    {dialogGeneratedPin ? (
                      <p className="font-mono">
                        PIN:{" "}
                        <span className="font-semibold text-foreground">
                          {dialogGeneratedPin}
                        </span>
                      </p>
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
                          Copy PIN
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
                          ? ` · ${new Date(j.submittedAt).toLocaleString()}`
                          : " · not submitted"}
                      </span>
                    ))}
                  </div>
                </div>
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
                      {judgedDetail.codeLetterRows.map((row) => (
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
