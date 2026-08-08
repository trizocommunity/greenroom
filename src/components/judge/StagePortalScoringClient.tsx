"use client";

import {
  CheckCircle2,
  Circle,
  MessageSquare,
  MessageSquarePlus,
  UserRound,
  Users2,
  UserX,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useMarkCodeLetterAbsence } from "@/api/client/server-actions";
import { StatusPill } from "@/components/app/AppSection";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { humanizeError } from "@/core/errors/humanize";
import { cn } from "@/core/utils/cn";
import {
  previewJudgeSubmissionSummaryAction,
  submitGroupJudgeScoresAction,
  submitJudgeScoresAction,
} from "@/features/judgement/actions/judgement.actions";
import { toast } from "@/lib/toast";

function AbsentToggle({
  isAbsent,
  disabled,
  onToggle,
}: {
  isAbsent: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      variant="outline"
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        "mt-1 h-auto gap-1.5 px-2 py-1 text-[11px] [&_svg]:size-3.5",
        isAbsent
          ? "border-warning/50 bg-warning/10 text-warning hover:bg-warning/20"
          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <UserX aria-hidden />
      {isAbsent ? "Absent — tap to restore" : "Mark absent"}
    </Button>
  );
}

export type StagePortalLivePayload = {
  configId: string;
  scoreLimit: number;
  judgingMode: "SINGLE" | "GROUP";
  programme: { id: string; name: string; type: "INDIVIDUAL" | "GROUP" };
  judges: Array<{ id: string; name: string }>;
  codeLetters: Array<{ id: string; code: string; isAbsent: boolean }>;
  existingScores: Array<{
    judgeId: string;
    codeLetterId: string;
    score: number;
    remark?: string | null;
  }>;
  /** Per-judge completion (all active codes scored) — drives "You've submitted". */
  judgeCompletion?: Record<string, boolean>;
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
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center py-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
        <CheckCircle2 className="h-8 w-8" aria-hidden />
      </div>

      <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {stageName}
      </p>
      <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-heading">
        {programmeName}
      </h1>

      <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
        {isPartial
          ? "Your scores are saved. The programme stays live until every judge has submitted."
          : "Judgement submitted. This programme has left the live queue."}
      </p>

      <Button
        className="mt-8 h-12 w-full rounded-full text-base font-medium shadow-primary-glow"
        size="lg"
        onClick={onContinue}
      >
        Back to portal
      </Button>
    </div>
  );
}

