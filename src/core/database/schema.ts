import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import {
  currentTimestampSql,
  tzTimestamp,
  tzTimestampNamed,
} from "@/core/datetime";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const categoryType = pgEnum("CategoryType", ["SINGLE", "GENERAL"]);
export const festivalLifecycleEventType = pgEnum("FestivalLifecycleEventType", [
  "CREATED",
  "ACTIVATED",
  "EXPIRED",
]);
export const festivalRole = pgEnum("FestivalRole", [
  "ADMIN",
  "ANNOUNCER",
  "STAGE_MANAGER",
  "MEDIA",
]);
export const posterTemplateType = pgEnum("PosterTemplateType", [
  "RESULT",
  "TEAM_POINTS",
  "CANDIDATE_CARD",
]);
export const posterTemplateStatus = pgEnum("PosterTemplateStatus", [
  "DRAFT",
  "PUBLISHED",
]);
export const festivalStatus = pgEnum("FestivalStatus", [
  "READY",
  "ONGOING",
  "PAST",
  "EXPIRED",
]);
export const gender = pgEnum("Gender", ["MALE", "FEMALE", "OTHER"]);
export const globalRole = pgEnum("GlobalRole", ["USER", "SUPER_ADMIN"]);
export const groupType = pgEnum("GroupType", [
  "SCHOOL",
  "COLLEGE",
  "MADRASA",
  "OPEN",
]);
export const institutionType = pgEnum("InstitutionType", [
  "COLLEGE",
  "MADRASA",
  "SCHOOL",
  "OTHER",
  "UNIVERSITY",
  "INSTITUTION",
  "CAMPUS",
  "DARS",
]);
export const paymentPurpose = pgEnum("PaymentPurpose", ["FESTIVAL_CREATION"]);
export const paymentStatus = pgEnum("PaymentStatus", [
  "PENDING",
  "PAID",
  "FAILED",
]);
export const programmeNotificationEventType = pgEnum(
  "ProgrammeNotificationEventType",
  [
    "REPORTING_STARTED",
    "REPORTING_RESET",
    "REPORTING_PARTICIPANT_MARKED",
    "REPORTING_CLOSED",
    "CODE_LETTER_ISSUED",
    "PROGRAMME_STATUS_CHANGED",
  ],
);
export const programmeReportingStatus = pgEnum("ProgrammeReportingStatus", [
  "NOT_STARTED",
  "IN_PROGRESS",
  "RESET",
  "CLOSED",
]);
export const programmeStatus = pgEnum("ProgrammeStatus", [
  "READY",
  "ASSIGNED",
  "SCHEDULED",
  "REPORTING",
  "STARTED",
  "ENDED",
  "JUDGED",
  "PUBLISHED",
  "ANNOUNCED",
  "RESET",
]);
export const publicDisplayMode = pgEnum("PublicDisplayMode", [
  "programme_results",
  "team_standings",
]);
export const programmeType = pgEnum("ProgrammeType", ["INDIVIDUAL", "GROUP"]);
export const programmeTeamLeadAppointedByRole = pgEnum(
  "ProgrammeTeamLeadAppointedByRole",
  ["ADMIN", "TEAM_LEADER"],
);
export const scheduleEntryType = pgEnum("ScheduleEntryType", [
  "PROGRAMME",
  "SESSION",
]);
export const scoringSystem = pgEnum("ScoringSystem", [
  "POSITION_BASED",
  "SCORE_BASED",
]);
export const sessionType = pgEnum("SessionType", [
  "GENERAL",
  "CEREMONY",
  "TALK",
  "CONCERT",
]);
export const stageType = pgEnum("StageType", ["STAGE", "NON_STAGE"]);
export const tier = pgEnum("Tier", ["BASIC", "STANDARD", "PRO"]);
export const exportType = pgEnum("ExportType", [
  "CALL_LIST",
  "RESULTS",
  "TEAM_RESULT",
  "JUDGE_LIST",
  "VALUATION_SHEET",
  "BADGE",
  "CERTIFICATE",
]);
export const exportFormat = pgEnum("ExportFormat", ["PDF", "CSV"]);
export const exportStatus = pgEnum("ExportStatus", [
  "PROCESSING",
  "COMPLETED",
  "FAILED",
]);

// ─── Utility / standalone tables ─────────────────────────────────────────────

export const auditLog = pgTable("audit_log", {
  id: text().primaryKey().notNull(),
  actorId: text().notNull(),
  actorRole: text().notNull(),
  action: text().notNull(),
  targetType: text().notNull(),
  targetId: text().notNull(),
  metadata: jsonb(),
  createdAt: tzTimestamp().default(currentTimestampSql()).notNull(),
  updatedAt: tzTimestamp().default(currentTimestampSql()).notNull(),
});

export const systemConfig = pgTable(
  "system_config",
  {
    id: text().primaryKey().notNull(),
    key: text().notNull(),
    value: jsonb().notNull(),
    createdAt: tzTimestamp().default(currentTimestampSql()).notNull(),
    updatedAt: tzTimestamp().default(currentTimestampSql()).notNull(),
  },
  (table) => [
    uniqueIndex("system_config_key_key").using(
      "btree",
      table.key.asc().nullsLast(),
    ),
  ],
);

// ─── 1. user ──────────────────────────────────────────────────────────────────

export const accountType = pgEnum("AccountType", ["PERSONAL", "INSTITUTIONAL"]);
export const festivalTypeEnum = pgEnum("FestivalType", [
  "INSTITUTIONAL",
  "INDEPENDENT",
]);

export const institution = pgTable(
  "institution",
  {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    type: institutionType().notNull(),
    affiliation: text(),
    city: text(),
    sizeRange: text(),
    ownerId: text().notNull(),
    createdAt: tzTimestamp().default(currentTimestampSql()).notNull(),
    updatedAt: tzTimestamp().default(currentTimestampSql()).notNull(),
  },
  (table) => [
    uniqueIndex("institution_ownerId_key").using(
      "btree",
      table.ownerId.asc().nullsLast(),
    ),
  ],
);

export const magicLinkToken = pgTable(
  "magic_link_token",
  {
    id: text().primaryKey().notNull(),
    email: text().notNull(),
    token: text().notNull().unique(),
    expiresAt: tzTimestamp().notNull(),
    usedAt: tzTimestamp(),
    createdAt: tzTimestamp().default(currentTimestampSql()).notNull(),
  },
  (table) => [
    index("magic_link_token_email_idx").using(
      "btree",
      table.email.asc().nullsLast(),
    ),
  ],
);

