"use client";

import { CheckCircle2, Circle, UserRound, Users2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/core/utils/cn";
import {
  previewJudgeSubmissionSummaryAction,
  submitGroupJudgeScoresAction,
  submitJudgeScoresAction,
} from "@/features/judgment/actions/judgment.actions";

export type StagePortalLivePayload = {
  configId: string;
  scoreLimit: number;
  judgingMode: "SINGLE" | "GROUP";
  programme: { id: string; name: string; type: "INDIVIDUAL" | "GROUP" };
  judges: Array<{ id: string; name: string }>;
  codeLetters: Array<{ id: string; code: string }>;
  existingScores: Array<{
    judgeId: string;
    codeLetterId: string;
    score: number;
  }>;
};

type SubmissionSummary =
  | {
      kind: "SINGLE";
      judgeName: string;
      rows: Array<{ code: string; score: number }>;
    }
  | {
      kind: "GROUP";
      rows: Array<{
        code: string;
        byJudge: Array<{ name: string; score: number }>;
      }>;
    };

type SubmissionPhase = "idle" | "review" | "summary";
type PolicyResultRow = {
  codeLetterId: string;
  code: string;
  points: number;
  grade: string | null;
  awardPoints: number;
};

function scoreCellErrorLabel(
  raw: string | undefined,
  limit: number,
): "Required" | "Invalid" | null {
  if (raw === undefined || raw === "" || raw === "-" || raw === ".")
    return "Required";
  const v = Number(raw);
  if (!Number.isFinite(v) || v < 0 || v > limit) return "Invalid";
  return null;
}

function isFieldFilled(raw: string | undefined): boolean {
  return !(raw === undefined || raw === "" || raw === "-" || raw === ".");
}

function judgeHasAllCodes(
  judgeId: string,
  codeLetters: Array<{ id: string }>,
  existingScores: Array<{ judgeId: string; codeLetterId: string }>,
) {
  return codeLetters.every((c) =>
    existingScores.some(
      (s) => s.judgeId === judgeId && s.codeLetterId === c.id,
    ),
  );
}

function otherJudgesScoresSummary(
  codeLetterId: string,
  selfId: string,
  judges: Array<{ id: string; name: string }>,
  scoresByKey: Record<string, string>,
): string | null {
  const parts: string[] = [];
  for (const j of judges) {
    if (j.id === selfId) continue;
    const raw = scoresByKey[`${j.id}:${codeLetterId}`];
    if (raw === undefined || raw === "") continue;
    const v = Number(raw);
    if (!Number.isFinite(v)) continue;
    const short = j.name.trim().split(/\s+/)[0] ?? j.name;
    parts.push(`${short}: ${raw}`);
  }
  return parts.length ? parts.join(" · ") : null;
}

function ScoreField({
  value,
  onChange,
  disabled,
  max,
  invalid,
  compact,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  max: number;
  invalid?: boolean;
  compact?: boolean;
}) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      min={0}
      max={max}
      step={0.5}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-invalid={invalid}
      className={cn(
        "tabular-nums transition-[box-shadow,colors] focus-visible:ring-2",
        compact
          ? "h-11 w-full min-w-0 max-w-full text-center text-base font-semibold sm:max-w-[5.5rem]"
          : "h-12 w-full min-w-0 max-w-full text-center text-base font-semibold sm:max-w-[6.5rem]",
        disabled &&
          "cursor-not-allowed border-transparent bg-muted/50 text-muted-foreground",
        invalid && !disabled && "border-destructive/80 ring-destructive/20",
      )}
    />
  );
}