function SubmissionReviewView({
  stageName,
  programmeName,
  judgingMode,
  judges,
  codeLetters,
  scoresByKey,
  remarksByKey,
  onRemarkChange,
  policyRows,
  isPending,
  submitError,
  onEdit,
  onConfirm,
}: {
  stageName: string;
  programmeName: string;
  judgingMode: "SINGLE" | "GROUP";
  judges: Array<{ id: string; name: string }>;
  codeLetters: Array<{ id: string; code: string }>;
  scoresByKey: Record<string, string>;
  remarksByKey: Record<string, string>;
  onRemarkChange: (judgeId: string, codeLetterId: string, v: string) => void;
  policyRows: PolicyResultRow[];
  isPending: boolean;
  submitError: string | null;
  onEdit: () => void;
  onConfirm: () => void;
}) {
  const [remarkCodeId, setRemarkCodeId] = useState<string | null>(null);
  const policyByCode = new Map(policyRows.map((r) => [r.codeLetterId, r]));
  const drawerCode = codeLetters.find((c) => c.id === remarkCodeId) ?? null;

  const remarkCount = (codeLetterId: string) =>
    judges.filter((j) => (remarksByKey[`${j.id}:${codeLetterId}`] ?? "").trim())
      .length;

  return (
    <div className="pb-28">
      <header className="border-b border-border pb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {stageName} · Review
        </p>
        <h1 className="mt-1.5 text-balance text-xl font-semibold tracking-tight text-heading sm:text-2xl">
          {programmeName}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {judgingMode === "GROUP"
            ? "Full panel — every judge and code letter"
            : `Judge: ${judges[0]?.name ?? ""}`}
        </p>
      </header>

      {/* Two columns from tablet up — a 10-code programme is a lot of
          scrolling on one narrow column. */}
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {codeLetters.map((c) => {
          const policy = policyByCode.get(c.id);
          const rCount = remarkCount(c.id);

          return (
            <div
              key={c.id}
              className="flex flex-col gap-3 rounded-2xl border border-border p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <span className="rounded-lg bg-muted px-2.5 py-1 font-mono text-base font-bold text-heading">
                    {c.code}
                  </span>
                  {policy?.grade ? (
                    <StatusPill tone="live">{policy.grade}</StatusPill>
                  ) : (
                    <StatusPill tone="muted">No grade</StatusPill>
                  )}
                </span>

                <div className="flex items-center gap-3 text-right">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Average
                    </p>
                    <p className="text-sm font-bold tabular-nums text-primary">
                      {policy?.points ?? "—"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {judges.map((j) => (
                  <span
                    key={j.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs"
                  >
                    {judges.length > 1 && (
                      <span className="text-muted-foreground">{j.name}</span>
                    )}
                    <span className="font-semibold tabular-nums text-heading">
                      {scoresByKey[`${j.id}:${c.id}`] ?? "—"}
                    </span>
                  </span>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setRemarkCodeId(c.id)}
                className="mt-auto flex w-full items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/50"
              >
                {rCount > 0 ? (
                  <MessageSquare className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <MessageSquarePlus className="h-3.5 w-3.5" />
                )}
                <span className="flex-1">
                  {rCount > 0
                    ? `${rCount} remark${rCount === 1 ? "" : "s"}`
                    : "Add remarks (optional)"}
                </span>
                <span className="font-medium text-primary">Edit</span>
              </button>
            </div>
          );
        })}
      </div>

      {submitError && (
        <p
          className="mt-4 text-center text-sm font-medium text-destructive"
          role="alert"
        >
          {submitError}
        </p>
      )}

      <StickyBar>
        <Button
          variant="outline"
          className="h-11 flex-1 rounded-full"
          onClick={onEdit}
          disabled={isPending}
        >
          Edit scores
        </Button>
        <Button
          className="h-11 flex-[2] rounded-full font-medium shadow-primary-glow"
          onClick={onConfirm}
          disabled={isPending}
        >
          {isPending ? "Submitting…" : "Confirm and submit"}
        </Button>
      </StickyBar>

      {/* Remarks, per judge, per code */}
      <Drawer
        open={Boolean(drawerCode)}
        onOpenChange={(o) => !o && setRemarkCodeId(null)}
      >
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>
              Remarks · code{" "}
              <span className="font-mono">{drawerCode?.code}</span>
            </DrawerTitle>
            <DrawerDescription>
              Optional note for this code letter
              {judges.length > 1 ? ", per judge" : ""}.
            </DrawerDescription>
          </DrawerHeader>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto px-4 pb-6">
            {drawerCode &&
              judges.map((j) => {
                const key = `${j.id}:${drawerCode.id}`;
                return (
                  <div key={j.id} className="space-y-1.5">
                    {judges.length > 1 && (
                      <p className="text-xs font-medium text-muted-foreground">
                        {j.name}
                      </p>
                    )}
                    <Textarea
                      rows={3}
                      placeholder="Remark (optional)…"
                      value={remarksByKey[key] ?? ""}
                      onChange={(e) =>
                        onRemarkChange(j.id, drawerCode.id, e.target.value)
                      }
                    />
                  </div>
                );
              })}
            <Button
              className="w-full rounded-full"
              onClick={() => setRemarkCodeId(null)}
            >
              Done
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

/**
 * The action bar every scoring view docks to the bottom of the viewport.
 * Judges work standing up with one thumb, so the primary action never
 * scrolls out of reach, and it clears the iOS home indicator.
 */
function StickyBar({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md"
      style={{
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div className="mx-auto flex w-full max-w-3xl gap-2">{children}</div>
    </div>
  );
}

export function StagePortalScoringClient({
  stageName,
  payload,
  onDone,
  onSubmitted,
}: {
  stageName: string;
  payload: StagePortalLivePayload;
  onDone: () => void;
  onSubmitted?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [submissionPhase, setSubmissionPhase] =
    useState<SubmissionPhase>("idle");
  const [summaryVariant, setSummaryVariant] = useState<"complete" | "partial">(
    "complete",
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reviewPolicyRows, setReviewPolicyRows] = useState<PolicyResultRow[]>(
    [],
  );
  const [selectedJudgeId, setSelectedJudgeId] = useState<string>(
    payload.judgingMode === "SINGLE" && payload.judges.length === 1
      ? payload.judges[0]!.id
      : "",
  );
  const [scoresByKey, setScoresByKey] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const row of payload.existingScores) {
      out[`${row.judgeId}:${row.codeLetterId}`] = String(row.score);
    }
    return out;
  });
  const [remarksByKey, setRemarksByKey] = useState<Record<string, string>>(
    () => {
      const out: Record<string, string> = {};
      for (const row of payload.existingScores) {
        if (row.remark) out[`${row.judgeId}:${row.codeLetterId}`] = row.remark;
      }
      return out;
    },
  );
  const markAbsence = useMarkCodeLetterAbsence();
  const [absentIds, setAbsentIds] = useState<Set<string>>(
    () =>
      new Set(payload.codeLetters.filter((c) => c.isAbsent).map((c) => c.id)),
  );

  // Absent code letters (reported but did not perform) are excluded from every
  // "all filled" / completion / progress check; they still render so a judge
  // can toggle them back.
  const activeCodeLetters = useMemo(
    () => payload.codeLetters.filter((c) => !absentIds.has(c.id)),
    [payload.codeLetters, absentIds],
  );

  const onToggleAbsent = (codeLetterId: string, nextAbsent: boolean) => {
    setAbsentIds((prev) => {
      const next = new Set(prev);
      if (nextAbsent) next.add(codeLetterId);
      else next.delete(codeLetterId);
      return next;
    });
    if (nextAbsent) {
      setScoresByKey((prev) => {
        const next = { ...prev };
        for (const j of payload.judges) delete next[`${j.id}:${codeLetterId}`];
        return next;
      });
    }
    markAbsence.mutate(
      { configId: payload.configId, codeLetterId, isAbsent: nextAbsent },
      {
        onError: () => {
          // revert on failure
          setAbsentIds((prev) => {
            const next = new Set(prev);
            if (nextAbsent) next.delete(codeLetterId);
            else next.add(codeLetterId);
            return next;
          });
        },
      },
    );
  };

  const everyCellValidGroup = useMemo(() => {
    return activeCodeLetters.every((c) =>
      payload.judges.every((j) => {
        const raw = scoresByKey[`${j.id}:${c.id}`];
        if (!isFieldFilled(raw)) return false;
        const v = Number(raw);
        return Number.isFinite(v) && v >= 0 && v <= payload.scoreLimit;
      }),
    );
  }, [payload.judges, activeCodeLetters, payload.scoreLimit, scoresByKey]);

  const selectedJudgeRowComplete = useMemo(() => {
    if (payload.judgingMode !== "SINGLE" || !selectedJudgeId) return false;
    return activeCodeLetters.every((c) => {
      const raw = scoresByKey[`${selectedJudgeId}:${c.id}`];
      if (!isFieldFilled(raw)) return false;
      const v = Number(raw);
      return Number.isFinite(v) && v >= 0 && v <= payload.scoreLimit;
    });
  }, [
    payload.judgingMode,
    selectedJudgeId,
    activeCodeLetters,
    payload.scoreLimit,
    scoresByKey,
  ]);

  // SINGLE mode: a judge who already submitted (round still open for others)
  // sees a read-only "You've submitted" state instead of editable fields.
  const selectedJudgeAlreadySubmitted =
    payload.judgingMode === "SINGLE" &&
    Boolean(selectedJudgeId) &&
    Boolean(payload.judgeCompletion?.[selectedJudgeId]);

  const canSubmit = useMemo(() => {
    if (payload.judgingMode === "SINGLE") {
      if (!selectedJudgeId) return false;
      if (selectedJudgeAlreadySubmitted) return false;
      if (activeCodeLetters.length === 0) return false;
      return selectedJudgeRowComplete;
    }
    if (activeCodeLetters.length === 0 || payload.judges.length === 0)
      return false;
    return everyCellValidGroup;
  }, [
    payload.judgingMode,
    selectedJudgeId,
    selectedJudgeAlreadySubmitted,
    selectedJudgeRowComplete,
    everyCellValidGroup,
    activeCodeLetters.length,
    payload.judges.length,
  ]);

  const submitValidationMessage = useMemo(() => {
    if (payload.judgingMode === "SINGLE") {
      if (!selectedJudgeId) return "Select your judge name to continue.";
      const total = activeCodeLetters.length;
      const filled = activeCodeLetters.filter((c) =>
        isFieldFilled(scoresByKey[`${selectedJudgeId}:${c.id}`]),
      ).length;
      if (filled < total) {
        return `Complete all scores before preview (${filled}/${total} filled).`;
      }
      return null;
    }
    let total = 0;
    let filled = 0;
    for (const c of activeCodeLetters) {
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
    activeCodeLetters,
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
      if (judgeHasAllCodes(j.id, activeCodeLetters, payload.existingScores))
        n += 1;
    }
    return n;
  }, [
    payload.judgingMode,
    payload.judges,
    activeCodeLetters,
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
          sub: `0 / ${activeCodeLetters.length} codes — pick your name`,
        };
      }
      const valid = activeCodeLetters.filter((c) => {
        const raw = scoresByKey[`${jid}:${c.id}`];
        if (!isFieldFilled(raw)) return false;
        const v = Number(raw);
        return Number.isFinite(v) && v >= 0 && v <= limit;
      }).length;
      const total = activeCodeLetters.length;
      return {
        pct: total ? Math.round((valid / total) * 100) : 0,
        sub: `${valid} / ${total} fields valid`,
      };
    }
    let valid = 0;
    let total = 0;
    for (const c of activeCodeLetters) {
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
    activeCodeLetters,
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

  // Judges represented in this submission: SINGLE → just the selected judge;
  // GROUP → all judges. Used by the review matrix + remark drawer.
  const reviewJudges = useMemo(() => {
    if (payload.judgingMode === "SINGLE") {
      const j = payload.judges.find((x) => x.id === selectedJudgeId);
      return j ? [j] : [];
    }
    return payload.judges;
  }, [payload.judgingMode, payload.judges, selectedJudgeId]);

  const onRemarkChange = (judgeId: string, codeLetterId: string, v: string) => {
    setRemarksByKey((prev) => ({ ...prev, [`${judgeId}:${codeLetterId}`]: v }));
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
    startTransition(async () => {
      try {
        const scoresByJudgeId: Record<string, Record<string, number>> = {};
        if (payload.judgingMode === "SINGLE") {
          scoresByJudgeId[selectedJudgeId] = {};
          for (const c of activeCodeLetters) {
            scoresByJudgeId[selectedJudgeId]![c.id] = Number(
              scoresByKey[`${selectedJudgeId}:${c.id}`],
            );
          }
        } else {
          for (const j of payload.judges) {
            scoresByJudgeId[j.id] = {};
            for (const c of activeCodeLetters) {
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
        setSubmissionPhase("review");
      } catch (error: any) {
        setSubmitError(
          humanizeError(error).message ||
            "Failed to compute policy summary for review.",
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
          const remarksByCodeLetterId: Record<string, string> = {};
          for (const c of activeCodeLetters) {
            scoresByCodeLetterId[c.id] = Number(
              scoresByKey[`${selectedJudgeId}:${c.id}`],
            );
            const rm = (
              remarksByKey[`${selectedJudgeId}:${c.id}`] ?? ""
            ).trim();
            if (rm) remarksByCodeLetterId[c.id] = rm;
          }
          const res = await submitJudgeScoresAction({
            configId: payload.configId,
            judgeId: selectedJudgeId,
            scoresByCodeLetterId,
            remarksByCodeLetterId,
          });
          setSummaryVariant(res.judgementComplete ? "complete" : "partial");
        } else {
          const scoresByJudgeId: Record<string, Record<string, number>> = {};
          const remarksByJudgeId: Record<string, Record<string, string>> = {};
          for (const j of payload.judges) {
            scoresByJudgeId[j.id] = {};
            remarksByJudgeId[j.id] = {};
            for (const c of activeCodeLetters) {
              scoresByJudgeId[j.id]![c.id] = Number(
                scoresByKey[`${j.id}:${c.id}`],
              );
              const rm = (remarksByKey[`${j.id}:${c.id}`] ?? "").trim();
              if (rm) remarksByJudgeId[j.id]![c.id] = rm;
            }
          }
          await submitGroupJudgeScoresAction({
            configId: payload.configId,
            scoresByJudgeId,
            remarksByJudgeId,
          });
          setSummaryVariant("complete");
        }
        onSubmitted?.();
        setSubmissionPhase("summary");
      } catch (error: any) {
        const message =
          humanizeError(error).message || "Failed to submit scores.";
        setSubmitError(message);
        toast.error(message);
      }
    });
  };

  if (submissionPhase === "review") {
    return (
      <SubmissionReviewView
        stageName={stageName}
        programmeName={payload.programme.name}
        judgingMode={payload.judgingMode}
        judges={reviewJudges}
        codeLetters={activeCodeLetters}
        scoresByKey={scoresByKey}
        remarksByKey={remarksByKey}
        onRemarkChange={onRemarkChange}
        policyRows={reviewPolicyRows}
        isPending={isPending}
        submitError={submitError}
        onEdit={() => {
          setSubmissionPhase("idle");
          setSubmitError(null);
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
    <div className="pb-32">
      {/* Sticky context bar: the programme, the mode and how far through you
          are stay on screen while you scroll a long list of code letters.
          Previously progress was a mobile-only card at the top and a
          desktop-only bar in the footer, so neither width had it while
          actually scoring. */}
      <header className="sticky top-0 z-30 -mx-4 border-b border-border bg-background/95 px-4 pb-3 pt-4 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {stageName}
            </p>
            <h1 className="mt-0.5 truncate text-lg font-semibold tracking-tight text-heading sm:text-xl">
              {payload.programme.name}
            </h1>
          </div>
          <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
            {progress.sub}
          </span>
        </div>

        <Progress value={progressPct} className="mt-2.5 h-1.5" />

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <StatusPill tone="ready" icon={ModeIcon}>
            {modeLabel}
          </StatusPill>
          <StatusPill tone="muted">Max {payload.scoreLimit} pts</StatusPill>
          <StatusPill tone="muted">
            {payload.programme.type === "GROUP" ? "Group" : "Individual"}
          </StatusPill>
        </div>
      </header>

      {/* Judge picker — a grid rather than a scroll strip, so a tablet shows
          the whole panel at once instead of hiding judges off-screen. */}
      {payload.judgingMode === "SINGLE" && payload.judges.length > 1 && (
        <section className="mt-6">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Who are you?
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Tap your name — only your scores become editable.
              </p>
            </div>
            {judgesDoneCount !== null && (
              <p className="text-xs tabular-nums text-muted-foreground">
                {judgesDoneCount}/{payload.judges.length} finished
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {payload.judges.map((j) => {
              const done = judgeHasAllCodes(
                j.id,
                activeCodeLetters,
                payload.existingScores,
              );
              const active = selectedJudgeId === j.id;
              return (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => setSelectedJudgeId(j.id)}
                  aria-pressed={active}
                  className={cn(
                    "flex min-h-[3.5rem] flex-col items-start justify-center gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-colors active:scale-[0.99]",
                    active
                      ? "border-primary bg-primary/[0.07]"
                      : "border-border bg-card hover:border-primary/30",
                  )}
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-heading">
                      {j.name}
                    </span>
                    {done ? (
                      <CheckCircle2
                        className="h-4 w-4 shrink-0 text-success"
                        aria-label="Submitted"
                      />
                    ) : (
                      <Circle
                        className="h-4 w-4 shrink-0 text-muted-foreground/40"
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
      )}

      {payload.judgingMode === "SINGLE" && selectedJudgeAlreadySubmitted && (
        <div className="mt-6 rounded-2xl border border-success/40 bg-success/[0.08] p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-success">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            You&apos;ve already submitted
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Your scores are locked. The programme stays live until the other
            judges finish — your entries are shown below, read-only.
          </p>
        </div>
      )}

      {/* Scores */}
      <section className="mt-6">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {payload.judgingMode === "SINGLE" ? "Scores" : "Panel scores"}
        </h2>

        {payload.judgingMode === "SINGLE" ? (
          /* Two columns from tablet up — one code letter per row wasted most
             of the width on an iPad, which is what judges actually hold. */
          <div className="grid gap-2.5 md:grid-cols-2">
            {payload.codeLetters.map((c) => {
              const isAbsent = absentIds.has(c.id);
              const effectiveJudgeId =
                payload.judges.length === 1
                  ? payload.judges[0]!.id
                  : selectedJudgeId;
              const fieldKey = effectiveJudgeId
                ? `${effectiveJudgeId}:${c.id}`
                : "";
              const others =
                !isAbsent && effectiveJudgeId && payload.judges.length > 1
                  ? otherJudgesScoresSummary(
                      c.id,
                      effectiveJudgeId,
                      payload.judges,
                      scoresByKey,
                    )
                  : null;
              const cellErr =
                !isAbsent && singleShowSelectedCellHints && effectiveJudgeId
                  ? scoreCellErrorLabel(
                      scoresByKey[`${effectiveJudgeId}:${c.id}`],
                      payload.scoreLimit,
                    )
                  : null;

              return (
                <div
                  key={c.id}
                  className={cn(
                    "flex items-center gap-4 rounded-2xl border border-border p-4",
                    cellErr && "border-destructive/40",
                    isAbsent && "bg-muted/40 opacity-70",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "font-mono text-xl font-semibold tracking-tight text-heading",
                        isAbsent && "text-muted-foreground line-through",
                      )}
                    >
                      {c.code}
                    </p>
                    {others && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {others}
                      </p>
                    )}
                    <AbsentToggle
                      isAbsent={isAbsent}
                      disabled={markAbsence.isPending}
                      onToggle={() => onToggleAbsent(c.id, !isAbsent)}
                    />
                  </div>

                  {isAbsent ? (
                    <span className="shrink-0 text-xs font-medium text-muted-foreground">
                      Excluded
                    </span>
                  ) : (
                    <div className="flex w-24 shrink-0 flex-col items-stretch gap-1">
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
                        disabled={
                          isPending ||
                          !effectiveJudgeId ||
                          selectedJudgeAlreadySubmitted
                        }
                        max={payload.scoreLimit}
                        invalid={Boolean(cellErr)}
                      />
                      {cellErr && (
                        <p className="text-center text-[11px] font-medium text-destructive">
                          {cellErr}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {payload.codeLetters.map((c) => {
              const isAbsent = absentIds.has(c.id);
              return (
                <div
                  key={c.id}
                  className={cn(
                    "rounded-2xl border border-border p-4",
                    isAbsent && "bg-muted/40 opacity-70",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p
                      className={cn(
                        "font-mono text-xl font-semibold tracking-tight text-heading",
                        isAbsent && "text-muted-foreground line-through",
                      )}
                    >
                      {c.code}
                    </p>
                    <AbsentToggle
                      isAbsent={isAbsent}
                      disabled={markAbsence.isPending}
                      onToggle={() => onToggleAbsent(c.id, !isAbsent)}
                    />
                  </div>

                  {isAbsent ? (
                    <p className="mt-3 text-xs font-medium text-muted-foreground">
                      Excluded from scoring — reported but did not perform.
                    </p>
                  ) : (
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
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
                              "flex min-w-0 flex-col gap-1.5 rounded-xl border border-border bg-muted/30 p-2.5",
                              err && "border-destructive/40",
                            )}
                          >
                            <span className="truncate text-[11px] font-medium text-muted-foreground">
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
                            {err && (
                              <span className="text-center text-[10px] font-medium text-destructive">
                                {err}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <StickyBar>
        <div className="flex w-full flex-col gap-2">
          {submitError && (
            <p
              className="text-xs font-medium leading-tight text-destructive"
              role="alert"
            >
              {submitError}
            </p>
          )}
          {!submitError && !canSubmit && (
            <p className="text-xs font-medium leading-tight text-warning">
              {submitValidationMessage ??
                "Fill every score to preview the submission."}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-11 shrink-0 rounded-full px-5"
              onClick={onDone}
            >
              Back
            </Button>
            <Button
              size="lg"
              className="h-11 flex-1 rounded-full font-medium shadow-primary-glow"
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
      </StickyBar>
    </div>
  );
}
