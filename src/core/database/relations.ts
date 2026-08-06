import { relations } from "drizzle-orm/relations";
import {
  accountType,
  category,
  festival,
  festivalCategoryPreference,
  festivalLifecycleEvent,
  festivalMediaImage,
  festivalMediaVideo,
  festivalMember,
  festivalNews,
  festivalPosterTemplate,
  festivalScoringAwardRule,
  festivalScoringPolicy,
  festivalTemplateAssignment,
  festivalTypeEnum,
  group,
  institution,
  judge,
  judgementConfig,
  judgementConfigJudge,
  judgementScore,
  judgeStageAssignment,
  magicLinkToken,
  participant,
  payment,
  pendingInvitation,
  programme,
  programmeAssignment,
  programmeAssignmentMember,
  programmeCodeLetter,
  programmeCodeLetterRecipient,
  programmeNotification,
  programmeReportedParticipant,
  programmeReportingSession,
  programmeTeamLead,
  result,
  scheduleEntry,
  stage,
  stageManagerAssignment,
  stagePortalCredential,
  stagePortalSession,
  user,
  userLoginEvent,
  userPurchaseSummary,
  generalEntryCategory,
  generalEntry,
  generalEntryAward,
} from "./schema";

export const userRelations = relations(user, ({ one, many }) => ({
  institution: one(institution, {
    fields: [user.institutionId],
    references: [institution.id],
  }),
  payments: many(payment),
  festivalMembers: many(festivalMember),
  festivals: many(festival),
  userLoginEvents: many(userLoginEvent),
  userPurchaseSummaries: many(userPurchaseSummary),
  festivalCategoryPreferences: many(festivalCategoryPreference),
  programmeNotifications: many(programmeNotification),
  pendingInvitations: many(pendingInvitation),
}));

export const paymentRelations = relations(payment, ({ one }) => ({
  user: one(user, {
    fields: [payment.userId],
    references: [user.id],
  }),
  festival: one(festival, {
    fields: [payment.festivalId],
    references: [festival.id],
  }),
}));

export const festivalRelations = relations(festival, ({ one, many }) => ({
  payments: many(payment),
  programmes: many(programme),
  groups: many(group),
  festivalMembers: many(festivalMember),
  categories: many(category),
  participants: many(participant),
  festivalNews: many(festivalNews),
  festivalMediaImages: many(festivalMediaImage),
  festivalMediaVideos: many(festivalMediaVideo),
  assignments: many(programmeAssignment),
  user: one(user, {
    fields: [festival.ownerId],
    references: [user.id],
  }),
  institution: one(institution, {
    fields: [festival.institutionId],
    references: [institution.id],
  }),
  results: many(result),
  stages: many(stage),
  scheduleEntries: many(scheduleEntry),
  festivalLifecycleEvents: many(festivalLifecycleEvent),
  programmeReportingSessions: many(programmeReportingSession),
  programmeCodeLetters: many(programmeCodeLetter),
  programmeNotifications: many(programmeNotification),
  judges: many(judge),
  judgementConfigs: many(judgementConfig),
  scoringPolicies: many(festivalScoringPolicy),
  scoringAwardRules: many(festivalScoringAwardRule),
  posterTemplates: many(festivalPosterTemplate),
  templateAssignments: many(festivalTemplateAssignment),
  pendingInvitations: many(pendingInvitation),
  stagePortalCredentials: many(stagePortalCredential),
  stagePortalSessions: many(stagePortalSession),
  generalEntryCategories: many(generalEntryCategory),
  generalEntries: many(generalEntry),
}));

export const festivalPosterTemplateRelations = relations(
  festivalPosterTemplate,
  ({ one }) => ({
    festival: one(festival, {
      fields: [festivalPosterTemplate.festivalId],
      references: [festival.id],
    }),
  }),
);

export const categoryRelations = relations(category, ({ one, many }) => ({
  programmes: many(programme),
  festival: one(festival, {
    fields: [category.festivalId],
    references: [festival.id],
  }),
  participants: many(participant),
  assignments: many(programmeAssignment),
  scoringAwardRules: many(festivalScoringAwardRule),
}));

