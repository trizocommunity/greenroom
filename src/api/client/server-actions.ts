import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  deleteTeamAssignmentAction,
  getProgrammeTeamMembersAction,
} from "@/features/assignments/actions/assignment.actions";
import {
  updateFestivalBrandingAction,
  updateFestivalSettingsAction,
} from "@/features/festivals/actions/festival-crud.actions";
import {
  previewJudgeSubmissionSummaryAction,
  submitGroupJudgeScoresAction,
  submitJudgeScoresAction,
  verifyJudgmentLinkPinAction,
} from "@/features/judgment/actions/judgment.actions";
import {
  clearAllPosterTemplatesAction,
  deletePosterTemplateDraftAction,
  getEditorPreviewBindingsAction,
  getPosterTemplateAction,
  getPublishedResultTemplatesAction,
  listPosterTemplatesAction,
  publishPosterTemplateAction,
  savePosterTemplateDraftAction,
  unpublishPosterTemplateAction,
} from "@/features/posters/actions/poster-template.actions";
import { bulkCreateProgrammesAction } from "@/features/programmes/actions/programme.actions";
import { createProgrammeJudgeLinkAction } from "@/features/programmes/actions/programme-judging.actions";
import {
  assignCodeLettersWithSpinAction,
  closeProgrammeReportingAction,
  getReportingStatsAction,
  markProgrammeAssignmentsBulkAction,
  markProgrammeParticipantAction,
  reopenProgrammeReportingAction,
  reopenProgrammeReportingByProgrammeAction,
  resetProgrammeReportingAction,
  resetSpinCodeLettersAction,
  scanAndReportStudentAction,
  startProgrammeReportingAction,
} from "@/features/programmes/actions/programme-reporting.actions";
import { saveBasicProgrammeScoresAction } from "@/features/results/actions/results.actions";
import type { BasicScoreRow } from "@/features/results/services/basic-scoring.service";
import {
  createScheduleEntry,
  deleteScheduleEntry,
  reorderScheduleEntries,
  updateScheduleEntry,
} from "@/features/schedule/actions/schedule.actions";
import { exportStudentsQrPdfAction } from "@/features/students/actions/qr.actions";
import { queryKeys } from "./_query-keys";

export function useVerifyJudgmentLinkPin() {
  return useMutation({
    mutationFn: async (input: {
      token: string;
      pin: string;
      deviceId?: string | null;
    }) => {
      return verifyJudgmentLinkPinAction(input);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useSubmitJudgeScores() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      token: string;
      judgeId: string;
      scoresByCodeLetterId: Record<string, number>;
      options?: { deactivateLink?: boolean };
    }) => {
      return submitJudgeScoresAction(
        {
          token: input.token,
          judgeId: input.judgeId,
          scoresByCodeLetterId: input.scoresByCodeLetterId,
        },
        input.options,
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["results"] });
    },
  });
}

export function useSubmitGroupJudgeScores() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      token: string;
      scoresByJudgeId: Record<string, Record<string, number>>;
    }) => {
      return submitGroupJudgeScoresAction({
        token: input.token,
        scoresByJudgeId: input.scoresByJudgeId,
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["results"] });
    },
  });
}

export function usePreviewJudgeSubmission() {
  return useMutation({
    mutationFn: async (input: {
      token: string;
      scoresByJudgeId: Record<string, Record<string, number>>;
    }) => {
      return previewJudgeSubmissionSummaryAction(input);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useSaveBasicProgrammeScores() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      festivalId: string;
      programmeId: string;
      rows: BasicScoreRow[];
    }) => {
      return saveBasicProgrammeScoresAction(input);
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: queryKeys.results.all(input.festivalId, input.programmeId),
      });
    },
  });
}

export function useCreateProgrammeJudgeLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { festivalId: string; programmeId: string }) => {
      return createProgrammeJudgeLinkAction(
        input.festivalId,
        input.programmeId,
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: queryKeys.judges.all(input.festivalId),
      });
    },
  });
}

export function useReopenProgrammeReporting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { festivalId: string; programmeId: string }) => {
      return reopenProgrammeReportingByProgrammeAction(
        input.festivalId,
        input.programmeId,
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: ["reporting-stats", input.festivalId],
      });
    },
  });
}

export function useAssignCodeLettersWithSpin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      festivalId: string;
      reportingSessionId: string;
      codeAssignments: Array<{
        teamNumber: number | null;
        groupId?: string | null;
        studentId?: string | null;
        code: string;
      }>;
    }) => {
      return assignCodeLettersWithSpinAction(
        input.festivalId,
        input.reportingSessionId,
        input.codeAssignments,
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: [
          "reporting-stats",
          input.festivalId,
          input.reportingSessionId,
        ],
      });
    },
  });
}

export function useStartProgrammeReporting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      festivalId: string;
      scheduleEntryId: string;
    }) => {
      return startProgrammeReportingAction(
        input.festivalId,
        input.scheduleEntryId,
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: ["reporting-stats", input.festivalId],
      });
    },
  });
}

