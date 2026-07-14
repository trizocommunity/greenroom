import { relations } from "drizzle-orm/relations";
import {
  category,
  expiredFestivalResult,
  festival,
  festivalCategoryPreference,
  festivalGalleryImage,
  festivalLifecycleEvent,
  festivalMember,
  festivalNews,
  festivalPosterTemplate,
  festivalScoringAwardRule,
  festivalScoringPolicy,
  group,
  judge,
  judgmentConfig,
  judgmentConfigJudge,
  judgmentLink,
  judgmentScore,
  passwordResetToken,
  payment,
  programme,
  programmeAssignment,
  programmeCodeLetter,
  programmeCodeLetterRecipient,
  programmeJudgeSession,
  programmeNotification,
  programmeReportedParticipant,
  programmeReportingSession,
  realtimeOutbox,
  result,
  scheduleEntry,
  stage,
  student,
  teamLeaderOtp,
  teamLeaderSession,
  user,
  userLoginEvent,
  userPurchaseSummary,
} from "./schema";

export const passwordResetTokenRelations = relations(
  passwordResetToken,
  ({ one }) => ({
    user: one(user, {
      fields: [passwordResetToken.userId],
      references: [user.id],
    }),
  }),
);

export const userRelations = relations(user, ({ many }) => ({
  passwordResetTokens: many(passwordResetToken),
  payments: many(payment),
  festivalMembers: many(festivalMember),
  festivals: many(festival),
  userLoginEvents: many(userLoginEvent),
  userPurchaseSummaries: many(userPurchaseSummary),
  festivalCategoryPreferences: many(festivalCategoryPreference),
  programmeNotifications: many(programmeNotification),
  realtimeOutboxes: many(realtimeOutbox),
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
  students: many(student),
  festivalNews: many(festivalNews),
  festivalGalleryImages: many(festivalGalleryImage),
  assignments: many(programmeAssignment),
  user: one(user, {
    fields: [festival.ownerId],
    references: [user.id],
  }),
  results: many(result),
  stages: many(stage),
  scheduleEntries: many(scheduleEntry),
  expiredFestivalResults: many(expiredFestivalResult),
  festivalLifecycleEvents: many(festivalLifecycleEvent),
  teamLeaderSessions: many(teamLeaderSession),
  programmeReportingSessions: many(programmeReportingSession),
  programmeCodeLetters: many(programmeCodeLetter),
  programmeNotifications: many(programmeNotification),
  realtimeOutboxes: many(realtimeOutbox),
  programmeJudgeSessions: many(programmeJudgeSession),
  judges: many(judge),
  judgmentConfigs: many(judgmentConfig),
  scoringPolicies: many(festivalScoringPolicy),
  scoringAwardRules: many(festivalScoringAwardRule),
  posterTemplates: many(festivalPosterTemplate),
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
  students: many(student),
  assignments: many(programmeAssignment),
  scoringAwardRules: many(festivalScoringAwardRule),
}));

export const groupRelations = relations(group, ({ one, many }) => ({
  festival: one(festival, {
    fields: [group.festivalId],
    references: [festival.id],
  }),
  students: many(student),
  assignments: many(programmeAssignment),
  programmeReportedParticipants: many(programmeReportedParticipant),
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
  programmeJudgeSessions: many(programmeJudgeSession),
  judgmentConfigs: many(judgmentConfig),
}));

export const studentRelations = relations(student, ({ one, many }) => ({
  festival: one(festival, {
    fields: [student.festivalId],
    references: [festival.id],
  }),
  group: one(group, {
    fields: [student.groupId],
    references: [group.id],
  }),
  category: one(category, {
    fields: [student.categoryId],
    references: [category.id],
  }),
  assignments: many(programmeAssignment),
  teamLeaderOtps: many(teamLeaderOtp),
  teamLeaderSessions: many(teamLeaderSession),
  programmeReportedParticipants: many(programmeReportedParticipant),
  programmeCodeLetterRecipients: many(programmeCodeLetterRecipient),
  programmeNotifications: many(programmeNotification),
}));

export const stageRelations = relations(stage, ({ one, many }) => ({
  festival: one(festival, {
    fields: [stage.festivalId],
    references: [festival.id],
  }),
  scheduleEntries: many(scheduleEntry),
  programmeReportingSessions: many(programmeReportingSession),
}));

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
    student: one(student, {
      fields: [programmeAssignment.studentId],
      references: [student.id],
    }),
    category: one(category, {
      fields: [programmeAssignment.categoryId],
      references: [category.id],
    }),
    result: one(result, {
      fields: [programmeAssignment.id],
      references: [result.assignmentId],
    }),
    programmeReportedParticipants: many(programmeReportedParticipant),
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
    programmeJudgeSessions: many(programmeJudgeSession),
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
    student: one(student, {
      fields: [programmeReportedParticipant.studentId],
      references: [student.id],
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
    judgmentScores: many(judgmentScore),
  }),
);