export const pendingInvitation = pgTable(
  "pending_invitation",
  {
    id: text().primaryKey().notNull(),
    email: text().notNull(),
    festivalId: text().notNull(),
    festivalRole: festivalRole().notNull(),
    invitedBy: text().notNull(),
    expiresAt: tzTimestamp().notNull(),
    acceptedAt: tzTimestamp(),
    status: text().default("pending").notNull(),
    metadata: jsonb().$type<{ stageIds?: string[] }>(),
    createdAt: tzTimestamp().default(currentTimestampSql()).notNull(),
  },
  (table) => [
    uniqueIndex("pending_invitation_token_key").using(
      "btree",
      table.id.asc().nullsLast(),
    ),
    index("pending_invitation_festivalId_idx").using(
      "btree",
      table.festivalId.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "pending_invitation_festivalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.invitedBy],
      foreignColumns: [user.id],
      name: "pending_invitation_invitedBy_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const user = pgTable(
  "user",
  {
    id: text().primaryKey().notNull(),
    email: text().notNull(),
    globalRole: globalRole().default("USER").notNull(),
    fullName: text(),
    displayName: text(),
    accountType: accountType(),
    institutionId: text(),
    isActive: boolean().default(true).notNull(),
    timezone: text(),
    createdAt: tzTimestamp().default(currentTimestampSql()).notNull(),
    updatedAt: tzTimestamp().default(currentTimestampSql()).notNull(),
  },
  (table) => [
    uniqueIndex("user_email_key").using("btree", table.email.asc().nullsLast()),
    foreignKey({
      columns: [table.institutionId],
      foreignColumns: [institution.id],
      name: "user_institutionId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

// ─── 3. festival (depends on: user) ──────────────────────────────────────────

export const festival = pgTable(
  "festival",
  {
    id: text().primaryKey().notNull(),
    ownerId: text().notNull(),
    name: text().notNull(),
    slug: text().notNull(),
    category: text(),
    description: text(),
    orgName: text(),
    orgDescription: text(),
    orgWebsite: text(),
    orgLocation: text(),
    establishedYear: integer(),
    founderName: text(),
    founderMessage: text(),
    branding: jsonb(),
    rules: jsonb(),
    structure: jsonb(),
    isLocked: boolean().default(true).notNull(),
    createdAt: tzTimestamp().default(currentTimestampSql()).notNull(),
    updatedAt: tzTimestamp().default(currentTimestampSql()).notNull(),
    maxResultScore: integer(),
    expiresAt: tzTimestamp(),
    institutionName: text(),
    institutionType: institutionType(),
    judgesCount: integer().default(0).notNull(),
    location: text(),
    programmeAssignmentDeadline: tzTimestamp(),
    storageUsedMb: integer().default(0).notNull(),
    tier: tier().default("STANDARD").notNull(),
    tierLabel: text().default("Standard").notNull(),
    participantCreationDeadline: tzTimestamp(),
    teamLeaderLimit: integer().default(2).notNull(),
    participantsCount: integer().default(0).notNull(),
    publicSiteEnabled: boolean().default(false).notNull(),
    stagesCount: integer().default(0).notNull(),
    startDate: tzTimestamp(),
    endDate: tzTimestamp(),
    programmesCount: integer().default(0).notNull(),
    chestNumberSettings: jsonb(),
    teamStandings: jsonb(),
    publicDisplayMode: publicDisplayMode()
      .default("programme_results")
      .notNull(),
    announcerResultsPerStandings: integer().default(10).notNull(),
    announcedProgrammesSinceStandings: integer().default(0).notNull(),
    scoringSystem: scoringSystem().default("SCORE_BASED").notNull(),
    status: festivalStatus().default("READY").notNull(),
    resultPdfUrl: text(),
    expiredAt: tzTimestamp(),
    institutionId: text(),
    festivalType: festivalTypeEnum().default("INDEPENDENT").notNull(),
    timezone: text().default("UTC").notNull(),
  },
  (table) => [
    index("festival_expiresAt_idx").using(
      "btree",
      table.expiresAt.asc().nullsLast(),
    ),
    uniqueIndex("festival_ownerId_key").using(
      "btree",
      table.ownerId.asc().nullsLast(),
    ),
    uniqueIndex("festival_slug_key").using(
      "btree",
      table.slug.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.ownerId],
      foreignColumns: [user.id],
      name: "festival_ownerId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.institutionId],
      foreignColumns: [institution.id],
      name: "festival_institutionId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

// ─── 4. category (depends on: festival) ──────────────────────────────────────

export const category = pgTable(
  "category",
  {
    id: text().primaryKey().notNull(),
    festivalId: text().notNull(),
    name: text().notNull(),
    description: text(),
    createdAt: tzTimestamp().default(currentTimestampSql()).notNull(),
    updatedAt: tzTimestamp().default(currentTimestampSql()).notNull(),
    type: categoryType().default("SINGLE").notNull(),
  },
  (table) => [
    uniqueIndex("category_festivalId_name_key").using(
      "btree",
      table.festivalId.asc().nullsLast(),
      table.name.asc().nullsLast(),
    ),
    index("category_festivalId_idx").using(
      "btree",
      table.festivalId.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "category_festivalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

// ─── 5. group (depends on: festival) ─────────────────────────────────────────

export const group = pgTable(
  "group",
  {
    id: text().primaryKey().notNull(),
    festivalId: text().notNull(),
    name: text().notNull(),
    createdAt: tzTimestamp().default(currentTimestampSql()).notNull(),
    updatedAt: tzTimestamp().default(currentTimestampSql()).notNull(),
    seriesStart: integer().default(100).notNull(),
    color: text().default("#2563eb").notNull(),
  },
  (table) => [
    uniqueIndex("group_festivalId_name_key").using(
      "btree",
      table.festivalId.asc().nullsLast(),
      table.name.asc().nullsLast(),
    ),
    index("group_festivalId_createdAt_idx").using(
      "btree",
      table.festivalId.asc().nullsLast(),
      table.createdAt.desc().nullsFirst(),
    ),
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "group_festivalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

// ─── 6. programme (depends on: festival, category) ───────────────────────────

export const programme = pgTable(
  "programme",
  {
    id: text().primaryKey().notNull(),
    categoryId: text().notNull(),
    name: text().notNull(),
    type: programmeType().default("INDIVIDUAL").notNull(),
    stageType: stageType().default("STAGE").notNull(),
    createdAt: tzTimestamp().default(currentTimestampSql()).notNull(),
    updatedAt: tzTimestamp().default(currentTimestampSql()).notNull(),
    festivalId: text().notNull(),
    maxParticipantsPerGroup: integer().default(1).notNull(),
    maxTeamsPerGroup: integer().default(1).notNull(),
    maxParticipantsPerTeam: integer().default(1).notNull(),
    status: programmeStatus().default("READY").notNull(),
    publishedAt: tzTimestamp(),
    createdByEmail: text("created_by_email"),
    createdByName: text("created_by_name"),
    publishedByEmail: text("published_by_email"),
    publishedByName: text("published_by_name"),
    resultPosterTemplateCode: text("result_poster_template_code"),
  },
  (table) => [
    index("programme_festivalId_createdAt_idx").using(
      "btree",
      table.festivalId.asc().nullsLast(),
      table.createdAt.desc().nullsFirst(),
    ),
    index("programme_festivalId_status_idx").using(
      "btree",
      table.festivalId.asc().nullsLast(),
      table.status.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "programme_festivalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [category.id],
      name: "programme_categoryId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const festivalScoringPolicy = pgTable(
  "festival_scoring_policy",
  {
    id: text().primaryKey().notNull(),
    festivalId: text("festival_id").notNull(),
    version: integer().default(1).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    normalizeTo: integer("normalize_to").default(100).notNull(),
    noGradeBelow: integer("no_grade_below").default(50).notNull(),
    gradeRules: jsonb("grade_rules").notNull(),
    createdBy: text("created_by"),
    createdAt: tzTimestampNamed("created_at")
      .default(currentTimestampSql())
      .notNull(),
    updatedAt: tzTimestampNamed("updated_at")
      .default(currentTimestampSql())
      .notNull(),
  },
  (table) => [
    uniqueIndex("festival_scoring_policy_festivalId_key").using(
      "btree",
      table.festivalId.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "festival_scoring_policy_festivalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const festivalScoringAwardRule = pgTable(
  "festival_scoring_award_rule",
  {
    id: text().primaryKey().notNull(),
    festivalId: text("festival_id").notNull(),
    scoringPolicyId: text("scoring_policy_id").notNull(),
    criteriaType: text("criteria_type").default("PARTICIPANT_RANGE").notNull(),
    rowLabel: text("row_label"),
    programmeIds: jsonb("programme_ids"),
    categoryId: text("category_id"),
    programmeType: programmeType("programme_type"),
    minParticipants: integer("min_participants").default(1).notNull(),
    maxParticipants: integer("max_participants"),
    grade: text().notNull(),
    awardPoints: integer("award_points").notNull(),
    priority: integer().default(0).notNull(),
    createdAt: tzTimestampNamed("created_at")
      .default(currentTimestampSql())
      .notNull(),
    updatedAt: tzTimestampNamed("updated_at")
      .default(currentTimestampSql())
      .notNull(),
  },
  (table) => [
    index("festival_scoring_award_rule_festivalId_idx").using(
      "btree",
      table.festivalId.asc().nullsLast(),
    ),
    index("festival_scoring_award_rule_scoringPolicyId_idx").using(
      "btree",
      table.scoringPolicyId.asc().nullsLast(),
    ),
    index("festival_scoring_award_rule_categoryId_idx").using(
      "btree",
      table.categoryId.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "festival_scoring_award_rule_festivalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.scoringPolicyId],
      foreignColumns: [festivalScoringPolicy.id],
      name: "festival_scoring_award_rule_scoringPolicyId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [category.id],
      name: "festival_scoring_award_rule_categoryId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

// ─── 7. participant (depends on: festival, group, category) ──────────────────────

export const participant = pgTable(
  "participant",
  {
    id: text().primaryKey().notNull(),
    festivalId: text().notNull(),
    groupId: text().notNull(),
    categoryId: text().notNull(),
    name: text().notNull(),
    email: text(),
    phone: text(),
    gender: gender().default("MALE").notNull(),
    isTeamLeader: boolean().default(false).notNull(),
    createdAt: tzTimestamp().default(currentTimestampSql()).notNull(),
    updatedAt: tzTimestamp().default(currentTimestampSql()).notNull(),
    chestNumber: text(),
    dateOfBirth: tzTimestamp().notNull(),
    standard: text(),
    profileSlug: text(),
  },
  (table) => [
    uniqueIndex("participant_festivalId_chestNumber_key").using(
      "btree",
      table.festivalId.asc().nullsLast(),
      table.chestNumber.asc().nullsLast(),
    ),
    index("participant_festivalId_createdAt_idx").using(
      "btree",
      table.festivalId.asc().nullsLast(),
      table.createdAt.desc().nullsFirst(),
    ),
    index("participant_festivalId_idx").using(
      "btree",
      table.festivalId.asc().nullsLast(),
    ),
    uniqueIndex("participant_festivalId_profileSlug_key").using(
      "btree",
      table.festivalId.asc().nullsLast(),
      table.profileSlug.asc().nullsLast(),
    ),
    index("participant_groupId_idx").using(
      "btree",
      table.groupId.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "participant_festivalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.groupId],
      foreignColumns: [group.id],
      name: "participant_groupId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [category.id],
      name: "participant_categoryId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

// ─── 8. stage (depends on: festival) ─────────────────────────────────────────

export const stage = pgTable(
  "stage",
  {
    id: text().primaryKey().notNull(),
    festivalId: text().notNull(),
    name: text().notNull(),
    description: text(),
    createdBy: text(),
    createdAt: tzTimestamp().default(currentTimestampSql()).notNull(),
    updatedAt: tzTimestamp().default(currentTimestampSql()).notNull(),
  },
  (table) => [
    uniqueIndex("stage_festivalId_name_key").using(
      "btree",
      table.festivalId.asc().nullsLast(),
      table.name.asc().nullsLast(),
    ),
    index("stage_festivalId_idx").using(
      "btree",
      table.festivalId.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "stage_festivalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

// ─── 8b. stage_portal_credential (depends on: festival, stage) ───────────────

export const stagePortalCredential = pgTable(
  "stage_portal_credential",
  {
    id: text().primaryKey().notNull(),
    festivalId: text("festival_id").notNull(),
    stageId: text("stage_id").notNull(),
    accessCode: text("access_code").notNull(),
    pinHash: text("pin_hash").notNull(),
    attempts: integer().default(0).notNull(),
    lockedUntil: tzTimestampNamed("locked_until"),
    createdAt: tzTimestampNamed("created_at")
      .default(currentTimestampSql())
      .notNull(),
    updatedAt: tzTimestampNamed("updated_at")
      .default(currentTimestampSql())
      .notNull(),
  },
  (table) => [
    uniqueIndex("stage_portal_credential_stageId_key").using(
      "btree",
      table.stageId.asc().nullsLast(),
    ),
    uniqueIndex("stage_portal_credential_festivalId_accessCode_key").using(
      "btree",
      table.festivalId.asc().nullsLast(),
      table.accessCode.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "stage_portal_credential_festivalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.stageId],
      foreignColumns: [stage.id],
      name: "stage_portal_credential_stageId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

// ─── 8c. stage_portal_session (depends on: festival, stage) ─────────────────

export const stagePortalSession = pgTable(
  "stage_portal_session",
  {
    id: text().primaryKey().notNull(),
    stageId: text("stage_id").notNull(),
    festivalId: text("festival_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: tzTimestampNamed("expires_at").notNull(),
    revokedAt: tzTimestampNamed("revoked_at"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: tzTimestampNamed("created_at")
      .default(currentTimestampSql())
      .notNull(),
    updatedAt: tzTimestampNamed("updated_at")
      .default(currentTimestampSql())
      .notNull(),
  },
  (table) => [
    index("stage_portal_session_expiresAt_idx").using(
      "btree",
      table.expiresAt.asc().nullsLast(),
    ),
    index("stage_portal_session_festivalId_expiresAt_idx").using(
      "btree",
      table.festivalId.asc().nullsLast(),
      table.expiresAt.asc().nullsLast(),
    ),
    index("stage_portal_session_stageId_expiresAt_idx").using(
      "btree",
      table.stageId.asc().nullsLast(),
      table.expiresAt.asc().nullsLast(),
    ),
    uniqueIndex("stage_portal_session_tokenHash_key").using(
      "btree",
      table.tokenHash.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "stage_portal_session_festivalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.stageId],
      foreignColumns: [stage.id],
      name: "stage_portal_session_stageId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

// ─── 9. schedule_entry (depends on: festival, programme, stage) ───────────────

export const scheduleEntry = pgTable(
  "schedule_entry",
  {
    id: text().primaryKey().notNull(),
    festivalId: text().notNull(),
    programmeId: text(),
    stageId: text(),
    startTime: tzTimestamp().notNull(),
    endTime: tzTimestamp(),
    order: integer().default(0).notNull(),
    createdBy: text(),
    updatedBy: text(),
    createdAt: tzTimestamp().default(currentTimestampSql()).notNull(),
    updatedAt: tzTimestamp().notNull(),
    type: scheduleEntryType().default("PROGRAMME").notNull(),
    title: text(),
    description: text(),
    speakers: text(),
    sessionType: sessionType(),
  },
  (table) => [
    index("schedule_entry_festivalId_idx").using(
      "btree",
      table.festivalId.asc().nullsLast(),
    ),
    index("schedule_entry_festivalId_startTime_idx").using(
      "btree",
      table.festivalId.asc().nullsLast(),
      table.startTime.asc().nullsLast(),
    ),
    index("schedule_entry_festivalId_type_idx").using(
      "btree",
      table.festivalId.asc().nullsLast(),
      table.type.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "schedule_entry_festivalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.programmeId],
      foreignColumns: [programme.id],
      name: "schedule_entry_programmeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.stageId],
      foreignColumns: [stage.id],
      name: "schedule_entry_stageId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

// ─── 10. programme_assignment (depends on: programme, festival, group, participant, category) ──

export const programmeAssignment = pgTable(
  "programme_assignment",
  {
    id: text().primaryKey().notNull(),
    programmeId: text().notNull(),
    groupId: text(),
    assignedAt: tzTimestamp().default(currentTimestampSql()).notNull(),
    festivalId: text().notNull(),
    categoryId: text(),
    participantId: text(),
    teamNumber: integer().default(1).notNull(),
    createdAt: tzTimestamp().default(currentTimestampSql()).notNull(),
    updatedAt: tzTimestamp().default(currentTimestampSql()).notNull(),
    createdByEmail: text(),
    createdByName: text(),
  },
  (table) => [
    uniqueIndex("programme_assignment_programmeId_participantId_key")
      .using(
        "btree",
        table.programmeId.asc().nullsLast(),
        table.participantId.asc().nullsLast(),
      )
      .where(sql`${table.participantId} is not null`),
    foreignKey({
      columns: [table.programmeId],
      foreignColumns: [programme.id],
      name: "programme_assignment_programmeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "programme_assignment_festivalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.groupId],
      foreignColumns: [group.id],
      name: "programme_assignment_groupId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.participantId],
      foreignColumns: [participant.id],
      name: "programme_assignment_participantId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [category.id],
      name: "programme_assignment_categoryId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    index("programme_assignment_programmeId_teamNumber_idx").using(
      "btree",
      table.programmeId.asc().nullsLast(),
      table.teamNumber.asc().nullsLast(),
    ),
  ],
);

// ─── 11. result (depends on: festival, programme, programme_assignment) ────────

export const result = pgTable(
  "result",
  {
    id: text().primaryKey().notNull(),
    festivalId: text().notNull(),
    programmeId: text().notNull(),
    assignmentId: text().notNull(),
    grade: text(),
    position: integer(),
    score: doublePrecision().default(0).notNull(),
    points: integer().default(0).notNull(),
    awardPoints: integer("award_points").default(0).notNull(),
    scoringPolicyVersion: integer("scoring_policy_version"),
    remarks: text(),
    isPublished: boolean().default(false).notNull(),
    isAnnounced: boolean().default(false).notNull(),
    announcedAt: tzTimestamp(),
    savedByEmail: text("saved_by_email"),
    savedByName: text("saved_by_name"),
    publishedByEmail: text("published_by_email"),
    publishedByName: text("published_by_name"),
    announcedByEmail: text("announced_by_email"),
    announcedByName: text("announced_by_name"),
    createdAt: tzTimestamp().default(currentTimestampSql()).notNull(),
    updatedAt: tzTimestamp().default(currentTimestampSql()).notNull(),
  },
  (table) => [
    uniqueIndex("result_assignmentId_key").using(
      "btree",
      table.assignmentId.asc().nullsLast(),
    ),
    index("result_festivalId_createdAt_idx").using(
      "btree",
      table.festivalId.asc().nullsLast(),
      table.createdAt.desc().nullsFirst(),
    ),
    index("result_programmeId_position_idx").using(
      "btree",
      table.programmeId.asc().nullsLast(),
      table.position.asc().nullsLast(),
    ),
    index("result_programmeId_isPublished_idx").using(
      "btree",
      table.programmeId.asc().nullsLast(),
      table.isPublished.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "result_festivalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.programmeId],
      foreignColumns: [programme.id],
      name: "result_programmeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.assignmentId],
      foreignColumns: [programmeAssignment.id],
      name: "result_assignmentId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

// ─── 11.5 programme_team_lead (depends on: programme, group, participant) ─────────

export const programmeTeamLead = pgTable(
  "programme_team_lead",
  {
    id: text().primaryKey().notNull(),
    programmeId: text().notNull(),
    groupId: text().notNull(),
    teamNumber: integer().default(1).notNull(),
    participantId: text().notNull(),
    appointedBy: text().notNull(),
    appointedByRole: programmeTeamLeadAppointedByRole()
      .default("ADMIN")
      .notNull(),
    appointedByName: text(),
    appointedByEmail: text(),
    appointedAt: tzTimestamp().default(currentTimestampSql()).notNull(),
    createdAt: tzTimestamp().default(currentTimestampSql()).notNull(),
    updatedAt: tzTimestamp().default(currentTimestampSql()).notNull(),
  },
  (table) => [
    uniqueIndex("programme_team_lead_team_key").using(
      "btree",
      table.programmeId.asc().nullsLast(),
      table.groupId.asc().nullsLast(),
      table.teamNumber.asc().nullsLast(),
    ),
    index("programme_team_lead_programmeId_idx").using(
      "btree",
      table.programmeId.asc().nullsLast(),
    ),
    index("programme_team_lead_participantId_idx").using(
      "btree",
      table.participantId.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.programmeId],
      foreignColumns: [programme.id],
      name: "programme_team_lead_programmeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.groupId],
      foreignColumns: [group.id],
      name: "programme_team_lead_groupId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.participantId],
      foreignColumns: [participant.id],
      name: "programme_team_lead_participantId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

// ─── 12. programme_reporting_session (depends on: festival, schedule_entry, programme, stage) ──

export const programmeReportingSession = pgTable(
  "programme_reporting_session",
  {
    id: text().primaryKey().notNull(),
    festivalId: text().notNull(),
    scheduleEntryId: text().notNull(),
    programmeId: text().notNull(),
    stageId: text(),
    status: programmeReportingStatus().default("NOT_STARTED").notNull(),
    startedAt: tzTimestamp(),
    startedBy: text(),
    endedAt: tzTimestamp(),
    endedBy: text(),
    windowEndsAt: tzTimestamp(),
    isLocked: boolean().default(false).notNull(),
    closedAtScheduleStart: boolean().default(true).notNull(),
    createdAt: tzTimestamp().default(currentTimestampSql()).notNull(),
    updatedAt: tzTimestamp().default(currentTimestampSql()).notNull(),
  },
  (table) => [
    index("programme_reporting_session_festivalId_status_idx").using(
      "btree",
      table.festivalId.asc().nullsLast(),
      table.status.asc().nullsLast(),
    ),
    index("programme_reporting_session_programmeId_idx").using(
      "btree",
      table.programmeId.asc().nullsLast(),
    ),
    uniqueIndex("programme_reporting_session_scheduleEntryId_key").using(
      "btree",
      table.scheduleEntryId.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "programme_reporting_session_festivalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.scheduleEntryId],
      foreignColumns: [scheduleEntry.id],
      name: "programme_reporting_session_scheduleEntryId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.programmeId],
      foreignColumns: [programme.id],
      name: "programme_reporting_session_programmeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.stageId],
      foreignColumns: [stage.id],
      name: "programme_reporting_session_stageId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

// ─── 13. programme_reported_participant (depends on: programme_reporting_session, programme_assignment, participant, group) ──

export const programmeReportedParticipant = pgTable(
  "programme_reported_participant",
  {
    id: text().primaryKey().notNull(),
    reportingSessionId: text().notNull(),
    assignmentId: text().notNull(),
    participantId: text(),
    groupId: text(),
    teamNumber: integer(),
    reportedAt: tzTimestamp().default(currentTimestampSql()).notNull(),
    reportedBy: text(),
  },
  (table) => [
    index("programme_reported_participant_groupId_idx").using(
      "btree",
      table.groupId.asc().nullsLast(),
    ),
    uniqueIndex(
      "programme_reported_participant_reportingSessionId_assignmentId_",
    ).using(
      "btree",
      table.reportingSessionId.asc().nullsLast(),
      table.assignmentId.asc().nullsLast(),
    ),
    index("programme_reported_participant_participantId_idx").using(
      "btree",
      table.participantId.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.reportingSessionId],
      foreignColumns: [programmeReportingSession.id],
      name: "programme_reported_participant_reportingSessionId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.assignmentId],
      foreignColumns: [programmeAssignment.id],
      name: "programme_reported_participant_assignmentId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.participantId],
      foreignColumns: [participant.id],
      name: "programme_reported_participant_participantId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.groupId],
      foreignColumns: [group.id],
      name: "programme_reported_participant_groupId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

// ─── 14. programme_code_letter (depends on: festival, programme_reporting_session, programme) ──

export const programmeCodeLetter = pgTable(
  "programme_code_letter",
  {
    id: text().primaryKey().notNull(),
    festivalId: text().notNull(),
    reportingSessionId: text().notNull(),
    programmeId: text().notNull(),
    code: text().notNull(),
    issuedAt: tzTimestamp().default(currentTimestampSql()).notNull(),
    issuedBy: text(),
    isAbsent: boolean("is_absent").default(false).notNull(),
    absentBy: text("absent_by"),
    absentAt: tzTimestampNamed("absent_at"),
  },
  (table) => [
    index("programme_code_letter_festivalId_issuedAt_idx").using(
      "btree",
      table.festivalId.asc().nullsLast(),
      table.issuedAt.asc().nullsLast(),
    ),
    index("programme_code_letter_programmeId_idx").using(
      "btree",
      table.programmeId.asc().nullsLast(),
    ),
    uniqueIndex("programme_code_letter_reportingSessionId_code_key").using(
      "btree",
      table.reportingSessionId.asc().nullsLast(),
      table.code.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "programme_code_letter_festivalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.reportingSessionId],
      foreignColumns: [programmeReportingSession.id],
      name: "programme_code_letter_reportingSessionId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.programmeId],
      foreignColumns: [programme.id],
      name: "programme_code_letter_programmeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

// ─── 15. programme_code_letter_recipient (depends on: programme_code_letter, participant) ──

export const programmeCodeLetterRecipient = pgTable(
  "programme_code_letter_recipient",
  {
    id: text().primaryKey().notNull(),
    codeLetterId: text().notNull(),
    participantId: text().notNull(),
    createdAt: tzTimestamp().default(currentTimestampSql()).notNull(),
  },
  (table) => [
    uniqueIndex(
      "programme_code_letter_recipient_codeLetterId_participantId_key",
    ).using(
      "btree",
      table.codeLetterId.asc().nullsLast(),
      table.participantId.asc().nullsLast(),
    ),
    index("programme_code_letter_recipient_participantId_idx").using(
      "btree",
      table.participantId.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.codeLetterId],
      foreignColumns: [programmeCodeLetter.id],
      name: "programme_code_letter_recipient_codeLetterId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.participantId],
      foreignColumns: [participant.id],
      name: "programme_code_letter_recipient_participantId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const judge = pgTable(
  "judge",
  {
    id: text().primaryKey().notNull(),
    festivalId: text("festival_id").notNull(),
    name: text().notNull(),
    description: text(),
    createdAt: tzTimestampNamed("created_at")
      .default(currentTimestampSql())
      .notNull(),
    updatedAt: tzTimestampNamed("updated_at")
      .default(currentTimestampSql())
      .notNull(),
  },
  (table) => [
    index("judge_festivalId_idx").using(
      "btree",
      table.festivalId.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "judge_festivalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const judgementConfig = pgTable(
  "judgement_config",
  {
    id: text().primaryKey().notNull(),
    festivalId: text("festival_id").notNull(),
    programmeId: text("programme_id").notNull(),
    reportingSessionId: text("reporting_session_id").notNull(),
    scoreLimit: integer("score_limit").notNull(),
    judgingMode: text("judging_mode").default("GROUP").notNull(),
    status: text().default("LIVE").notNull(), // LIVE | SUBMITTED | ARCHIVED
    startedAt: tzTimestampNamed("started_at"),
    startedBy: text("started_by"),
    endedAt: tzTimestampNamed("ended_at"),
    endedBy: text("ended_by"),
    createdBy: text("created_by"),
    createdAt: tzTimestampNamed("created_at")
      .default(currentTimestampSql())
      .notNull(),
    updatedAt: tzTimestampNamed("updated_at")
      .default(currentTimestampSql())
      .notNull(),
  },
  (table) => [
    index("judgement_config_festivalId_idx").using(
      "btree",
      table.festivalId.asc().nullsLast(),
    ),
    index("judgement_config_programmeId_idx").using(
      "btree",
      table.programmeId.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "judgement_config_festivalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.programmeId],
      foreignColumns: [programme.id],
      name: "judgement_config_programmeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.reportingSessionId],
      foreignColumns: [programmeReportingSession.id],
      name: "judgement_config_reportingSessionId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const judgementConfigJudge = pgTable(
  "judgement_config_judge",
  {
    id: text().primaryKey().notNull(),
    configId: text("config_id").notNull(),
    judgeId: text("judge_id").notNull(),
    createdAt: tzTimestampNamed("created_at")
      .default(currentTimestampSql())
      .notNull(),
  },
  (table) => [
    uniqueIndex("judgement_config_judge_configId_judgeId_key").using(
      "btree",
      table.configId.asc().nullsLast(),
      table.judgeId.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.configId],
      foreignColumns: [judgementConfig.id],
      name: "judgement_config_judge_configId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.judgeId],
      foreignColumns: [judge.id],
      name: "judgement_config_judge_judgeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const judgementScore = pgTable(
  "judgement_score",
  {
    id: text().primaryKey().notNull(),
    configId: text("config_id").notNull(),
    judgeId: text("judge_id").notNull(),
    codeLetterId: text("code_letter_id").notNull(),
    score: doublePrecision().notNull(),
    remark: text(),
    submittedAt: tzTimestampNamed("submitted_at")
      .default(currentTimestampSql())
      .notNull(),
    updatedAt: tzTimestampNamed("updated_at")
      .default(currentTimestampSql())
      .notNull(),
  },
  (table) => [
    uniqueIndex("judgement_score_configId_judgeId_codeLetterId_key").using(
      "btree",
      table.configId.asc().nullsLast(),
      table.judgeId.asc().nullsLast(),
      table.codeLetterId.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.configId],
      foreignColumns: [judgementConfig.id],
      name: "judgement_score_configId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.judgeId],
      foreignColumns: [judge.id],
      name: "judgement_score_judgeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.codeLetterId],
      foreignColumns: [programmeCodeLetter.id],
      name: "judgement_score_codeLetterId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

// ─── 17. festival_member (depends on: festival, user) ────────────────────────

export const festivalMember = pgTable(
  "festival_member",
  {
    id: text().primaryKey().notNull(),
    festivalId: text().notNull(),
    userId: text().notNull(),
    role: festivalRole().default("ANNOUNCER").notNull(),
    isActive: boolean().default(true).notNull(),
    metadata: jsonb(),
    createdAt: tzTimestamp().default(currentTimestampSql()).notNull(),
    updatedAt: tzTimestamp().default(currentTimestampSql()).notNull(),
  },
  (table) => [
    uniqueIndex("festival_member_festivalId_userId_key").using(
      "btree",
      table.festivalId.asc().nullsLast(),
      table.userId.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "festival_member_festivalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "festival_member_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

// ─── 18. festival_news (depends on: festival) ────────────────────────────────

export const festivalNews = pgTable(
  "festival_news",
  {
    id: text().primaryKey().notNull(),
    festivalId: text().notNull(),
    title: text().notNull(),
    content: text().notNull(),
    imageUrl: text(),
    publishedAt: tzTimestamp(),
    createdAt: tzTimestamp().default(currentTimestampSql()).notNull(),
    updatedAt: tzTimestamp().default(currentTimestampSql()).notNull(),
    excerpt: text(),
  },
  (table) => [
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "festival_news_festivalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

// ─── 19. festival_media_image (depends on: festival) ───────────────────────

export const festivalMediaImage = pgTable(
  "festival_media_image",
  {
    id: text().primaryKey().notNull(),
    festivalId: text().notNull(),
    url: text().notNull(),
    order: integer().default(0).notNull(),
    createdAt: tzTimestamp().default(currentTimestampSql()).notNull(),
    updatedAt: tzTimestamp().default(currentTimestampSql()).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "festival_media_image_festivalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

// ─── 20. payment (depends on: user, festival) ────────────────────────────────

export const payment = pgTable(
  "payment",
  {
    id: text().primaryKey().notNull(),
    amount: integer().notNull(),
    currency: text().notNull(),
    providerId: text().notNull(),
    referenceId: text(),
    receipt: text(),
    validUntil: tzTimestamp(),
    userId: text().notNull(),
    festivalId: text(),
    createdAt: tzTimestamp().default(currentTimestampSql()).notNull(),
    updatedAt: tzTimestamp().default(currentTimestampSql()).notNull(),
    purpose: paymentPurpose().default("FESTIVAL_CREATION").notNull(),
    used: boolean().default(false).notNull(),
    status: paymentStatus().default("PENDING").notNull(),
    tier: tier(),
  },
  (table) => [
    index("payment_festivalId_idx").using(
      "btree",
      table.festivalId.asc().nullsLast(),
    ),
    uniqueIndex("payment_providerId_key").using(
      "btree",
      table.providerId.asc().nullsLast(),
    ),
    index("payment_userId_createdAt_idx").using(
      "btree",
      table.userId.asc().nullsLast(),
      table.createdAt.asc().nullsLast(),
    ),
    index("payment_userId_purpose_status_idx").using(
      "btree",
      table.userId.asc().nullsLast(),
      table.purpose.asc().nullsLast(),
      table.status.asc().nullsLast(),
    ),
    uniqueIndex("payment_userId_purpose_pending_unique_idx")
      .using(
        "btree",
        table.userId.asc().nullsLast(),
        table.purpose.asc().nullsLast(),
      )
      .where(sql`${table.status} = 'PENDING' AND ${table.used} = false`),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "payment_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "payment_festivalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

// ─── 21. user_login_event (depends on: user) ─────────────────────────────────

export const userLoginEvent = pgTable(
  "user_login_event",
  {
    id: text().primaryKey().notNull(),
    userId: text().notNull(),
    loggedAt: tzTimestamp().default(currentTimestampSql()).notNull(),
    ip: text(),
    userAgent: text(),
  },
  (table) => [
    index("user_login_event_userId_loggedAt_idx").using(
      "btree",
      table.userId.asc().nullsLast(),
      table.loggedAt.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "user_login_event_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

// ─── 22. user_purchase_summary (depends on: user) ────────────────────────────

export const userPurchaseSummary = pgTable(
  "user_purchase_summary",
  {
    userId: text().primaryKey().notNull(),
    totalSpend: integer().default(0).notNull(),
    festivalsCount: integer().default(0).notNull(),
    lastPurchaseAt: tzTimestamp(),
    festivalIds: jsonb(),
    planCountsByTier: jsonb(),
    updatedAt: tzTimestamp().default(currentTimestampSql()).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "user_purchase_summary_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

// ─── 23. festival_category_preference (depends on: user) ─────────────────────

export const festivalCategoryPreference = pgTable(
  "festival_category_preference",
  {
    id: text().primaryKey().notNull(),
    userId: text().notNull(),
    category: text().notNull(),
    weight: integer().default(0).notNull(),
    updatedAt: tzTimestamp().default(currentTimestampSql()).notNull(),
  },
  (table) => [
    uniqueIndex("festival_category_preference_userId_category_key").using(
      "btree",
      table.userId.asc().nullsLast(),
      table.category.asc().nullsLast(),
    ),
    index("festival_category_preference_userId_idx").using(
      "btree",
      table.userId.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "festival_category_preference_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

// ─── 24. expired_festival_result (depends on: festival) ──────────────────────

export const expiredFestivalResult = pgTable(
  "expired_festival_result",
  {
    id: text().primaryKey().notNull(),
    festivalId: text().notNull(),
    programmeName: text().notNull(),
    categoryName: text(),
    participantName: text().notNull(),
    position: integer(),
    grade: text(),
    score: doublePrecision(),
    points: integer(),
    createdAt: tzTimestamp().default(currentTimestampSql()).notNull(),
  },
  (table) => [
    index("expired_festival_result_festivalId_idx").using(
      "btree",
      table.festivalId.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "expired_festival_result_festivalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

// ─── 24b. expired_festival_manual_book (depends on: festival) ──────────────────

export const expiredFestivalManualBook = pgTable(
  "expired_festival_manual_book",
  {
    id: text().primaryKey().notNull(),
    festivalId: text().notNull(),
    data: jsonb().notNull(),
    createdAt: tzTimestamp().default(currentTimestampSql()).notNull(),
  },
  (table) => [
    index("expired_festival_manual_book_festivalId_idx").using(
      "btree",
      table.festivalId.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "expired_festival_manual_book_festivalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

// ─── 25. festival_lifecycle_event (depends on: festival) ─────────────────────

export const festivalLifecycleEvent = pgTable(
  "festival_lifecycle_event",
  {
    id: text().primaryKey().notNull(),
    festivalId: text().notNull(),
    event: festivalLifecycleEventType().notNull(),
    occurredAt: tzTimestamp().default(currentTimestampSql()).notNull(),
    metadata: jsonb(),
  },
  (table) => [
    index("festival_lifecycle_event_festivalId_idx").using(
      "btree",
      table.festivalId.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "festival_lifecycle_event_festivalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

// ─── participant_otp ─────────────────────────────────────────────────────────

export const participantOtp = pgTable(
  "participant_otp",
  {
    id: text().primaryKey().notNull(),
    participantId: text().notNull(),
    codeHash: text().notNull(),
    expiresAt: tzTimestamp().notNull(),
    attempts: integer().default(0).notNull(),
    consumedAt: tzTimestamp(),
    createdAt: tzTimestamp().default(currentTimestampSql()).notNull(),
    updatedAt: tzTimestamp().default(currentTimestampSql()).notNull(),
  },
  (table) => [
    index("participant_otp_expiresAt_idx").using(
      "btree",
      table.expiresAt.asc().nullsLast(),
    ),
    index("participant_otp_participantId_expiresAt_idx").using(
      "btree",
      table.participantId.asc().nullsLast(),
      table.expiresAt.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.participantId],
      foreignColumns: [participant.id],
      name: "participant_otp_participantId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

// ─── participant_session ─────────────────────────────────────────────────────

export const participantSession = pgTable(
  "participant_session",
  {
    id: text().primaryKey().notNull(),
    participantId: text().notNull(),
    festivalId: text().notNull(),
    tokenHash: text().notNull(),
    expiresAt: tzTimestamp().notNull(),
    revokedAt: tzTimestamp(),
    ipAddress: text(),
    userAgent: text(),
    createdAt: tzTimestamp().default(currentTimestampSql()).notNull(),
    updatedAt: tzTimestamp().default(currentTimestampSql()).notNull(),
  },
  (table) => [
    index("participant_session_expiresAt_idx").using(
      "btree",
      table.expiresAt.asc().nullsLast(),
    ),
    index("participant_session_festivalId_expiresAt_idx").using(
      "btree",
      table.festivalId.asc().nullsLast(),
      table.expiresAt.asc().nullsLast(),
    ),
    index("participant_session_participantId_expiresAt_idx").using(
      "btree",
      table.participantId.asc().nullsLast(),
      table.expiresAt.asc().nullsLast(),
    ),
    uniqueIndex("participant_session_tokenHash_key").using(
      "btree",
      table.tokenHash.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.participantId],
      foreignColumns: [participant.id],
      name: "participant_session_participantId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "participant_session_festivalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

// ─── 28. programme_notification (depends on: festival, user, participant) ─────────

export const programmeNotification = pgTable(
  "programme_notification",
  {
    id: text().primaryKey().notNull(),
    festivalId: text().notNull(),
    eventType: programmeNotificationEventType().notNull(),
    recipientUserId: text(),
    recipientParticipantId: text(),
    title: text().notNull(),
    body: text().notNull(),
    payload: jsonb(),
    channels: jsonb(),
    isRead: boolean().default(false).notNull(),
    createdAt: tzTimestamp().default(currentTimestampSql()).notNull(),
  },
  (table) => [
    index("programme_notification_festivalId_createdAt_idx").using(
      "btree",
      table.festivalId.asc().nullsLast(),
      table.createdAt.asc().nullsLast(),
    ),
    index("programme_notification_recipientParticipantId_isRead_idx").using(
      "btree",
      table.recipientParticipantId.asc().nullsLast(),
      table.isRead.asc().nullsLast(),
    ),
    index("programme_notification_recipientUserId_isRead_idx").using(
      "btree",
      table.recipientUserId.asc().nullsLast(),
      table.isRead.asc().nullsLast(),
    ),
    index("programme_notification_recipientUserId_createdAt_idx").using(
      "btree",
      table.recipientUserId.asc().nullsLast(),
      table.createdAt.desc().nullsFirst(),
    ),
    index("programme_notification_recipientParticipantId_createdAt_idx").using(
      "btree",
      table.recipientParticipantId.asc().nullsLast(),
      table.createdAt.desc().nullsFirst(),
    ),
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "programme_notification_festivalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.recipientUserId],
      foreignColumns: [user.id],
      name: "programme_notification_recipientUserId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.recipientParticipantId],
      foreignColumns: [participant.id],
      name: "programme_notification_recipientParticipantId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

// ─── Templates (poster editor) ────────────────────────────────────────────────

export const festivalPosterTemplate = pgTable(
  "festival_poster_template",
  {
    id: text().primaryKey().notNull(),
    festivalId: text("festival_id").notNull(),
    type: posterTemplateType().notNull(),
    code: text().notNull(),
    status: posterTemplateStatus().default("DRAFT").notNull(),
    width: integer().notNull(),
    height: integer().notNull(),
    konvaJson: jsonb("konva_json").notNull(),
    backgroundUrl: text("background_url"),
    meta: jsonb(),
    createdAt: tzTimestampNamed("created_at")
      .default(currentTimestampSql())
      .notNull(),
    updatedAt: tzTimestampNamed("updated_at")
      .default(currentTimestampSql())
      .notNull(),
  },
  (table) => [
    uniqueIndex("festival_poster_template_festivalId_code_key").using(
      "btree",
      table.festivalId.asc().nullsLast(),
      table.code.asc().nullsLast(),
    ),
    index("festival_poster_template_festivalId_status_idx").using(
      "btree",
      table.festivalId.asc().nullsLast(),
      table.status.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "festival_poster_template_festivalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

// ─── 29. stage_manager_assignment (depends on: festival, stage, festival_member) ──

export const stageManagerAssignment = pgTable(
  "stage_manager_assignment",
  {
    id: text().primaryKey().notNull(),
    festivalId: text().notNull(),
    stageId: text().notNull(),
    memberId: text().notNull(),
    createdAt: tzTimestamp().default(currentTimestampSql()).notNull(),
  },
  (table) => [
    uniqueIndex("stage_manager_assignment_stageId_memberId_key").using(
      "btree",
      table.stageId.asc().nullsLast(),
      table.memberId.asc().nullsLast(),
    ),
    index("stage_manager_assignment_memberId_idx").using(
      "btree",
      table.memberId.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "stage_manager_assignment_festivalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.stageId],
      foreignColumns: [stage.id],
      name: "stage_manager_assignment_stageId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.memberId],
      foreignColumns: [festivalMember.id],
      name: "stage_manager_assignment_memberId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

// ─── 30. judge_stage_assignment (depends on: festival, stage, judge) ──────────

export const judgeStageAssignment = pgTable(
  "judge_stage_assignment",
  {
    id: text().primaryKey().notNull(),
    festivalId: text().notNull(),
    stageId: text().notNull(),
    judgeId: text().notNull(),
    createdAt: tzTimestamp().default(currentTimestampSql()).notNull(),
  },
  (table) => [
    uniqueIndex("judge_stage_assignment_stageId_judgeId_key").using(
      "btree",
      table.stageId.asc().nullsLast(),
      table.judgeId.asc().nullsLast(),
    ),
    index("judge_stage_assignment_judgeId_idx").using(
      "btree",
      table.judgeId.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "judge_stage_assignment_festivalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.stageId],
      foreignColumns: [stage.id],
      name: "judge_stage_assignment_stageId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.judgeId],
      foreignColumns: [judge.id],
      name: "judge_stage_assignment_judgeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

// ─── festival_export (depends on: festival, user) ────────────────────────────
// Festival-scoped export jobs. Generated files are stored inline as base64
// (`fileData`) — no external object storage — and pruned 2 days after queueing
// by the daily cron. See issues/ISSUE-11-exports-foundation-and-data-exports.md.

export const festivalExport = pgTable(
  "festival_export",
  {
    id: text().primaryKey().notNull(),
    festivalId: text().notNull(),
    type: exportType().notNull(),
    format: exportFormat().notNull(),
    status: exportStatus().default("PROCESSING").notNull(),
    summary: text().notNull(),
    config: jsonb().notNull(),
    fileName: text(),
    fileData: text(), // base64-encoded file bytes; null until COMPLETED
    fileSizeBytes: integer(),
    mimeType: text(),
    itemCount: integer(),
    errorMessage: text(),
    createdBy: text().notNull(),
    queuedAt: tzTimestamp().default(currentTimestampSql()).notNull(),
    completedAt: tzTimestamp(),
    completedInMs: integer(),
    expiresAt: tzTimestamp().notNull(),
  },
  (table) => [
    index("festival_export_festivalId_queuedAt_idx").using(
      "btree",
      table.festivalId.asc().nullsLast(),
      table.queuedAt.desc().nullsLast(),
    ),
    index("festival_export_expiresAt_idx").using(
      "btree",
      table.expiresAt.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "festival_export_festivalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [user.id],
      name: "festival_export_createdBy_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);
