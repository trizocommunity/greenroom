"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState, useTransition } from "react";
import { queryKeys } from "@/api/client/_query-keys";
import {
  restartJudgementAction,
  startJudgementAction,
} from "@/features/judgement/actions/judgement.actions";
import { createJudgeAction } from "@/features/judges/actions/judge.actions";
import { toast } from "@/lib/toast";
import type { JudgedProgrammeCard, Programme } from "./types";
import { POLICY_SCORE_LIMIT } from "./types";

export interface UseJudgementWizardArgs {
  festivalId: string;
  programmes: Programme[];
  rejudgeProgrammes: Programme[];
  judgesByStageId: Record<string, string[]>;
  judgedByProgrammeId: Map<string, JudgedProgrammeCard>;
}

export interface UseJudgementWizardResult {
  isOpen: boolean;
  open: (programmeId: string, kind?: "create" | "rejudge") => void;
  close: () => void;
  isPending: boolean;
  wizardKind: "create" | "rejudge";
  programmeId: string | null;
  selectedJudgeIds: string[];
  toggleJudge: (judgeId: string) => void;
  judgingMode: "SINGLE" | "GROUP";
  setJudgingMode: (v: "SINGLE" | "GROUP") => void;
  newJudgeName: string;
  setNewJudgeName: (v: string) => void;
  addJudge: () => void;
  isAddingJudge: boolean;
  startJudgement: (programmeId?: string | null) => void;
  hasUnsavedInputs: boolean;
}

/**
 * Encapsulates everything the start-judgement drawer needs: panel prefill,
 * judge selection, the create-vs-restart action and the dirty-source flag
 * that protects against an unsaved wizard being abandoned.
 */
export function useJudgementWizard({
  festivalId,
  programmes,
  rejudgeProgrammes,
  judgesByStageId,
  judgedByProgrammeId,
}: UseJudgementWizardArgs): UseJudgementWizardResult {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [wizardKind, setWizardKind] = useState<"create" | "rejudge">("create");
  const [wizardProgrammeId, setWizardProgrammeId] = useState<string | null>(
    null,
  );
  const [selectedJudgeIds, setSelectedJudgeIds] = useState<string[]>([]);
  const [judgingMode, setJudgingMode] = useState<"SINGLE" | "GROUP">("GROUP");
  const [newJudgeName, setNewJudgeName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isAddingJudge, startAddJudgeTransition] = useTransition();

  const close = () => {
    setIsOpen(false);
    setWizardProgrammeId(null);
    setWizardKind("create");
    setSelectedJudgeIds([]);
    setJudgingMode("GROUP");
    setNewJudgeName("");
  };

  const open = (programmeId: string, kind: "create" | "rejudge" = "create") => {
    // Prefill judges: rejudge → prior panel; else the programme's stage
    // default panel (judge_stage_assignment); else empty.
    const priorJudgeIds =
      judgedByProgrammeId.get(programmeId)?.judges.map((j) => j.id) ?? [];
    const programme =
      programmes.find((p) => p.id === programmeId) ??
      rejudgeProgrammes.find((p) => p.id === programmeId);
    const stageId = programme?.reportingDetails?.stageId ?? null;
    const stagePanel = stageId ? (judgesByStageId[stageId] ?? []) : [];
    const prefill =
      kind === "rejudge" && priorJudgeIds.length
        ? priorJudgeIds
        : stagePanel.length
          ? stagePanel
          : priorJudgeIds;
    setWizardKind(kind);
    setWizardProgrammeId(programmeId);
    setSelectedJudgeIds(prefill);
    setJudgingMode("GROUP");
    setNewJudgeName("");
    setIsOpen(true);
  };

  const toggleJudge = (judgeId: string) => {
    setSelectedJudgeIds((prev) =>
      prev.includes(judgeId)
        ? prev.filter((id) => id !== judgeId)
        : [...prev, judgeId],
    );
  };

  const addJudge = () => {
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
          queryKey: queryKeys.judgement.dashboard(festivalId),
        });
        toast.success("Judge added.");
      } catch (error: any) {
        toast.error(error?.message ?? "Failed to add judge.");
      }
    });
  };

  const startJudgement = (programmeId: string | null) => {
    if (!programmeId) return;
    startTransition(async () => {
      try {
        if (wizardKind === "rejudge") {
          await restartJudgementAction({
            festivalId,
            programmeId,
            judgeIds: selectedJudgeIds,
          });
        } else {
          await startJudgementAction({
            festivalId,
            programmeId,
            scoreLimit: POLICY_SCORE_LIMIT,
            judgeIds: selectedJudgeIds,
            judgingMode,
          });
        }
        await queryClient.invalidateQueries({
          queryKey: queryKeys.judgement.dashboard(festivalId),
        });
        toast.success("Judgement started — live on the stage portal now.");
        close();
      } catch (error: any) {
        toast.error(error?.message ?? "Failed to start judgement.");
      }
    });
  };

  const hasUnsavedInputs =
    isOpen && (selectedJudgeIds.length > 0 || newJudgeName.trim().length > 0);

  return {
    isOpen,
    open,
    close,
    isPending,
    wizardKind,
    programmeId: wizardProgrammeId,
    selectedJudgeIds,
    toggleJudge,
    judgingMode,
    setJudgingMode,
    newJudgeName,
    setNewJudgeName,
    addJudge,
    isAddingJudge,
    startJudgement: (id) => startJudgement(id ?? wizardProgrammeId),
    hasUnsavedInputs,
  };
}

// Re-export so callers can decide not to import from `./types` twice.
export { POLICY_SCORE_LIMIT };