export const groupRelations = relations(group, ({ one, many }) => ({
  festival: one(festival, {
    fields: [group.festivalId],
    references: [festival.id],
  }),
  participants: many(participant),
  assignments: many(programmeAssignment),
  programmeReportedParticipants: many(programmeReportedParticipant),
  programmeTeamLeads: many(programmeTeamLead),
  generalEntryAwards: many(generalEntryAward),
}));

export const programmeRelations = relations(programme, ({ one, many }) => ({
  festival: one(festival, {
    fields: [programme.festivalId],
    references: [festival.id],
  }),
  category: one(category, {
    fields: [programme.categoryId],
    references: [category.id],
  }),
  assignments: many(programmeAssignment),
  results: many(result),
  scheduleEntries: many(scheduleEntry),
  programmeReportingSessions: many(programmeReportingSession),
  programmeCodeLetters: many(programmeCodeLetter),
  judgementConfigs: many(judgementConfig),
  programmeTeamLeads: many(programmeTeamLead),
}));

export const participantRelations = relations(participant, ({ one, many }) => ({
  festival: one(festival, {
    fields: [participant.festivalId],
    references: [festival.id],
  }),
  group: one(group, {
    fields: [participant.groupId],
    references: [group.id],
  }),
  category: one(category, {
    fields: [participant.categoryId],
    references: [category.id],
  }),
  assignments: many(programmeAssignment),
  programmeAssignmentMembers: many(programmeAssignmentMember),
  programmeReportedParticipants: many(programmeReportedParticipant),
  programmeCodeLetterRecipients: many(programmeCodeLetterRecipient),
  programmeNotifications: many(programmeNotification),
  participantOtps: many(participantOtp),
  participantSessions: many(participantSession),
  programmeTeamLeads: many(programmeTeamLead),
}));

export const stageRelations = relations(stage, ({ one, many }) => ({
  festival: one(festival, {
    fields: [stage.festivalId],
    references: [festival.id],
  }),
  scheduleEntries: many(scheduleEntry),
  programmeReportingSessions: many(programmeReportingSession),
  managerAssignments: many(stageManagerAssignment),
  judgeAssignments: many(judgeStageAssignment),
  portalCredential: one(stagePortalCredential, {
    fields: [stage.id],
    references: [stagePortalCredential.stageId],
  }),
  portalSessions: many(stagePortalSession),
}));

export const stagePortalCredentialRelations = relations(
  stagePortalCredential,
  ({ one }) => ({
    festival: one(festival, {
      fields: [stagePortalCredential.festivalId],
      references: [festival.id],
    }),
    stage: one(stage, {
      fields: [stagePortalCredential.stageId],
      references: [stage.id],
    }),
  }),
);

export const stagePortalSessionRelations = relations(
  stagePortalSession,
  ({ one }) => ({
    festival: one(festival, {
      fields: [stagePortalSession.festivalId],
      references: [festival.id],
    }),
    stage: one(stage, {
      fields: [stagePortalSession.stageId],
      references: [stage.id],
    }),
  }),
);

export const scheduleEntryRelations = relations(
  scheduleEntry,
  ({ one, many }) => ({
    festival: one(festival, {
      fields: [scheduleEntry.festivalId],
      references: [festival.id],
    }),
    programme: one(programme, {
      fields: [scheduleEntry.programmeId],
      references: [programme.id],
    }),
    stage: one(stage, {
      fields: [scheduleEntry.stageId],
      references: [stage.id],
    }),
    programmeReportingSessions: many(programmeReportingSession),

    updaterUser: one(user, {
      fields: [scheduleEntry.updatedBy],
      references: [user.id],
      relationName: "scheduleEntryUpdater",
    }),
  }),
);

export const programmeAssignmentRelations = relations(
  programmeAssignment,
  ({ one, many }) => ({
    programme: one(programme, {
      fields: [programmeAssignment.programmeId],
      references: [programme.id],
    }),
    festival: one(festival, {
      fields: [programmeAssignment.festivalId],
      references: [festival.id],
    }),
    group: one(group, {
      fields: [programmeAssignment.groupId],
      references: [group.id],
    }),
    participant: one(participant, {
      fields: [programmeAssignment.participantId],
      references: [participant.id],
    }),
    category: one(category, {
      fields: [programmeAssignment.categoryId],
      references: [category.id],
    }),
    result: one(result, {
      fields: [programmeAssignment.id],
      references: [result.assignmentId],
    }),
    members: many(programmeAssignmentMember),
    programmeReportedParticipants: many(programmeReportedParticipant),
  }),
);

