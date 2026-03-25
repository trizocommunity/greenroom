"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCountdownHms } from "@/lib/format-countdown-hms";
import { submitProgrammeJudgeSessionAction } from "@/server/actions/programme-judging.actions";

export function ExternalJudgeClient({
  token,
  programmeName,
  codeLetters,
  startedAt,
  isClosed,
}: {
  token: string;
  programmeName: string;
  codeLetters: string[];
  startedAt: Date;
  isClosed: boolean;
}) {
  // Avoid hydration mismatch: first render should not depend on the current time.
  const [nowMs, setNowMs] = useState(() => new Date(startedAt).getTime());
  const [isPending, startTransition] = useTransition();
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Keep count-up updated.
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

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

  const closed = isClosed || hasSubmitted;

  const onSubmit = () => {
    if (closed) return;
    if (!allFilled) {
      toast.error("Please enter points for every code letter.");
      return;
    }

    const pointsByCode: Record<string, number> = {};
    for (const c of codeLetters) pointsByCode[c] = Number(valuesByCode[c]);

    startTransition(async () => {
      const res = await submitProgrammeJudgeSessionAction(token, pointsByCode);
      if (!res.success) {
        toast.error(res.error);
        return;
      }

      setHasSubmitted(true);
      toast.success("Judging submitted successfully.");
    });
  };

  return (
    <div className="min-h-dvh p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold">{programmeName}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="font-mono">
              Count: {formatCountdownHms(elapsedSeconds)}
            </Badge>
            {closed ? (
              <Badge variant="secondary">Judging completed</Badge>
            ) : (
              <Badge variant="outline">External judge</Badge>
            )}
          </div>
        </div>

        {codeLetters.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No code letters available.
          </div>
        ) : (
          <div className="space-y-3 rounded-lg border p-3">
            {codeLetters.map((code) => (
              <div
                key={code}
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-mono font-semibold text-base">
                    {code}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Enter points (0 to 10, step 0.5)
                  </div>
                </div>
                <div className="w-28">
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
                    className="text-center font-mono"
                    inputMode="decimal"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={onSubmit}
            disabled={closed || isPending || codeLetters.length === 0}
          >
            {closed
              ? "Judging completed"
              : isPending
                ? "Submitting..."
                : "Submit"}
          </Button>
        </div>
      </div>
    </div>
  );
}