export const programmeCodeLetterRecipientRelations = relations(
  programmeCodeLetterRecipient,
  ({ one }) => ({
    programmeCodeLetter: one(programmeCodeLetter, {
      fields: [programmeCodeLetterRecipient.codeLetterId],
      references: [programmeCodeLetter.id],
    }),
    student: one(student, {
      fields: [programmeCodeLetterRecipient.studentId],
      references: [student.id],
    }),
  }),
);

export const programmeJudgeSessionRelations = relations(
  programmeJudgeSession,
  ({ one }) => ({
    festival: one(festival, {
      fields: [programmeJudgeSession.festivalId],
      references: [festival.id],
    }),
    programme: one(programme, {
      fields: [programmeJudgeSession.programmeId],
      references: [programme.id],
    }),
    programmeReportingSession: one(programmeReportingSession, {
      fields: [programmeJudgeSession.reportingSessionId],
      references: [programmeReportingSession.id],
    }),
  }),
);

export const judgeRelations = relations(judge, ({ one, many }) => ({
  festival: one(festival, {
    fields: [judge.festivalId],
    references: [festival.id],
  }),
  judgmentConfigJudges: many(judgmentConfigJudge),
  judgmentScores: many(judgmentScore),
}));

export const judgmentConfigRelations = relations(
  judgmentConfig,
  ({ one, many }) => ({
    festival: one(festival, {
      fields: [judgmentConfig.festivalId],
      references: [festival.id],
    }),
    programme: one(programme, {
      fields: [judgmentConfig.programmeId],
      references: [programme.id],
    }),
    programmeReportingSession: one(programmeReportingSession, {
      fields: [judgmentConfig.reportingSessionId],
      references: [programmeReportingSession.id],
    }),
    judges: many(judgmentConfigJudge),
    links: many(judgmentLink),
    scores: many(judgmentScore),
  }),
);

export const judgmentConfigJudgeRelations = relations(
  judgmentConfigJudge,
  ({ one }) => ({
    judgmentConfig: one(judgmentConfig, {
      fields: [judgmentConfigJudge.configId],
      references: [judgmentConfig.id],
    }),
    judge: one(judge, {
      fields: [judgmentConfigJudge.judgeId],
      references: [judge.id],
    }),
  }),
);

export const judgmentLinkRelations = relations(
  judgmentLink,
  ({ one, many }) => ({
    judgmentConfig: one(judgmentConfig, {
      fields: [judgmentLink.configId],
      references: [judgmentConfig.id],
    }),
    scores: many(judgmentScore),
  }),
);

export const judgmentScoreRelations = relations(judgmentScore, ({ one }) => ({
  judgmentConfig: one(judgmentConfig, {
    fields: [judgmentScore.configId],
    references: [judgmentConfig.id],
  }),
  judgmentLink: one(judgmentLink, {
    fields: [judgmentScore.linkId],
    references: [judgmentLink.id],
  }),
  judge: one(judge, {
    fields: [judgmentScore.judgeId],
    references: [judge.id],
  }),
  programmeCodeLetter: one(programmeCodeLetter, {
    fields: [judgmentScore.codeLetterId],
    references: [programmeCodeLetter.id],
  }),
}));

export const festivalMemberRelations = relations(festivalMember, ({ one }) => ({
  festival: one(festival, {
    fields: [festivalMember.festivalId],
    references: [festival.id],
  }),
  user: one(user, {
    fields: [festivalMember.userId],
    references: [user.id],
  }),
}));

export const festivalNewsRelations = relations(festivalNews, ({ one }) => ({
  festival: one(festival, {
    fields: [festivalNews.festivalId],
    references: [festival.id],
  }),
}));

export const festivalGalleryImageRelations = relations(
  festivalGalleryImage,
  ({ one }) => ({
    festival: one(festival, {
      fields: [festivalGalleryImage.festivalId],
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

export const expiredFestivalResultRelations = relations(
  expiredFestivalResult,
  ({ one }) => ({
    festival: one(festival, {
      fields: [expiredFestivalResult.festivalId],
      references: [festival.id],
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

export const teamLeaderOtpRelations = relations(teamLeaderOtp, ({ one }) => ({
  student: one(student, {
    fields: [teamLeaderOtp.studentId],
    references: [student.id],
  }),
}));

export const teamLeaderSessionRelations = relations(
  teamLeaderSession,
  ({ one }) => ({
    student: one(student, {
      fields: [teamLeaderSession.studentId],
      references: [student.id],
    }),
    festival: one(festival, {
      fields: [teamLeaderSession.festivalId],
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
    student: one(student, {
      fields: [programmeNotification.recipientStudentId],
      references: [student.id],
    }),
  }),
);

export const realtimeOutboxRelations = relations(realtimeOutbox, ({ one }) => ({
  festival: one(festival, {
    fields: [realtimeOutbox.festivalId],
    references: [festival.id],
  }),
  user: one(user, {
    fields: [realtimeOutbox.actorUserId],
    references: [user.id],
  }),
}));
