"use client";

import { KeyRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgrammeProgressFunnel } from "@/components/dashboard/judgement/ProgrammeProgressFunnel";
import { cn } from "@/core/utils/cn";
import { JudgementTimer } from "./JudgementTimer";
import type { ActiveConfig, JudgedProgrammeCard, Programme } from "./types";

/**
 * One programme ready to be judged — or already in progress.
 *
 * - No active judgement: card opens the wizard.
 * - Active judgement: card opens the participants drawer, and a live timer
 *   shows minutes since the round started.
 * - The bottom button bar (Credentials / Submit / Restart / Cancel) is wired
 *   to whatever the round currently needs.
 */
export function JudgeProgrammeCard({
  programme,
  active,
  judged,
  isCompleting,
  onStartWizard,
  onOpenParticipants,
  onShowCredentials,
  onComplete,
  onCancel,
  onRestart,
}: {
  programme: Programme;
  active: ActiveConfig | undefined;
  judged: JudgedProgrammeCard | undefined;
  isCompleting: boolean;
  onStartWizard: () => void;
  onOpenParticipants: () => void;
  onShowCredentials: (stage: { id: string; name: string | null }) => void;
  onComplete: (configId: string) => void;
  onCancel: (programmeId: string) => void;
  onRestart: (programmeId: string) => void;
}) {
  const isUnscheduled = Boolean(
    programme.reportingDetails && programme.reportingDetails.stageId === null,
  );

  return (
    <Card
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border bg-background/60 shadow-sm transition-all hover:shadow-md cursor-pointer",
        active
          ? "border-purple/50 ring-1 ring-purple/15 bg-purple/[0.03] hover:border-purple/70 hover:bg-purple/[0.05]"
          : "border-border/40 hover:border-border/80 hover:bg-muted/10",
      )}
      onClick={() => {
        if (active) {
          onOpenParticipants();
          return;
        }
        onStartWizard();
      }}
    >
      <CardHeader className="space-y-2.5 p-4 sm:p-5 border-b border-border/30 bg-muted/5">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base font-semibold leading-snug tracking-tight line-clamp-2 sm:text-lg">
            {programme.name}
          </CardTitle>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {active ? <JudgementTimer startedAt={active.startedAt} /> : null}
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
        <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground sm:text-xs">
          <Badge
            variant="secondary"
            className="px-1.5 py-0 text-[10px] sm:text-[11px] rounded-md font-semibold"
          >
            {programme.programmeType === "GROUP" ? "Group" : "Individual"}
          </Badge>
          {programme.programmeCategory && (
            <span className="truncate">{programme.programmeCategory}</span>
          )}
          {programme.reportingDetails?.stageName && (
            <>
              <span className="shrink-0 text-border">•</span>
              <span className="truncate text-foreground/70">
                Stage {programme.reportingDetails.stageName}
              </span>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col p-4 sm:p-5">
        {programme.reportingDetails ? (
          <div className={active ? "mb-4" : ""}>
            <ProgrammeProgressFunnel
              assigned={programme.reportingDetails.assignedCount}
              reported={programme.reportingDetails.reportedCount}
              absent={programme.reportingDetails.absentCount}
              scored={judged?.requiredCodeLetters}
              hideAbsent={true}
            />
          </div>
        ) : null}
        {active ? (
          <div className="mt-auto flex flex-row items-center gap-2 pt-2 border-t border-border/40">
            {programme.reportingDetails?.stageId ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 flex-1 text-[11px] sm:text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  const details = programme.reportingDetails;
                  if (!details?.stageId) return;
                  onShowCredentials({
                    id: details.stageId,
                    name: details.stageName ?? null,
                  });
                }}
              >
                <KeyRound className="mr-1.5 h-3.5 w-3.5" />
                Credentials
              </Button>
            ) : null}

            {active.judgementStatus === "COMPLETED" ? (
              <Button
                type="button"
                size="sm"
                variant="default"
                className="h-8 flex-1 text-[11px] sm:text-xs bg-green-600 hover:bg-green-700 text-white"
                disabled={isCompleting}
                onClick={(e) => {
                  e.stopPropagation();
                  onComplete(active.id);
                }}
              >
                Submit
              </Button>
            ) : active.judgementStatus === "CANCELLED" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 flex-1 text-[11px] sm:text-xs text-green-600 border-green-600 hover:bg-green-50"
                onClick={(e) => {
                  e.stopPropagation();
                  onRestart(programme.id);
                }}
              >
                Restart
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 flex-1 text-[11px] sm:text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel(programme.id);
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