export const programmeAssignmentMemberRelations = relations(
  programmeAssignmentMember,
  ({ one }) => ({
    assignment: one(programmeAssignment, {
      fields: [programmeAssignmentMember.assignmentId],
      references: [programmeAssignment.id],
    }),
    participant: one(participant, {
      fields: [programmeAssignmentMember.participantId],
      references: [participant.id],
    }),
    festival: one(festival, {
      fields: [programmeAssignmentMember.festivalId],
      references: [festival.id],
    }),
  }),
);

export const programmeTeamLeadRelations = relations(
  programmeTeamLead,
  ({ one }) => ({
    programme: one(programme, {
      fields: [programmeTeamLead.programmeId],
      references: [programme.id],
    }),
    group: one(group, {
      fields: [programmeTeamLead.groupId],
      references: [group.id],
    }),
    participant: one(participant, {
      fields: [programmeTeamLead.participantId],
      references: [participant.id],
    }),
  }),
);

export const resultRelations = relations(result, ({ one }) => ({
  festival: one(festival, {
    fields: [result.festivalId],
    references: [festival.id],
  }),
  programme: one(programme, {
    fields: [result.programmeId],
    references: [programme.id],
  }),
  programmeAssignment: one(programmeAssignment, {
    fields: [result.assignmentId],
    references: [programmeAssignment.id],
  }),
}));

export const festivalScoringPolicyRelations = relations(
  festivalScoringPolicy,
  ({ one, many }) => ({
    festival: one(festival, {
      fields: [festivalScoringPolicy.festivalId],
      references: [festival.id],
    }),
    awardRules: many(festivalScoringAwardRule),
  }),
);

export const festivalScoringAwardRuleRelations = relations(
  festivalScoringAwardRule,
  ({ one }) => ({
    festival: one(festival, {
      fields: [festivalScoringAwardRule.festivalId],
      references: [festival.id],
    }),
    scoringPolicy: one(festivalScoringPolicy, {
      fields: [festivalScoringAwardRule.scoringPolicyId],
      references: [festivalScoringPolicy.id],
    }),
    category: one(category, {
      fields: [festivalScoringAwardRule.categoryId],
      references: [category.id],
    }),
  }),
);

export const programmeReportingSessionRelations = relations(
  programmeReportingSession,
  ({ one, many }) => ({
    festival: one(festival, {
      fields: [programmeReportingSession.festivalId],
      references: [festival.id],
    }),
    scheduleEntry: one(scheduleEntry, {
      fields: [programmeReportingSession.scheduleEntryId],
      references: [scheduleEntry.id],
    }),
    programme: one(programme, {
      fields: [programmeReportingSession.programmeId],
      references: [programme.id],
    }),
    stage: one(stage, {
      fields: [programmeReportingSession.stageId],
      references: [stage.id],
    }),
    programmeReportedParticipants: many(programmeReportedParticipant),
    programmeCodeLetters: many(programmeCodeLetter),
  }),
);

export const programmeReportedParticipantRelations = relations(
  programmeReportedParticipant,
  ({ one }) => ({
    programmeReportingSession: one(programmeReportingSession, {
      fields: [programmeReportedParticipant.reportingSessionId],
      references: [programmeReportingSession.id],
    }),
    programmeAssignment: one(programmeAssignment, {
      fields: [programmeReportedParticipant.assignmentId],
      references: [programmeAssignment.id],
    }),
    participant: one(participant, {
      fields: [programmeReportedParticipant.participantId],
      references: [participant.id],
    }),
    group: one(group, {
      fields: [programmeReportedParticipant.groupId],
      references: [group.id],
    }),
  }),
);