function SubmissionSummaryView({
  stageName,
  programmeName,
  variant,
  onContinue,
}: {
  stageName: string;
  programmeName: string;
  variant: "complete" | "partial";
  onContinue: () => void;
}) {
  const isPartial = variant === "partial";
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 py-6">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
          <CheckCircle2 className="h-8 w-8" aria-hidden />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {stageName}
        </p>
        <h1 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
          {programmeName}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isPartial ? (
            <>
              Thanks! Your scores are saved. Other judges still need to
              submit.
            </>
          ) : (
            <>Thank you! This programme's judgment has been submitted.</>
          )}
        </p>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-2 text-center">
          <CardTitle className="text-base">Submission received</CardTitle>
          <CardDescription>
            {isPartial ? (
              <>The programme stays live until every judge has submitted.</>
            ) : (
              <>This programme has left the live queue.</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="h-11 w-full sm:w-auto"
            size="lg"
            onClick={onContinue}
          >
            Back to portal
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function SubmissionReviewView({
  stageName,
  programmeName,
  summary,
  scoreLimit,
  isPending,
  submitError,
  policyRows,
  onEdit,
  onConfirm,
}: {
  stageName: string;
  programmeName: string;
  summary: SubmissionSummary;
  scoreLimit: number;
  isPending: boolean;
  submitError: string | null;
  policyRows: PolicyResultRow[];
  onEdit: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 py-4 sm:gap-6">
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {stageName}
        </p>
        <h1 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
          Review before submit
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Confirm your scores below (max {scoreLimit} pts per score), or go
          back to edit before final submission.
        </p>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="space-y-1 pb-2 sm:pb-3">
          <CardTitle className="text-base">{programmeName}</CardTitle>
          <CardDescription>
            {summary.kind === "SINGLE" ? (
              <>Judge: {summary.judgeName}</>
            ) : (
              <>Full panel — all judges and code letters</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          {summary.kind === "SINGLE" ? (
            <ul className="divide-y rounded-md border">
              {summary.rows.map((r) => (
                <li
                  key={r.code}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                >
                  <span className="font-mono font-semibold">{r.code}</span>
                  <span className="tabular-nums font-medium">{r.score}</span>
                </li>
              ))}
            </ul>
          ) : (
            <>
              <div className="space-y-2 sm:hidden">
                {summary.rows.map((row) => (
                  <div
                    key={row.code}
                    className="rounded-md border bg-background px-3 py-2.5"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Code
                      </p>
                      <p className="font-mono text-base font-semibold">
                        {row.code}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      {row.byJudge.map((cell) => (
                        <div
                          key={cell.name}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="truncate text-muted-foreground">
                            {cell.name}
                          </span>
                          <span className="tabular-nums font-medium">
                            {cell.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden overflow-x-auto rounded-md border sm:block">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 font-medium">Code</th>
                      {summary.rows[0]?.byJudge.map((j) => (
                        <th
                          key={j.name}
                          className="whitespace-nowrap px-3 py-2 font-medium"
                        >
                          {j.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {summary.rows.map((row) => (
                      <tr key={row.code} className="border-t">
                        <td className="px-3 py-2 font-mono font-semibold">
                          {row.code}
                        </td>
                        {row.byJudge.map((cell) => (
                          <td key={cell.name} className="px-3 py-2 tabular-nums">
                            {cell.score}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <div className="space-y-2 rounded-md border bg-muted/20 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Estimated result summary
            </p>
            <div className="space-y-1.5 rounded-md border bg-background p-2">
              {policyRows.map((row) => (
                <div
                  key={row.codeLetterId}
                  className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="rounded border bg-muted/30 px-2 py-0.5 font-mono text-xs font-semibold">
                      {row.code}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Grade:{" "}
                      <span className="font-medium text-foreground">
                        {row.grade ?? "No grade"}
                      </span>
                    </span>
                  </div>
                  <div className="shrink-0 rounded-md border border-primary/40 bg-primary/10 px-3 py-1 text-right">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-primary/90">
                      Normalized
                    </p>
                    <p className="tabular-nums text-sm font-semibold text-primary">
                      {row.points}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {submitError ? (
            <p className="text-xs font-medium text-destructive">
              {submitError}
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="h-11 w-full sm:w-auto"
              onClick={onEdit}
              disabled={isPending}
            >
              Edit scores
            </Button>
            <Button
              className="h-11 w-full sm:w-auto"
              onClick={onConfirm}
              disabled={isPending}
            >
              {isPending ? "Submitting..." : "Confirm and submit"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function StagePortalScoringClient({
  stageName,
  payload,
  onDone,
}: {
  stageName: string;
  payload: StagePortalLivePayload;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [submissionPhase, setSubmissionPhase] =
    useState<SubmissionPhase>("idle");
  const [summaryVariant, setSummaryVariant] = useState<"complete" | "partial">(
    "complete",
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reviewSummary, setReviewSummary] = useState<SubmissionSummary | null>(
    null,
  );
  const [reviewPolicyRows, setReviewPolicyRows] = useState<PolicyResultRow[]>(
    [],
  );
  const [selectedJudgeId, setSelectedJudgeId] = useState<string>(
    payload.judgingMode === "SINGLE" && payload.judges.length === 1
      ? payload.judges[0]!.id
      : "",
  );
  const [scoresByKey, setScoresByKey] = useState<Record<string, string>>(
    () => {
      const out: Record<string, string> = {};
      for (const row of payload.existingScores) {
        out[`${row.judgeId}:${row.codeLetterId}`] = String(row.score);
      }
      return out;
    },
  );

  const everyCellValidGroup = useMemo(() => {
    return payload.codeLetters.every((c) =>
      payload.judges.every((j) => {
        const raw = scoresByKey[`${j.id}:${c.id}`];
        if (!isFieldFilled(raw)) return false;
        const v = Number(raw);
        return Number.isFinite(v) && v >= 0 && v <= payload.scoreLimit;
      }),
    );
  }, [payload.judges, payload.codeLetters, payload.scoreLimit, scoresByKey]);

  const selectedJudgeRowComplete = useMemo(() => {
    if (payload.judgingMode !== "SINGLE" || !selectedJudgeId) return false;
    return payload.codeLetters.every((c) => {
      const raw = scoresByKey[`${selectedJudgeId}:${c.id}`];
      if (!isFieldFilled(raw)) return false;
      const v = Number(raw);
      return Number.isFinite(v) && v >= 0 && v <= payload.scoreLimit;
    });
  }, [
    payload.judgingMode,
    selectedJudgeId,
    payload.codeLetters,
    payload.scoreLimit,
    scoresByKey,
  ]);

  const canSubmit = useMemo(() => {
    if (payload.judgingMode === "SINGLE") {
      if (!selectedJudgeId) return false;
      if (payload.codeLetters.length === 0) return false;
      return selectedJudgeRowComplete;
    }
    if (payload.codeLetters.length === 0 || payload.judges.length === 0)
      return false;
    return everyCellValidGroup;
  }, [
    payload.judgingMode,
    selectedJudgeId,
    selectedJudgeRowComplete,
    everyCellValidGroup,
    payload.codeLetters.length,
    payload.judges.length,
  ]);

  const submitValidationMessage = useMemo(() => {
    if (payload.judgingMode === "SINGLE") {
      if (!selectedJudgeId) return "Select your judge name to continue.";
      const total = payload.codeLetters.length;
      const filled = payload.codeLetters.filter((c) =>
        isFieldFilled(scoresByKey[`${selectedJudgeId}:${c.id}`]),
      ).length;
      if (filled < total) {
        return `Complete all scores before preview (${filled}/${total} filled).`;
      }
      return null;
    }
    let total = 0;
    let filled = 0;
    for (const c of payload.codeLetters) {
      for (const j of payload.judges) {
        total += 1;
        if (isFieldFilled(scoresByKey[`${j.id}:${c.id}`])) filled += 1;
      }
    }
    if (filled < total) {
      return `Complete all panel scores before preview (${filled}/${total} filled).`;
    }
    return null;
  }, [
    payload.judgingMode,
    payload.codeLetters,
    payload.judges,
    selectedJudgeId,
    scoresByKey,
  ]);

  const singleShowSelectedCellHints =
    payload.judgingMode === "SINGLE" &&
    Boolean(selectedJudgeId) &&
    !selectedJudgeRowComplete;
  const groupShowCellHints =
    payload.judgingMode === "GROUP" && !everyCellValidGroup;

  const judgesDoneCount = useMemo(() => {
    if (payload.judgingMode !== "SINGLE" || payload.judges.length <= 1)
      return null;
    let n = 0;
    for (const j of payload.judges) {
      if (judgeHasAllCodes(j.id, payload.codeLetters, payload.existingScores))
        n += 1;
    }
    return n;
  }, [
    payload.judgingMode,
    payload.judges,
    payload.codeLetters,
    payload.existingScores,
  ]);

  const progress = useMemo(() => {
    const limit = payload.scoreLimit;
    if (payload.judgingMode === "SINGLE") {
      const jid =
        payload.judges.length === 1 ? payload.judges[0]!.id : selectedJudgeId;
      if (!jid) {
        return {
          pct: 0,
          sub: `0 / ${payload.codeLetters.length} codes — pick your name`,
        };
      }
      const valid = payload.codeLetters.filter((c) => {
        const raw = scoresByKey[`${jid}:${c.id}`];
        if (!isFieldFilled(raw)) return false;
        const v = Number(raw);
        return Number.isFinite(v) && v >= 0 && v <= limit;
      }).length;
      const total = payload.codeLetters.length;
      return {
        pct: total ? Math.round((valid / total) * 100) : 0,
        sub: `${valid} / ${total} fields valid`,
      };
    }
    let valid = 0;
    let total = 0;
    for (const c of payload.codeLetters) {
      for (const j of payload.judges) {
        total += 1;
        const raw = scoresByKey[`${j.id}:${c.id}`];
        if (!isFieldFilled(raw)) continue;
        const v = Number(raw);
        if (Number.isFinite(v) && v >= 0 && v <= limit) valid += 1;
      }
    }
    return {
      pct: total ? Math.round((valid / total) * 100) : 0,
      sub: `${valid} / ${total} fields valid`,
    };
  }, [
    payload.judgingMode,
    payload.judges,
    payload.codeLetters,
    payload.scoreLimit,
    selectedJudgeId,
    scoresByKey,
  ]);

  const onScoreFieldChange = (key: string, raw: string, max: number) => {
    if (submitError) setSubmitError(null);
    if (raw === "" || raw === "-" || raw === ".") {
      setScoresByKey((prev) => ({ ...prev, [key]: raw }));
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > max) {
      setScoresByKey((prev) => ({ ...prev, [key]: raw }));
      return;
    }
    setScoresByKey((prev) => ({ ...prev, [key]: raw }));
  };

  const buildReviewSummary = (): SubmissionSummary | null => {
    if (payload.judgingMode === "SINGLE") {
      const judgeName =
        payload.judges.find((j) => j.id === selectedJudgeId)?.name ?? "Judge";
      const rows = payload.codeLetters.map((c) => ({
        code: c.code,
        score: Number(scoresByKey[`${selectedJudgeId}:${c.id}`]),
      }));
      return { kind: "SINGLE", judgeName, rows };
    }
    return {
      kind: "GROUP",
      rows: payload.codeLetters.map((c) => ({
        code: c.code,
        byJudge: payload.judges.map((j) => ({
          name: j.name,
          score: Number(scoresByKey[`${j.id}:${c.id}`]),
        })),
      })),
    };
  };

  const humanizeSubmitError = (message: string) => {
    const normalized = message.toLowerCase();
    if (
      normalized.includes("scoring policy has no matching grade rule") ||
      normalized.includes("scoring policy has no matching award rule")
    ) {
      return "Scores were saved, but result mapping failed because the scoring policy does not cover this case yet. Ask an admin to update the scoring policy and submit again.";
    }
    return message;
  };

  const onStartReview = () => {
    setSubmitError(null);
    if (!canSubmit) {
      setSubmitError(
        submitValidationMessage ??
          `Please complete all required valid scores (0-${payload.scoreLimit}) before preview.`,
      );
      return;
    }
    const summary = buildReviewSummary();
    if (!summary) {
      setSubmitError("Unable to build review summary. Please try again.");
      return;
    }
    startTransition(async () => {
      try {
        const scoresByJudgeId: Record<string, Record<string, number>> = {};
        if (payload.judgingMode === "SINGLE") {
          scoresByJudgeId[selectedJudgeId] = {};
          for (const c of payload.codeLetters) {
            scoresByJudgeId[selectedJudgeId]![c.id] = Number(
              scoresByKey[`${selectedJudgeId}:${c.id}`],
            );
          }
        } else {
          for (const j of payload.judges) {
            scoresByJudgeId[j.id] = {};
            for (const c of payload.codeLetters) {
              scoresByJudgeId[j.id]![c.id] = Number(
                scoresByKey[`${j.id}:${c.id}`],
              );
            }
          }
        }
        const preview = await previewJudgeSubmissionSummaryAction({
          configId: payload.configId,
          scoresByJudgeId,
        });
        setReviewPolicyRows(preview.rows);
        setReviewSummary(summary);
        setSubmissionPhase("review");
      } catch (error: any) {
        setSubmitError(
          humanizeSubmitError(
            error?.message ?? "Failed to compute policy summary for review.",
          ),
        );
      }
    });
  };

  const onConfirmSubmit = () => {
    if (submissionPhase !== "review") return;
    startTransition(async () => {
      try {
        if (payload.judgingMode === "SINGLE") {
          const scoresByCodeLetterId: Record<string, number> = {};
          for (const c of payload.codeLetters) {
            scoresByCodeLetterId[c.id] = Number(
              scoresByKey[`${selectedJudgeId}:${c.id}`],
            );
          }
          const res = await submitJudgeScoresAction({
            configId: payload.configId,
            judgeId: selectedJudgeId,
            scoresByCodeLetterId,
          });
          setSummaryVariant(res.judgmentComplete ? "complete" : "partial");
        } else {
          const scoresByJudgeId: Record<string, Record<string, number>> = {};
          for (const j of payload.judges) {
            scoresByJudgeId[j.id] = {};
            for (const c of payload.codeLetters) {
              scoresByJudgeId[j.id]![c.id] = Number(
                scoresByKey[`${j.id}:${c.id}`],
              );
            }
          }
          await submitGroupJudgeScoresAction({
            configId: payload.configId,
            scoresByJudgeId,
          });
          setSummaryVariant("complete");
        }
        setSubmissionPhase("summary");
      } catch (error: any) {
        const message = humanizeSubmitError(
          error?.message ?? "Failed to submit scores.",
        );
        setSubmitError(message);
        toast.error(message);
      }
    });
  };

  if (submissionPhase === "review" && reviewSummary) {
    return (
      <SubmissionReviewView
        stageName={stageName}
        programmeName={payload.programme.name}
        summary={reviewSummary}
        scoreLimit={payload.scoreLimit}
        isPending={isPending}
        submitError={submitError}
        policyRows={reviewPolicyRows}
        onEdit={() => {
          setSubmissionPhase("idle");
          setSubmitError(null);
          setReviewSummary(null);
          setReviewPolicyRows([]);
        }}
        onConfirm={onConfirmSubmit}
      />
    );
  }

  if (submissionPhase === "summary") {
    return (
      <SubmissionSummaryView
        stageName={stageName}
        programmeName={payload.programme.name}
        variant={summaryVariant}
        onContinue={onDone}
      />
    );
  }

  const isGroup = payload.judgingMode === "GROUP";
  const modeLabel = isGroup ? "Group panel" : "Separate judges";
  const ModeIcon = isGroup ? Users2 : UserRound;
  const progressPct = Math.min(100, Math.max(0, progress.pct));

  return (
    <div className="space-y-6 pb-28 sm:space-y-8">
      <header className="space-y-3 sm:space-y-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {stageName}
          </p>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">
            {payload.programme.name}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-md font-normal">
            Max {payload.scoreLimit} pts
          </Badge>
          <Badge variant="outline" className="rounded-md font-normal">
            {payload.programme.type === "GROUP"
              ? "Group programme"
              : "Individual programme"}
          </Badge>
          <Badge
            variant="outline"
            className="gap-1.5 rounded-md border-primary/25 bg-primary/[0.06] pr-2.5 font-normal text-primary"
          >
            <ModeIcon className="h-3.5 w-3.5" aria-hidden />
            {modeLabel}
          </Badge>
        </div>
      </header>

      <Separator className="opacity-60" />

      <Card className="border-primary/20 bg-primary/[0.04] sm:hidden">
        <CardContent className="space-y-2 p-4">
          <div className="flex items-center justify-between gap-2 text-xs font-medium">
            <span className="text-muted-foreground">Progress</span>
            <span className="tabular-nums text-foreground">
              {progress.sub}
            </span>
          </div>
          <Progress value={progressPct} className="h-2.5" />
        </CardContent>
      </Card>

      {payload.judgingMode === "SINGLE" && payload.judges.length > 1 ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">
                Who are you?
              </h2>
              <p className="text-xs text-muted-foreground">
                Tap your name — only your column becomes editable.
              </p>
            </div>
            {judgesDoneCount !== null ? (
              <p className="text-xs font-medium text-muted-foreground">
                Finished: {judgesDoneCount}/{payload.judges.length} judges
              </p>
            ) : null}
          </div>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {payload.judges.map((j) => {
              const done = judgeHasAllCodes(
                j.id,
                payload.codeLetters,
                payload.existingScores,
              );
              const active = selectedJudgeId === j.id;
              return (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => setSelectedJudgeId(j.id)}
                  className={cn(
                    "flex min-w-[10rem] shrink-0 flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition-all active:scale-[0.99]",
                    active
                      ? "border-primary bg-primary/[0.08] shadow-sm ring-2 ring-primary/20"
                      : "border-border/80 bg-card hover:border-primary/30 hover:bg-muted/30",
                  )}
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">
                      {j.name}
                    </span>
                    {done ? (
                      <CheckCircle2
                        className="h-4 w-4 shrink-0 text-emerald-600"
                        aria-label="Submitted"
                      />
                    ) : (
                      <Circle
                        className="h-4 w-4 shrink-0 text-muted-foreground/50"
                        aria-hidden
                      />
                    )}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {done ? "Submitted" : "Pending"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {payload.judgingMode === "SINGLE" ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold tracking-tight">Scores</h2>
            <span className="text-xs tabular-nums text-muted-foreground">
              {progress.sub}
            </span>
          </div>
          <div className="space-y-3">
            {payload.codeLetters.map((c) => {
              const effectiveJudgeId =
                payload.judges.length === 1
                  ? payload.judges[0]!.id
                  : selectedJudgeId;
              const fieldKey = effectiveJudgeId
                ? `${effectiveJudgeId}:${c.id}`
                : "";
              const others =
                effectiveJudgeId && payload.judges.length > 1
                  ? otherJudgesScoresSummary(
                      c.id,
                      effectiveJudgeId,
                      payload.judges,
                      scoresByKey,
                    )
                  : null;
              const cellErr =
                singleShowSelectedCellHints && effectiveJudgeId
                  ? scoreCellErrorLabel(
                      scoresByKey[`${effectiveJudgeId}:${c.id}`],
                      payload.scoreLimit,
                    )
                  : null;
              return (
                <Card
                  key={c.id}
                  className={cn(
                    "border-border/70 transition-shadow",
                    cellErr && "ring-1 ring-destructive/25",
                  )}
                >
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Code letter
                      </p>
                      <p className="font-mono text-lg font-semibold tracking-tight sm:text-xl">
                        {c.code}
                      </p>
                      {others ? (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground/80">
                            Others:{" "}
                          </span>
                          {others}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex w-full flex-col items-stretch gap-1 sm:w-auto sm:items-end">
                      <ScoreField
                        value={fieldKey ? (scoresByKey[fieldKey] ?? "") : ""}
                        onChange={(v) => {
                          if (!effectiveJudgeId) return;
                          onScoreFieldChange(
                            `${effectiveJudgeId}:${c.id}`,
                            v,
                            payload.scoreLimit,
                          );
                        }}
                        disabled={isPending || !effectiveJudgeId}
                        max={payload.scoreLimit}
                        invalid={Boolean(cellErr)}
                      />
                      {cellErr ? (
                        <p className="text-[11px] font-medium text-destructive sm:text-right">
                          {cellErr}
                        </p>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold tracking-tight">
              Panel scores
            </h2>
            <span className="text-xs tabular-nums text-muted-foreground">
              {progress.sub}
            </span>
          </div>
          <div className="space-y-4">
            {payload.codeLetters.map((c) => (
              <Card key={c.id} className="border-border/70">
                <CardHeader className="space-y-1 pb-2 pt-4 sm:pt-5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Code letter
                  </p>
                  <CardTitle className="font-mono text-lg font-semibold sm:text-xl">
                    {c.code}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4 pt-0 sm:pb-5">
                  <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3">
                    {payload.judges.map((j) => {
                      const key = `${j.id}:${c.id}`;
                      const err = groupShowCellHints
                        ? scoreCellErrorLabel(
                            scoresByKey[key],
                            payload.scoreLimit,
                          )
                        : null;
                      return (
                        <div
                          key={j.id}
                          className={cn(
                            "flex min-w-0 flex-col gap-1.5 rounded-lg border border-border/60 bg-muted/20 p-3",
                            err && "ring-1 ring-destructive/30",
                          )}
                        >
                          <span className="truncate text-xs font-medium text-muted-foreground">
                            {j.name}
                          </span>
                          <ScoreField
                            compact
                            value={scoresByKey[key] ?? ""}
                            onChange={(v) =>
                              onScoreFieldChange(key, v, payload.scoreLimit)
                            }
                            disabled={isPending}
                            max={payload.scoreLimit}
                            invalid={Boolean(err)}
                          />
                          {err ? (
                            <p className="text-[11px] font-medium text-destructive">
                              {err}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <div
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/95 px-2 py-2 backdrop-blur-md supports-[backdrop-filter]:bg-background/75 sm:px-3"
        style={{
          paddingBottom: "max(0.65rem, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 rounded-xl border border-border/50 bg-background/90 p-2 shadow-sm sm:p-2.5 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <div className="hidden min-w-0 flex-1 space-y-1.5 sm:block">
            <Progress value={progressPct} className="h-2" />
            {submitError ? (
              <p className="text-[10px] font-medium leading-tight text-destructive sm:text-xs">
                {submitError}
              </p>
            ) : null}
            {!submitError && !canSubmit ? (
              <p className="text-[10px] font-medium leading-tight text-amber-600 dark:text-amber-400 sm:text-xs">
                {submitValidationMessage ??
                  "Complete scoring on all fields to preview submit."}
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="h-10 sm:h-11" onClick={onDone}>
              Back
            </Button>
            <Button
              size="lg"
              className="h-10 w-full shrink-0 text-xs sm:h-11 sm:min-w-[12rem] sm:text-sm lg:w-auto"
              onClick={onStartReview}
              disabled={
                !canSubmit ||
                isPending ||
                (payload.judgingMode === "SINGLE" &&
                  payload.judges.length > 1 &&
                  !selectedJudgeId)
              }
            >
              {isPending
                ? "Submitting…"
                : isGroup
                  ? "Preview panel submit"
                  : "Preview submit"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
