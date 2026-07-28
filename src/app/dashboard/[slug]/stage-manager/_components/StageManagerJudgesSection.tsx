"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useJudges } from "@/api/client/judges";
import {
  useAssignJudgeStage,
  useJudgeStageAssignments,
  useUnassignJudgeStage,
} from "@/api/client/judge-stage-assignments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StageAssignmentToggleDialog } from "@/components/festival/stage-assignment/StageAssignmentToggleDialog";

interface StageManagerJudgesSectionProps {
  festivalId: string;
  myStages: Array<{ id: string; name: string }>;
}

export function StageManagerJudgesSection({
  festivalId,
  myStages,
}: StageManagerJudgesSectionProps) {
  const { data: judges = [], isLoading } = useJudges(festivalId);
  const { data: assignments = [] } = useJudgeStageAssignments(festivalId);
  const assignJudgeStage = useAssignJudgeStage();
  const unassignJudgeStage = useUnassignJudgeStage();

  const [managingJudgeId, setManagingJudgeId] = useState<string | null>(null);
  const [pendingStageId, setPendingStageId] = useState<string | null>(null);

  const myStageIds = myStages.map((s) => s.id);

  const myStagesForJudge = (judgeId: string) =>
    assignments
      .filter((a) => a.judgeId === judgeId && myStageIds.includes(a.stageId))
      .map((a) => a.stage.name);

  const handleToggle = async (stageId: string, nextAssigned: boolean) => {
    if (!managingJudgeId) return;
    setPendingStageId(stageId);
    try {
      if (nextAssigned) {
        await assignJudgeStage.mutateAsync({
          festivalId,
          data: { stageId, judgeId: managingJudgeId },
        });
      } else {
        const existing = assignments.find(
          (a) => a.stageId === stageId && a.judgeId === managingJudgeId,
        );
        if (existing) {
          await unassignJudgeStage.mutateAsync({
            festivalId,
            assignmentId: existing.id,
          });
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update judge assignment");
    } finally {
      setPendingStageId(null);
    }
  };

  if (isLoading) return null;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Judges</h2>
        <p className="text-sm text-muted-foreground">
          All judges in this festival. Assign any of them to your own stage(s).
        </p>
      </div>

      {judges.length === 0 ? (
        <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-6 text-center">
          No judges have been created for this festival yet.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {judges.map((judge) => {
            const assignedNames = myStagesForJudge(judge.id);
            return (
              <div
                key={judge.id}
                className="flex items-center justify-between gap-3 rounded-xl border p-3"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{judge.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {assignedNames.length > 0 ? (
                      assignedNames.map((name) => (
                        <Badge
                          key={name}
                          variant="outline"
                          className="text-xs font-normal"
                        >
                          {name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Not assigned to your stage(s)
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setManagingJudgeId(judge.id)}
                  disabled={myStages.length === 0}
                >
                  Assign
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {managingJudgeId && (
        <StageAssignmentToggleDialog
          open={!!managingJudgeId}
          onOpenChange={(open) => !open && setManagingJudgeId(null)}
          title={`Assign "${
            judges.find((j) => j.id === managingJudgeId)?.name ?? "judge"
          }" to your stage(s)`}
          description="Only your own assigned stage(s) are shown here."
          emptyMessage="You have no assigned stages."
          options={myStages.map((s) => ({ id: s.id, label: s.name }))}
          assignedIds={assignments
            .filter((a) => a.judgeId === managingJudgeId)
            .map((a) => a.stageId)}
          pendingId={pendingStageId}
          onToggle={handleToggle}
        />
      )}
    </div>
  );
}