export function useResetProgrammeReporting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      festivalId: string;
      reportingSessionId: string;
    }) => {
      return resetProgrammeReportingAction(
        input.festivalId,
        input.reportingSessionId,
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: [
          "reporting-stats",
          input.festivalId,
          input.reportingSessionId,
        ],
      });
    },
  });
}

export function useResetSpinCodeLetters() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      festivalId: string;
      reportingSessionId: string;
    }) => {
      return resetSpinCodeLettersAction(
        input.festivalId,
        input.reportingSessionId,
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: [
          "reporting-stats",
          input.festivalId,
          input.reportingSessionId,
        ],
      });
    },
  });
}

export function useCloseProgrammeReporting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      festivalId: string;
      reportingSessionId: string;
    }) => {
      return closeProgrammeReportingAction(
        input.festivalId,
        input.reportingSessionId,
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: [
          "reporting-stats",
          input.festivalId,
          input.reportingSessionId,
        ],
      });
    },
  });
}

export function useReopenProgrammeReportingSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      festivalId: string;
      reportingSessionId: string;
    }) => {
      return reopenProgrammeReportingAction(
        input.festivalId,
        input.reportingSessionId,
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: [
          "reporting-stats",
          input.festivalId,
          input.reportingSessionId,
        ],
      });
    },
  });
}

export function useMarkProgrammeParticipant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      festivalId: string;
      reportingSessionId: string;
      assignmentId: string;
      isReported: boolean;
    }) => {
      return markProgrammeParticipantAction(
        input.festivalId,
        input.reportingSessionId,
        input.assignmentId,
        input.isReported,
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: [
          "reporting-stats",
          input.festivalId,
          input.reportingSessionId,
        ],
      });
    },
  });
}

export function useMarkProgrammeAssignmentsBulk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      festivalId: string;
      reportingSessionId: string;
      assignmentIds: string[];
      isReported: boolean;
    }) => {
      return markProgrammeAssignmentsBulkAction(
        input.festivalId,
        input.reportingSessionId,
        input.assignmentIds,
        input.isReported,
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: [
          "reporting-stats",
          input.festivalId,
          input.reportingSessionId,
        ],
      });
    },
  });
}

export function useScanAndReportStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      festivalId: string;
      reportingSessionId: string;
      chestNumber: string;
    }) => {
      return scanAndReportStudentAction(
        input.festivalId,
        input.reportingSessionId,
        input.chestNumber,
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: [
          "reporting-stats",
          input.festivalId,
          input.reportingSessionId,
        ],
      });
    },
  });
}

export function useReorderScheduleEntries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { festivalId: string; entryIds: string[] }) => {
      return reorderScheduleEntries(input.festivalId, input.entryIds);
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: queryKeys.schedule.all(input.festivalId),
      });
    },
  });
}

export function useDeleteScheduleEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { festivalId: string; id: string }) => {
      return deleteScheduleEntry(input.festivalId, input.id);
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: queryKeys.schedule.all(input.festivalId),
      });
    },
  });
}

export function useCreateScheduleEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      festivalId: string;
      data: {
        type: "PROGRAMME" | "SESSION";
        programmeId?: string | null;
        stageId?: string | null;
        title?: string | null;
        description?: string | null;
        speakers?: string | null;
        sessionType?: "GENERAL" | "CEREMONY" | "TALK" | "CONCERT" | null;
        startTime: Date;
        endTime?: Date | null;
        order?: number;
        scheduleDayKey?: string | null;
      };
    }) => {
      return createScheduleEntry(input.festivalId, input.data);
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: queryKeys.schedule.all(input.festivalId),
      });
    },
  });
}

export function useUpdateScheduleEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      festivalId: string;
      id: string;
      data: {
        programmeId?: string | null;
        stageId?: string | null;
        title?: string | null;
        description?: string | null;
        speakers?: string | null;
        sessionType?: "GENERAL" | "CEREMONY" | "TALK" | "CONCERT" | null;
        startTime?: Date;
        endTime?: Date | null;
        order?: number;
        scheduleDayKey?: string | null;
      };
    }) => {
      return updateScheduleEntry(input.festivalId, input.id, input.data);
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: queryKeys.schedule.all(input.festivalId),
      });
    },
  });
}

export function useUpdateFestivalBranding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { festivalId: string; logo?: string | null }) => {
      return updateFestivalBrandingAction(input);
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: queryKeys.festivals.detail(input.festivalId),
      });
    },
  });
}

export function useUpdateFestivalSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      festivalId: string;
      data: {
        programmeAssignmentDeadline?: string | null;
        teamLeaderLimit?: number;
        announcerResultsPerStandings?: number;
        startDate?: string | null;
        endDate?: string | null;
        scoringSystem?: "POSITION_BASED" | "SCORE_BASED" | null;
        publicDisplayMode?: "programme_results" | "team_standings" | null;
        chestNumberSettings?: {
          autoGenerate?: boolean;
          prefix?: string;
          padding?: number;
        } | null;
      };
    }) => {
      return updateFestivalSettingsAction(input.festivalId, input.data);
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: queryKeys.festivals.detail(input.festivalId),
      });
    },
  });
}

