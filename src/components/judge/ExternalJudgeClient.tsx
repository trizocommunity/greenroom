"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCountdownHms } from "@/core/utils/format-countdown";
import {
  refreshJudgeOpenLockAction,
  submitProgrammeJudgeSessionAction,
} from "@/features/programmes/actions/programme-judging.actions";

export function ExternalJudgeClient({
  token,
  programmeName,
  festival,
  programmeDetails,
  codeLetters,
  startedAt,
  isClosed,
  openNonce,
  lockState,
  recentJudges,
}: {
  token: string;
  programmeName: string;
  festival: {
    name: string;
    slug: string;
    location?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  };
  programmeDetails: {
    stageName?: string | null;
    categoryName?: string | null;
    programmeType?: "INDIVIDUAL" | "GROUP" | null;
  };
  codeLetters: string[];
  startedAt: Date;
  isClosed: boolean;
  openNonce: string | null;
  lockState: "open" | "in_use" | "closed";
  recentJudges: Array<{
    judgeName: string;
    judgeContact: string;
    judgeNote: string;
    judgedAt: string;
  }>;
}) {
  // Avoid hydration mismatch: first render should not depend on the current time.
  const [nowMs, setNowMs] = useState(() => new Date(startedAt).getTime());
  const [isPending, startTransition] = useTransition();
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [judgeName, setJudgeName] = useState("");
  const [judgeContact, setJudgeContact] = useState("");
  const [judgeNote, setJudgeNote] = useState("");
  const [selectedJudgeKey, setSelectedJudgeKey] = useState("");

  useEffect(() => {
    if (recentJudges.length === 0) return;
    const latest = recentJudges[0];
    setSelectedJudgeKey(`${latest.judgeName}|${latest.judgedAt}`);
    setJudgeName(latest.judgeName);
    setJudgeContact(latest.judgeContact);
    setJudgeNote(latest.judgeNote);
  }, [recentJudges]);

  // Keep count-up updated.
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!openNonce || lockState !== "open" || hasSubmitted) return;
    const id = window.setInterval(() => {
      refreshJudgeOpenLockAction(token, openNonce);
    }, 15_000);
    return () => window.clearInterval(id);
  }, [token, openNonce, lockState, hasSubmitted]);

  const elapsedSeconds = useMemo(() => {
    const start = new Date(startedAt).getTime();
    return Math.max(0, Math.floor((nowMs - start) / 1000));
  }, [nowMs, startedAt]);

  const [valuesByCode, setValuesByCode] = useState<Record<string, string>>(
    () => {
      const base: Record<string, string> = {};
      for (const c of codeLetters) base[c] = "";
      return base;
    },
  );

  useEffect(() => {
    setValuesByCode((prev) => {
      const next: Record<string, string> = { ...prev };
      for (const c of codeLetters) {
        if (next[c] == null) next[c] = "";
      }
      return next;
    });
  }, [codeLetters]);

  const allFilled = codeLetters.every((c) => {
    const v = valuesByCode[c];
    return v != null && v !== "" && Number.isFinite(Number(v));
  });

  const closed = isClosed || hasSubmitted || lockState !== "open";
  // Server-rendered refresh after a successful submit arrives as `isClosed=true`.
  // Treat both in-use and closed tokens as expired/locked for display.
  const isExpired = !hasSubmitted && (lockState === "in_use" || isClosed);
  const canSubmit = allFilled && judgeName.trim().length >= 2 && !closed;

  const onSubmit = () => {
    if (closed) return;
    if (!canSubmit) {
      toast.error("Please complete judge details and all points.");
      return;
    }

    const pointsByCode: Record<string, number> = {};
    for (const c of codeLetters) pointsByCode[c] = Number(valuesByCode[c]);

    startTransition(async () => {
      const res = await submitProgrammeJudgeSessionAction(
        token,
        pointsByCode,
        {
          judgeName: judgeName.trim(),
          judgeContact: judgeContact.trim() || null,
          judgeNote: judgeNote.trim() || null,
        },
        openNonce ?? "",
      );
      if (!res.success) {
        toast.error(res.error);
        return;
      }

      setHasSubmitted(true);
      setShowCelebration(true);
      window.setTimeout(() => setShowCelebration(false), 1800);
      toast.success("Judging submitted successfully.");
    });
  };

  return (
    <div className="min-h-dvh p-4 sm:p-6  max-w-md mx-auto">
      <div className="space-y-4 pb-24 pt-10 sm:pb-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {festival.name}
          </p>
          <h1 className="text-xl sm:text-2xl font-bold">{programmeName}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            {!hasSubmitted && lockState === "open" ? (
              <Badge variant="outline" className="font-mono">
                Count: {formatCountdownHms(elapsedSeconds)}
              </Badge>
            ) : null}
            {isExpired ? (
              <Badge variant="secondary">Link expired</Badge>
            ) : closed ? (
              <Badge variant="secondary">Judging completed</Badge>
            ) : (
              <Badge variant="outline">External judge</Badge>
            )}
          </div>
        </div>

        <div className="rounded-lg border p-3 sm:p-4 bg-muted/10">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
            Programme details
          </p>
          <div className="grid grid-cols-1 gap-1.5 text-sm">
            <p>
              <span className="text-muted-foreground">Stage:</span>{" "}
              {programmeDetails.stageName ?? "Not assigned"}
            </p>
            <p>
              <span className="text-muted-foreground">Category:</span>{" "}
              {programmeDetails.categoryName ?? "Uncategorized"}
            </p>
            <p>
              <span className="text-muted-foreground">Type:</span>{" "}
              {programmeDetails.programmeType === "GROUP"
                ? "Group"
                : programmeDetails.programmeType === "INDIVIDUAL"
                  ? "Individual"
                  : "Unknown"}
            </p>
          </div>
        </div>

        {isExpired ? (
          <div className="rounded-lg border p-4 bg-muted/20">
            <h2 className="font-semibold">This link is expired</h2>
            <p className="text-sm text-muted-foreground mt-1">
              This judging link is closed and can no longer be used. Ask the
              stage manager to regenerate and share a new judge link.
            </p>
          </div>
        ) : null}

        {!isExpired && hasSubmitted ? (
          <div className="rounded-lg border p-3 sm:p-4">
            <p className="text-sm font-medium mb-2">Judgment summary</p>
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Code</th>
                    <th className="text-right px-3 py-2 font-medium">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {codeLetters.map((code) => (
                    <tr key={code} className="border-t">
                      <td className="px-3 py-2 font-mono">{code}</td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {valuesByCode[code] ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : !isExpired && codeLetters.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No code letters available.
          </div>
        ) : !isExpired ? (
          <div className="space-y-3 rounded-lg border p-3 sm:p-4">
            {codeLetters.map((code) => (
              <div
                key={code}
                className="rounded-lg border p-3 sm:p-4 space-y-2"
              >
                <div className="min-w-0">
                  <div className="font-mono font-semibold text-base">
                    {code}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Enter points (0 to 10, step 0.5)
                  </div>
                </div>
                <Input
                  type="number"
                  step="0.5"
                  min={0}
                  max={10}
                  value={valuesByCode[code] ?? ""}
                  onChange={(e) =>
                    setValuesByCode((prev) => ({
                      ...prev,
                      [code]: e.target.value,
                    }))
                  }
                  disabled={closed || isPending}
                  placeholder="Pts"
                  className="text-center font-mono h-11 sm:h-10 text-base sm:text-sm"
                  inputMode="decimal"
                />
              </div>
            ))}
          </div>
        ) : null}

        {!isExpired && hasSubmitted ? (
          <div className="rounded-lg border p-5 bg-emerald-500/10 border-emerald-500/30">
            <div className={showCelebration ? "animate-pulse" : ""}>
              <p className="text-lg font-semibold">
                Thank you, {judgeName || "Judge"}!
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Your scoring has been submitted successfully.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                This link is now closed for security.
              </p>
              <Badge className="mt-3">Submitted</Badge>
            </div>
          </div>
        ) : null}

        {!isExpired && !closed ? (
          <div className="space-y-2 rounded-lg border p-3 sm:p-4">
            <p className="text-sm font-medium">Judge details</p>
            {recentJudges.length > 0 ? (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Recent judges (auto-filled)
                </p>
                <select
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  value={selectedJudgeKey}
                  onChange={(e) => {
                    const key = e.target.value;
                    setSelectedJudgeKey(key);
                    const selected = recentJudges.find(
                      (j) => `${j.judgeName}|${j.judgedAt}` === key,
                    );
                    if (!selected) return;
                    setJudgeName(selected.judgeName);
                    setJudgeContact(selected.judgeContact);
                    setJudgeNote(selected.judgeNote);
                  }}
                >
                  {recentJudges.map((j) => (
                    <option
                      key={`${j.judgeName}-${j.judgedAt}`}
                      value={`${j.judgeName}|${j.judgedAt}`}
                    >
                      {j.judgeName}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <Input
              inputSize="m"
              placeholder="Judge name *"
              value={judgeName}
              onChange={(e) => {
                setSelectedJudgeKey("");
                setJudgeName(e.target.value);
              }}
              className="text-base sm:text-sm"
            />
            <Input
              inputSize="m"
              placeholder="Contact (optional)"
              value={judgeContact}
              onChange={(e) => {
                setSelectedJudgeKey("");
                setJudgeContact(e.target.value);
              }}
              className="text-base sm:text-sm"
            />
            <Input
              inputSize="m"
              placeholder="Note (optional)"
              value={judgeNote}
              onChange={(e) => {
                setSelectedJudgeKey("");
                setJudgeNote(e.target.value);
              }}
              className="text-base sm:text-sm"
            />
          </div>
        ) : null}

        {!isExpired && !hasSubmitted && (
          <div className="fixed bottom-0 left-0 right-0 p-3 bg-background/95 border-t sm:static sm:border-0 sm:bg-transparent sm:p-0">
            <Button
              onClick={onSubmit}
              disabled={!canSubmit || isPending || codeLetters.length === 0}
              className="w-full sm:w-auto sm:ml-auto"
            >
              {closed
                ? "Judging completed"
                : isPending
                  ? "Submitting..."
                  : "Submit"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