export const programmeCodeLetterRelations = relations(
  programmeCodeLetter,
  ({ one, many }) => ({
    programmeCodeLetterRecipients: many(programmeCodeLetterRecipient),
    festival: one(festival, {
      fields: [programmeCodeLetter.festivalId],
      references: [festival.id],
    }),
    programmeReportingSession: one(programmeReportingSession, {
      fields: [programmeCodeLetter.reportingSessionId],
      references: [programmeReportingSession.id],
    }),
    programme: one(programme, {
      fields: [programmeCodeLetter.programmeId],
      references: [programme.id],
    }),
    judgementScores: many(judgementScore),
  }),
);

export const programmeCodeLetterRecipientRelations = relations(
  programmeCodeLetterRecipient,
  ({ one }) => ({
    programmeCodeLetter: one(programmeCodeLetter, {
      fields: [programmeCodeLetterRecipient.codeLetterId],
      references: [programmeCodeLetter.id],
    }),
    participant: one(participant, {
      fields: [programmeCodeLetterRecipient.participantId],
      references: [participant.id],
    }),
  }),
);

export const judgeRelations = relations(judge, ({ one, many }) => ({
  festival: one(festival, {
    fields: [judge.festivalId],
    references: [festival.id],
  }),
  judgementConfigJudges: many(judgementConfigJudge),
  judgementScores: many(judgementScore),
  stageAssignments: many(judgeStageAssignment),
}));

export const judgementConfigRelations = relations(
  judgementConfig,
  ({ one, many }) => ({
    festival: one(festival, {
      fields: [judgementConfig.festivalId],
      references: [festival.id],
    }),
    programme: one(programme, {
      fields: [judgementConfig.programmeId],
      references: [programme.id],
    }),
    programmeReportingSession: one(programmeReportingSession, {
      fields: [judgementConfig.reportingSessionId],
      references: [programmeReportingSession.id],
    }),
    judges: many(judgementConfigJudge),
    scores: many(judgementScore),
  }),
);

export const judgementConfigJudgeRelations = relations(
  judgementConfigJudge,
  ({ one }) => ({
    judgementConfig: one(judgementConfig, {
      fields: [judgementConfigJudge.configId],
      references: [judgementConfig.id],
    }),
    judge: one(judge, {
      fields: [judgementConfigJudge.judgeId],
      references: [judge.id],
    }),
  }),
);

export const judgementScoreRelations = relations(judgementScore, ({ one }) => ({
  judgementConfig: one(judgementConfig, {
    fields: [judgementScore.configId],
    references: [judgementConfig.id],
  }),
  judge: one(judge, {
    fields: [judgementScore.judgeId],
    references: [judge.id],
  }),
  programmeCodeLetter: one(programmeCodeLetter, {
    fields: [judgementScore.codeLetterId],
    references: [programmeCodeLetter.id],
  }),
}));

export const festivalMemberRelations = relations(
  festivalMember,
  ({ one, many }) => ({
    festival: one(festival, {
      fields: [festivalMember.festivalId],
      references: [festival.id],
    }),
    user: one(user, {
      fields: [festivalMember.userId],
      references: [user.id],
    }),
    stageAssignments: many(stageManagerAssignment),
  }),
);

export const stageManagerAssignmentRelations = relations(
  stageManagerAssignment,
  ({ one }) => ({
    festival: one(festival, {
      fields: [stageManagerAssignment.festivalId],
      references: [festival.id],
    }),
    stage: one(stage, {
      fields: [stageManagerAssignment.stageId],
      references: [stage.id],
    }),
    member: one(festivalMember, {
      fields: [stageManagerAssignment.memberId],
      references: [festivalMember.id],
    }),
  }),
);

export const judgeStageAssignmentRelations = relations(
  judgeStageAssignment,
  ({ one }) => ({
    festival: one(festival, {
      fields: [judgeStageAssignment.festivalId],
      references: [festival.id],
    }),
    stage: one(stage, {
      fields: [judgeStageAssignment.stageId],
      references: [stage.id],
    }),
    judge: one(judge, {
      fields: [judgeStageAssignment.judgeId],
      references: [judge.id],
    }),
  }),
);

export const festivalNewsRelations = relations(festivalNews, ({ one }) => ({
  festival: one(festival, {
    fields: [festivalNews.festivalId],
    references: [festival.id],
  }),
}));