export function useListPosterTemplates(festivalId: string) {
  return useQuery({
    queryKey: ["poster-templates", festivalId],
    queryFn: async () => listPosterTemplatesAction(festivalId),
    enabled: !!festivalId,
  });
}

export function usePosterTemplate(festivalId: string, code: string) {
  return useQuery({
    queryKey: ["poster-template", festivalId, code],
    queryFn: async () => getPosterTemplateAction(festivalId, code),
    enabled: !!festivalId && !!code,
  });
}

export function useEditorPreviewBindings(
  festivalId: string,
  templateType: string,
) {
  return useQuery({
    queryKey: ["editor-preview-bindings", festivalId, templateType],
    queryFn: async () =>
      getEditorPreviewBindingsAction(festivalId, templateType as any),
    enabled: !!festivalId && !!templateType,
  });
}

export function usePublishedResultTemplates(festivalId: string) {
  return useQuery({
    queryKey: ["published-result-templates", festivalId],
    queryFn: async () => getPublishedResultTemplatesAction(festivalId),
    enabled: !!festivalId,
  });
}

export function useUnpublishPosterTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      festivalId: string;
      code: string;
      festivalSlug: string;
    }) => {
      return unpublishPosterTemplateAction(
        input.festivalId,
        input.code,
        input.festivalSlug,
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: ["poster-templates", input.festivalId],
      });
      qc.invalidateQueries({
        queryKey: ["published-result-templates", input.festivalId],
      });
    },
  });
}

export function useDeletePosterTemplateDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      festivalId: string;
      code: string;
      festivalSlug: string;
    }) => {
      return deletePosterTemplateDraftAction(
        input.festivalId,
        input.code,
        input.festivalSlug,
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: ["poster-templates", input.festivalId],
      });
    },
  });
}

export function useClearAllPosterTemplates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { festivalId: string; festivalSlug: string }) => {
      return clearAllPosterTemplatesAction(
        input.festivalId,
        input.festivalSlug,
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: ["poster-templates", input.festivalId],
      });
    },
  });
}

export function useSavePosterTemplateDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      input: {
        festivalId: string;
        code: string;
        document: any;
        backgroundUrl?: string | null;
        meta?: Record<string, unknown>;
      };
      festivalSlug: string;
    }) => {
      return savePosterTemplateDraftAction(input.input, input.festivalSlug);
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: ["poster-templates", input.input.festivalId],
      });
    },
  });
}

export function usePublishPosterTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      festivalId: string;
      code: string;
      festivalSlug: string;
    }) => {
      return publishPosterTemplateAction(
        input.festivalId,
        input.code,
        input.festivalSlug,
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: ["poster-templates", input.festivalId],
      });
      qc.invalidateQueries({
        queryKey: ["published-result-templates", input.festivalId],
      });
    },
  });
}

export function useBulkCreateProgrammes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      festivalId: string;
      programmes: Array<{
        name: string;
        categoryId: string;
        type: string;
        stageType: string;
        maxParticipantsPerGroup?: number;
        maxTeamsPerGroup?: number;
        maxStudentsPerTeam?: number;
      }>;
    }) => {
      return bulkCreateProgrammesAction(input.festivalId, input.programmes);
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: queryKeys.programmes.all(input.festivalId),
      });
    },
  });
}

export function useExportStudentsQrPdf() {
  return useMutation({
    mutationFn: async (festivalId: string) => {
      return exportStudentsQrPdfAction(festivalId);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteTeamAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      festivalId: string;
      programmeId: string;
      groupId: string;
      teamNumber: number;
    }) => {
      return deleteTeamAssignmentAction(
        input.festivalId,
        input.programmeId,
        input.groupId,
        input.teamNumber,
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: queryKeys.assignments.all(input.festivalId),
      });
      qc.invalidateQueries({
        queryKey: [
          "programme-team-members",
          input.festivalId,
          input.programmeId,
          input.groupId,
          input.teamNumber,
        ],
      });
    },
  });
}

export function useProgrammeTeamMembers(
  festivalId: string,
  programmeId: string,
  groupId: string,
  teamNumber: number,
) {
  return useQuery({
    queryKey: [
      "programme-team-members",
      festivalId,
      programmeId,
      groupId,
      teamNumber,
    ],
    queryFn: async () =>
      getProgrammeTeamMembersAction(
        festivalId,
        programmeId,
        groupId,
        teamNumber,
      ),
    enabled: !!festivalId && !!programmeId && !!groupId && teamNumber > 0,
  });
}

export function useReportingStats(
  festivalId: string,
  reportingSessionId: string,
) {
  return useQuery({
    queryKey: ["reporting-stats", festivalId, reportingSessionId],
    queryFn: async () =>
      getReportingStatsAction(festivalId, reportingSessionId),
    enabled: !!festivalId && !!reportingSessionId,
  });
}
