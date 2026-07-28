"use client";

import { CalendarClock, LogOut, Radio } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLogoutStagePortal, useStagePortalData } from "@/api/client/server-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { StagePortalLivePayload } from "@/components/judge/StagePortalScoringClient";
import { StagePortalScoringClient } from "@/components/judge/StagePortalScoringClient";

export function StagePortalHomeClient() {
  const router = useRouter();
  const { data, isLoading, refetch } = useStagePortalData();
  const logout = useLogoutStagePortal();
  const [scoring, setScoring] = useState<StagePortalLivePayload | null>(null);

  const stageName = data?.stage?.name ?? "Stage";

  if (scoring) {
    return (
      <div className="mx-auto w-full max-w-full px-3 pt-6 sm:max-w-3xl sm:px-6 sm:pt-10 lg:max-w-5xl">
        <StagePortalScoringClient
          stageName={stageName}
          payload={scoring}
          onDone={() => {
            setScoring(null);
            refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-full px-3 pb-10 pt-6 sm:max-w-3xl sm:px-6 sm:pt-10 lg:max-w-5xl">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Stage Judge Portal
          </p>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {stageName}
          </h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            logout.mutate(undefined, {
              onSuccess: () => router.refresh(),
            });
          }}
        >
          <LogOut className="mr-1.5 h-4 w-4" aria-hidden />
          Log out
        </Button>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : data?.status === "live" ? (
        <Card className="border-primary/30 bg-primary/[0.04] shadow-sm">
          <CardHeader className="space-y-2">
            <Badge className="w-fit gap-1.5 rounded-md bg-primary/15 text-primary hover:bg-primary/15">
              <Radio className="h-3.5 w-3.5" aria-hidden />
              Live now
            </Badge>
            <CardTitle className="text-lg">{data.programme.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Judges: {data.judges.map((j) => j.name).join(", ") || "—"}
            </p>
            <Button
              className="h-11 w-full sm:w-auto"
              onClick={() =>
                setScoring({
                  configId: data.configId,
                  scoreLimit: data.scoreLimit,
                  judgingMode: data.judgingMode,
                  programme: data.programme,
                  judges: data.judges,
                  codeLetters: data.codeLetters,
                  existingScores: data.existingScores,
                })
              }
            >
              Enter scores
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-border/60 bg-muted/20">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No live programme right now. It will appear here as soon as your
              stage manager starts judgment.
            </p>
          </CardContent>
        </Card>
      )}

      <Separator className="my-8 opacity-60" />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">History</h2>
        {!data?.history?.length ? (
          <p className="text-xs text-muted-foreground">
            Nothing judged on this stage yet.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {data.history.map((h) => (
              <li
                key={h.configId}
                className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{h.programmeName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {h.judgeNames.join(", ") || "—"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                  {h.endedAt ? new Date(h.endedAt).toLocaleTimeString() : "—"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