export const festivalMediaImageRelations = relations(
  festivalMediaImage,
  ({ one }) => ({
    festival: one(festival, {
      fields: [festivalMediaImage.festivalId],
      references: [festival.id],
    }),
  }),
);

export const festivalMediaVideoRelations = relations(
  festivalMediaVideo,
  ({ one }) => ({
    festival: one(festival, {
      fields: [festivalMediaVideo.festivalId],
      references: [festival.id],
    }),
  }),
);

export const userLoginEventRelations = relations(userLoginEvent, ({ one }) => ({
  user: one(user, {
    fields: [userLoginEvent.userId],
    references: [user.id],
  }),
}));

export const userPurchaseSummaryRelations = relations(
  userPurchaseSummary,
  ({ one }) => ({
    user: one(user, {
      fields: [userPurchaseSummary.userId],
      references: [user.id],
    }),
  }),
);

export const festivalCategoryPreferenceRelations = relations(
  festivalCategoryPreference,
  ({ one }) => ({
    user: one(user, {
      fields: [festivalCategoryPreference.userId],
      references: [user.id],
    }),
  }),
);

export const festivalLifecycleEventRelations = relations(
  festivalLifecycleEvent,
  ({ one }) => ({
    festival: one(festival, {
      fields: [festivalLifecycleEvent.festivalId],
      references: [festival.id],
    }),
  }),
);

export const programmeNotificationRelations = relations(
  programmeNotification,
  ({ one }) => ({
    festival: one(festival, {
      fields: [programmeNotification.festivalId],
      references: [festival.id],
    }),
    user: one(user, {
      fields: [programmeNotification.recipientUserId],
      references: [user.id],
    }),
    participant: one(participant, {
      fields: [programmeNotification.recipientParticipantId],
      references: [participant.id],
    }),
  }),
);

export const institutionRelations = relations(institution, ({ one, many }) => ({
  owner: one(user, {
    fields: [institution.ownerId],
    references: [user.id],
  }),
  users: many(user),
  festivals: many(festival),
}));

export const magicLinkTokenRelations = relations(magicLinkToken, () => ({}));

export const pendingInvitationRelations = relations(
  pendingInvitation,
  ({ one }) => ({
    festival: one(festival, {
      fields: [pendingInvitation.festivalId],
      references: [festival.id],
    }),
    inviter: one(user, {
      fields: [pendingInvitation.invitedBy],
      references: [user.id],
    }),
  }),
);

import { participantOtp, participantSession } from "./schema";

export const participantSessionRelations = relations(
  participantSession,
  ({ one }) => ({
    participant: one(participant, {
      fields: [participantSession.participantId],
      references: [participant.id],
    }),
    festival: one(festival, {
      fields: [participantSession.festivalId],
      references: [festival.id],
    }),
  }),
);

export const participantOtpRelations = relations(participantOtp, ({ one }) => ({
  participant: one(participant, {
    fields: [participantOtp.participantId],
    references: [participant.id],
  }),
}));

export const festivalTemplateAssignmentRelations = relations(
  festivalTemplateAssignment,
  ({ one }) => ({
    festival: one(festival, {
      fields: [festivalTemplateAssignment.festivalId],
      references: [festival.id],
    }),
  }),
);

export const generalEntryCategoryRelations = relations(
  generalEntryCategory,
  ({ one, many }) => ({
    festival: one(festival, {
      fields: [generalEntryCategory.festivalId],
      references: [festival.id],
    }),
    generalEntries: many(generalEntry),
  }),
);

export const generalEntryRelations = relations(
  generalEntry,
  ({ one, many }) => ({
    festival: one(festival, {
      fields: [generalEntry.festivalId],
      references: [festival.id],
    }),
    category: one(generalEntryCategory, {
      fields: [generalEntry.categoryId],
      references: [generalEntryCategory.id],
    }),
    awards: many(generalEntryAward),
  }),
);

export const generalEntryAwardRelations = relations(
  generalEntryAward,
  ({ one }) => ({
    generalEntry: one(generalEntry, {
      fields: [generalEntryAward.generalEntryId],
      references: [generalEntry.id],
    }),
    group: one(group, {
      fields: [generalEntryAward.groupId],
      references: [group.id],
    }),
  }),
);
