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
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

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
export const realtimeOutboxStatus = pgEnum("RealtimeOutboxStatus", [
  "PENDING",
  "PROCESSING",
  "DISPATCHED",
  "FAILED",
]);
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

// ─── Utility / standalone tables ─────────────────────────────────────────────

export const auditLog = pgTable("audit_log", {
  id: text().primaryKey().notNull(),
  actorId: text().notNull(),
  actorRole: text().notNull(),
  action: text().notNull(),
  targetType: text().notNull(),
  targetId: text().notNull(),
  metadata: jsonb(),
  createdAt: timestamp({ precision: 3, mode: "string" })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp({ precision: 3, mode: "string" })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const systemConfig = pgTable(
  "system_config",
  {
    id: text().primaryKey().notNull(),
    key: text().notNull(),
    value: jsonb().notNull(),
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
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
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
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
    expiresAt: timestamp({ precision: 3, mode: "string" }).notNull(),
    usedAt: timestamp({ precision: 3, mode: "string" }),
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
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
    expiresAt: timestamp({ precision: 3, mode: "string" }).notNull(),
    acceptedAt: timestamp({ precision: 3, mode: "string" }),
    status: text().default("pending").notNull(),
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
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
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
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
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    maxResultScore: integer(),
    expiresAt: timestamp({ precision: 3, mode: "string" }),
    institutionName: text(),
    institutionType: institutionType(),
    judgesCount: integer().default(0).notNull(),
    location: text(),
    programmeAssignmentDeadline: timestamp({ precision: 3, mode: "string" }),
    storageUsedMb: integer().default(0).notNull(),
    tier: tier().default("STANDARD").notNull(),
    tierLabel: text().default("Standard").notNull(),
    studentCreationDeadline: timestamp({ precision: 3, mode: "string" }),
    teamLeaderLimit: integer().default(2).notNull(),
    studentsCount: integer().default(0).notNull(),
    publicSiteEnabled: boolean().default(false).notNull(),
    stagesCount: integer().default(0).notNull(),
    startDate: timestamp({ precision: 3, mode: "string" }),
    endDate: timestamp({ precision: 3, mode: "string" }),
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
    expiredAt: timestamp({ precision: 3, mode: "string" }),
    institutionId: text(),
    festivalType: festivalTypeEnum().default("INDEPENDENT").notNull(),
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
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
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
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
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
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    festivalId: text().notNull(),
    maxParticipantsPerGroup: integer().default(1).notNull(),
    maxTeamsPerGroup: integer().default(1).notNull(),
    maxStudentsPerTeam: integer().default(1).notNull(),
    status: programmeStatus().default("READY").notNull(),
    publishedAt: timestamp({ precision: 3, mode: "string" }),
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
    createdAt: timestamp("created_at", { precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
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
    createdAt: timestamp("created_at", { precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
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

// ─── 7. student (depends on: festival, group, category) ──────────────────────

export const student = pgTable(
  "student",
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
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    chestNumber: text(),
    age: integer(),
    standard: text(),
    profileSlug: text(),
  },
  (table) => [
    uniqueIndex("student_festivalId_chestNumber_key").using(
      "btree",
      table.festivalId.asc().nullsLast(),
      table.chestNumber.asc().nullsLast(),
    ),
    index("student_festivalId_createdAt_idx").using(
      "btree",
      table.festivalId.asc().nullsLast(),
      table.createdAt.desc().nullsFirst(),
    ),
    index("student_festivalId_idx").using(
      "btree",
      table.festivalId.asc().nullsLast(),
    ),
    uniqueIndex("student_festivalId_profileSlug_key").using(
      "btree",
      table.festivalId.asc().nullsLast(),
      table.profileSlug.asc().nullsLast(),
    ),
    index("student_groupId_idx").using(
      "btree",
      table.groupId.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "student_festivalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.groupId],
      foreignColumns: [group.id],
      name: "student_groupId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [category.id],
      name: "student_categoryId_fkey",
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
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
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

// ─── 9. schedule_entry (depends on: festival, programme, stage) ───────────────

export const scheduleEntry = pgTable(
  "schedule_entry",
  {
    id: text().primaryKey().notNull(),
    festivalId: text().notNull(),
    programmeId: text(),
    stageId: text(),
    startTime: timestamp({ precision: 3, mode: "string" }).notNull(),
    endTime: timestamp({ precision: 3, mode: "string" }),
    order: integer().default(0).notNull(),
    createdBy: text(),
    updatedBy: text(),
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "string" }).notNull(),
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

// ─── 10. programme_assignment (depends on: programme, festival, group, student, category) ──

export const programmeAssignment = pgTable(
  "programme_assignment",
  {
    id: text().primaryKey().notNull(),
    programmeId: text().notNull(),
    groupId: text(),
    assignedAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    festivalId: text().notNull(),
    categoryId: text(),
    studentId: text(),
    teamNumber: integer().default(1).notNull(),
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    createdByEmail: text(),
    createdByName: text(),
  },
  (table) => [
    uniqueIndex("programme_assignment_programmeId_studentId_key")
      .using(
        "btree",
        table.programmeId.asc().nullsLast(),
        table.studentId.asc().nullsLast(),
      )
      .where(sql`${table.studentId} is not null`),
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
      columns: [table.studentId],
      foreignColumns: [student.id],
      name: "programme_assignment_studentId_fkey",
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
    announcedAt: timestamp({ precision: 3, mode: "string" }),
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
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
    startedAt: timestamp({ precision: 3, mode: "string" }),
    startedBy: text(),
    endedAt: timestamp({ precision: 3, mode: "string" }),
    endedBy: text(),
    windowEndsAt: timestamp({ precision: 3, mode: "string" }),
    isLocked: boolean().default(false).notNull(),
    closedAtScheduleStart: boolean().default(true).notNull(),
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
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

// ─── 13. programme_reported_participant (depends on: programme_reporting_session, programme_assignment, student, group) ──

export const programmeReportedParticipant = pgTable(
  "programme_reported_participant",
  {
    id: text().primaryKey().notNull(),
    reportingSessionId: text().notNull(),
    assignmentId: text().notNull(),
    studentId: text(),
    groupId: text(),
    teamNumber: integer(),
    reportedAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
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
    index("programme_reported_participant_studentId_idx").using(
      "btree",
      table.studentId.asc().nullsLast(),
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
      columns: [table.studentId],
      foreignColumns: [student.id],
      name: "programme_reported_participant_studentId_fkey",
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
    issuedAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    issuedBy: text(),
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

// ─── 15. programme_code_letter_recipient (depends on: programme_code_letter, student) ──

export const programmeCodeLetterRecipient = pgTable(
  "programme_code_letter_recipient",
  {
    id: text().primaryKey().notNull(),
    codeLetterId: text().notNull(),
    studentId: text().notNull(),
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex(
      "programme_code_letter_recipient_codeLetterId_studentId_key",
    ).using(
      "btree",
      table.codeLetterId.asc().nullsLast(),
      table.studentId.asc().nullsLast(),
    ),
    index("programme_code_letter_recipient_studentId_idx").using(
      "btree",
      table.studentId.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.codeLetterId],
      foreignColumns: [programmeCodeLetter.id],
      name: "programme_code_letter_recipient_codeLetterId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.studentId],
      foreignColumns: [student.id],
      name: "programme_code_letter_recipient_studentId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

// ─── 16. programme_judge_session (depends on: festival, programme, programme_reporting_session) ──

export const judge = pgTable(
  "judge",
  {
    id: text().primaryKey().notNull(),
    festivalId: text("festival_id").notNull(),
    name: text().notNull(),
    description: text(),
    createdAt: timestamp("created_at", { precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
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

export const judgmentConfig = pgTable(
  "judgment_config",
  {
    id: text().primaryKey().notNull(),
    festivalId: text("festival_id").notNull(),
    programmeId: text("programme_id").notNull(),
    reportingSessionId: text("reporting_session_id").notNull(),
    scoreLimit: integer("score_limit").notNull(),
    judgingMode: text("judging_mode").default("GROUP").notNull(),
    status: text().default("ACTIVE").notNull(),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("judgment_config_festivalId_idx").using(
      "btree",
      table.festivalId.asc().nullsLast(),
    ),
    index("judgment_config_programmeId_idx").using(
      "btree",
      table.programmeId.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "judgment_config_festivalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.programmeId],
      foreignColumns: [programme.id],
      name: "judgment_config_programmeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.reportingSessionId],
      foreignColumns: [programmeReportingSession.id],
      name: "judgment_config_reportingSessionId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const judgmentConfigJudge = pgTable(
  "judgment_config_judge",
  {
    id: text().primaryKey().notNull(),
    configId: text("config_id").notNull(),
    judgeId: text("judge_id").notNull(),
    createdAt: timestamp("created_at", { precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("judgment_config_judge_configId_judgeId_key").using(
      "btree",
      table.configId.asc().nullsLast(),
      table.judgeId.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.configId],
      foreignColumns: [judgmentConfig.id],
      name: "judgment_config_judge_configId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.judgeId],
      foreignColumns: [judge.id],
      name: "judgment_config_judge_judgeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const judgmentLink = pgTable(
  "judgment_link",
  {
    id: text().primaryKey().notNull(),
    configId: text("config_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    pinHash: text("pin_hash").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    expiresAt: timestamp("expires_at", {
      precision: 3,
      mode: "string",
    }).notNull(),
    maxAttempts: integer("max_attempts").default(5).notNull(),
    attempts: integer().default(0).notNull(),
    lockedUntil: timestamp("locked_until", { precision: 3, mode: "string" }),
    boundDeviceHash: text("bound_device_hash"),
    createdAt: timestamp("created_at", { precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    regeneratedAt: timestamp("regenerated_at", {
      precision: 3,
      mode: "string",
    }),
  },
  (table) => [
    uniqueIndex("judgment_link_tokenHash_key").using(
      "btree",
      table.tokenHash.asc().nullsLast(),
    ),
    index("judgment_link_configId_isActive_idx").using(
      "btree",
      table.configId.asc().nullsLast(),
      table.isActive.asc().nullsLast(),
    ),
    index("judgment_link_expiresAt_idx").using(
      "btree",
      table.expiresAt.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.configId],
      foreignColumns: [judgmentConfig.id],
      name: "judgment_link_configId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const judgmentScore = pgTable(
  "judgment_score",
  {
    id: text().primaryKey().notNull(),
    configId: text("config_id").notNull(),
    linkId: text("link_id").notNull(),
    judgeId: text("judge_id").notNull(),
    codeLetterId: text("code_letter_id").notNull(),
    score: doublePrecision().notNull(),
    submittedAt: timestamp("submitted_at", { precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("judgment_score_configId_judgeId_codeLetterId_key").using(
      "btree",
      table.configId.asc().nullsLast(),
      table.judgeId.asc().nullsLast(),
      table.codeLetterId.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.configId],
      foreignColumns: [judgmentConfig.id],
      name: "judgment_score_configId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.linkId],
      foreignColumns: [judgmentLink.id],
      name: "judgment_score_linkId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.judgeId],
      foreignColumns: [judge.id],
      name: "judgment_score_judgeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.codeLetterId],
      foreignColumns: [programmeCodeLetter.id],
      name: "judgment_score_codeLetterId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const programmeJudgeSession = pgTable(
  "programme_judge_session",
  {
    id: text().primaryKey().notNull(),
    festivalId: text("festival_id").notNull(),
    programmeId: text("programme_id").notNull(),
    reportingSessionId: text("reporting_session_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    startedAt: timestamp("started_at", {
      precision: 3,
      mode: "string",
    }).notNull(),
    usedAt: timestamp("used_at", { precision: 3, mode: "string" }),
    endedAt: timestamp("ended_at", { precision: 3, mode: "string" }),
    createdAt: timestamp("created_at", { precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    createdBy: text("created_by"),
    updatedAt: timestamp("updated_at", {
      precision: 3,
      mode: "string",
    }).notNull(),
    openedAt: timestamp("opened_at", { precision: 3, mode: "string" }),
    openExpiresAt: timestamp("open_expires_at", {
      precision: 3,
      mode: "string",
    }),
    openNonceHash: text("open_nonce_hash"),
    openClientFingerprintHash: text("open_client_fingerprint_hash"),
    submittedByName: text("submitted_by_name"),
    submittedByContact: text("submitted_by_contact"),
    submittedByNote: text("submitted_by_note"),
  },
  (table) => [
    index("programme_judge_session_open_expires_at_idx").using(
      "btree",
      table.openExpiresAt.asc().nullsLast(),
    ),
    index("programme_judge_session_programme_id_used_at_idx").using(
      "btree",
      table.programmeId.asc().nullsLast(),
      table.usedAt.asc().nullsLast(),
    ),
    index("programme_judge_session_reporting_session_id_idx").using(
      "btree",
      table.reportingSessionId.asc().nullsLast(),
    ),
    uniqueIndex("programme_judge_session_token_hash_key").using(
      "btree",
      table.tokenHash.asc().nullsLast(),
    ),
    index("programme_judge_session_token_hash_used_at_idx").using(
      "btree",
      table.tokenHash.asc().nullsLast(),
      table.usedAt.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "programme_judge_session_festival_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.programmeId],
      foreignColumns: [programme.id],
      name: "programme_judge_session_programme_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.reportingSessionId],
      foreignColumns: [programmeReportingSession.id],
      name: "programme_judge_session_reporting_session_id_fkey",
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
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
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
    publishedAt: timestamp({ precision: 3, mode: "string" }),
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
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

// ─── 19. festival_gallery_image (depends on: festival) ───────────────────────

export const festivalGalleryImage = pgTable(
  "festival_gallery_image",
  {
    id: text().primaryKey().notNull(),
    festivalId: text().notNull(),
    url: text().notNull(),
    order: integer().default(0).notNull(),
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "festival_gallery_image_festivalId_fkey",
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
    validUntil: timestamp({ precision: 3, mode: "string" }),
    userId: text().notNull(),
    festivalId: text(),
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
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
    loggedAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
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
    lastPurchaseAt: timestamp({ precision: 3, mode: "string" }),
    festivalIds: jsonb(),
    planCountsByTier: jsonb(),
    updatedAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
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
    updatedAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
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
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
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
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
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
    occurredAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
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

// ─── 26. team_leader_otp (depends on: student) ───────────────────────────────

export const teamLeaderOtp = pgTable(
  "team_leader_otp",
  {
    id: text().primaryKey().notNull(),
    studentId: text().notNull(),
    codeHash: text().notNull(),
    expiresAt: timestamp({ precision: 3, mode: "string" }).notNull(),
    attempts: integer().default(0).notNull(),
    consumedAt: timestamp({ precision: 3, mode: "string" }),
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("team_leader_otp_expiresAt_idx").using(
      "btree",
      table.expiresAt.asc().nullsLast(),
    ),
    index("team_leader_otp_studentId_expiresAt_idx").using(
      "btree",
      table.studentId.asc().nullsLast(),
      table.expiresAt.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.studentId],
      foreignColumns: [student.id],
      name: "team_leader_otp_studentId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

// ─── 27. team_leader_session (depends on: student, festival) ─────────────────

export const teamLeaderSession = pgTable(
  "team_leader_session",
  {
    id: text().primaryKey().notNull(),
    studentId: text().notNull(),
    festivalId: text().notNull(),
    tokenHash: text().notNull(),
    expiresAt: timestamp({ precision: 3, mode: "string" }).notNull(),
    revokedAt: timestamp({ precision: 3, mode: "string" }),
    ipAddress: text(),
    userAgent: text(),
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("team_leader_session_expiresAt_idx").using(
      "btree",
      table.expiresAt.asc().nullsLast(),
    ),
    index("team_leader_session_festivalId_expiresAt_idx").using(
      "btree",
      table.festivalId.asc().nullsLast(),
      table.expiresAt.asc().nullsLast(),
    ),
    index("team_leader_session_studentId_expiresAt_idx").using(
      "btree",
      table.studentId.asc().nullsLast(),
      table.expiresAt.asc().nullsLast(),
    ),
    uniqueIndex("team_leader_session_tokenHash_key").using(
      "btree",
      table.tokenHash.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.studentId],
      foreignColumns: [student.id],
      name: "team_leader_session_studentId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "team_leader_session_festivalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

// ─── 28. programme_notification (depends on: festival, user, student) ─────────

export const programmeNotification = pgTable(
  "programme_notification",
  {
    id: text().primaryKey().notNull(),
    festivalId: text().notNull(),
    eventType: programmeNotificationEventType().notNull(),
    recipientUserId: text(),
    recipientStudentId: text(),
    title: text().notNull(),
    body: text().notNull(),
    payload: jsonb(),
    channels: jsonb(),
    isRead: boolean().default(false).notNull(),
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("programme_notification_festivalId_createdAt_idx").using(
      "btree",
      table.festivalId.asc().nullsLast(),
      table.createdAt.asc().nullsLast(),
    ),
    index("programme_notification_recipientStudentId_isRead_idx").using(
      "btree",
      table.recipientStudentId.asc().nullsLast(),
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
    index("programme_notification_recipientStudentId_createdAt_idx").using(
      "btree",
      table.recipientStudentId.asc().nullsLast(),
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
      columns: [table.recipientStudentId],
      foreignColumns: [student.id],
      name: "programme_notification_recipientStudentId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

// ─── 29. realtime_outbox (depends on: festival, user) ────────────────────────

export const realtimeOutbox = pgTable(
  "realtime_outbox",
  {
    id: text().primaryKey().notNull(),
    eventId: text().notNull(),
    eventName: text().notNull(),
    eventVersion: integer().default(1).notNull(),
    festivalId: text().notNull(),
    entityType: text().notNull(),
    entityId: text().notNull(),
    payload: jsonb().notNull(),
    roomKeys: jsonb().notNull(),
    correlationId: text(),
    idempotencyKey: text().notNull(),
    sequence: integer(),
    actorUserId: text(),
    status: realtimeOutboxStatus().default("PENDING").notNull(),
    retryCount: integer().default(0).notNull(),
    nextAttemptAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    errorMessage: text(),
    dispatchedAt: timestamp({ precision: 3, mode: "string" }),
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("realtime_outbox_entityType_entityId_createdAt_idx").using(
      "btree",
      table.entityType.asc().nullsLast(),
      table.entityId.asc().nullsLast(),
      table.createdAt.asc().nullsLast(),
    ),
    uniqueIndex("realtime_outbox_eventId_key").using(
      "btree",
      table.eventId.asc().nullsLast(),
    ),
    index("realtime_outbox_eventName_createdAt_idx").using(
      "btree",
      table.eventName.asc().nullsLast(),
      table.createdAt.asc().nullsLast(),
    ),
    uniqueIndex("realtime_outbox_eventName_idempotencyKey_key").using(
      "btree",
      table.eventName.asc().nullsLast(),
      table.idempotencyKey.asc().nullsLast(),
    ),
    index("realtime_outbox_festivalId_createdAt_idx").using(
      "btree",
      table.festivalId.asc().nullsLast(),
      table.createdAt.asc().nullsLast(),
    ),
    index("realtime_outbox_status_nextAttemptAt_idx").using(
      "btree",
      table.status.asc().nullsLast(),
      table.nextAttemptAt.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.festivalId],
      foreignColumns: [festival.id],
      name: "realtime_outbox_festivalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.actorUserId],
      foreignColumns: [user.id],
      name: "realtime_outbox_actorUserId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
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
    createdAt: timestamp("created_at", { precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
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
