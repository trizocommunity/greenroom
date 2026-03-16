/**
 * Client-safe enum constants that mirror Prisma enums.
 * Use in code that is bundled for the browser (validations, client components)
 * so we don't pull in the Prisma client (Node-only).
 * Keep in sync with prisma/schema.prisma enums.
 */

export const CategoryType = {
  SINGLE: "SINGLE",
  GENERAL: "GENERAL",
} as const;
export type CategoryType = (typeof CategoryType)[keyof typeof CategoryType];

export const FestivalRole = {
  ADMIN: "ADMIN",
  ANNOUNCER: "ANNOUNCER",
  STAGE_MANAGER: "STAGE_MANAGER",
} as const;
export type FestivalRole = (typeof FestivalRole)[keyof typeof FestivalRole];

export const FestivalStatus = {
  READY: "READY",
  ONGOING: "ONGOING",
  PAST: "PAST",
  EXPIRED: "EXPIRED",
} as const;
export type FestivalStatus = (typeof FestivalStatus)[keyof typeof FestivalStatus];

export const Gender = {
  MALE: "MALE",
  FEMALE: "FEMALE",
  OTHER: "OTHER",
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

export const GlobalRole = {
  USER: "USER",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;
export type GlobalRole = (typeof GlobalRole)[keyof typeof GlobalRole];

export const GroupType = {
  SCHOOL: "SCHOOL",
  COLLEGE: "COLLEGE",
  MADRASA: "MADRASA",
  OPEN: "OPEN",
} as const;
export type GroupType = (typeof GroupType)[keyof typeof GroupType];

export const InstitutionType = {
  UNIVERSITY: "UNIVERSITY",
  INSTITUTION: "INSTITUTION",
  CAMPUS: "CAMPUS",
  COLLEGE: "COLLEGE",
  MADRASA: "MADRASA",
  SCHOOL: "SCHOOL",
  OTHER: "OTHER",
} as const;
export type InstitutionType = (typeof InstitutionType)[keyof typeof InstitutionType];

export const PaymentPurpose = {
  FESTIVAL_CREATION: "FESTIVAL_CREATION",
} as const;
export type PaymentPurpose = (typeof PaymentPurpose)[keyof typeof PaymentPurpose];

export const PaymentStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const ProgrammeType = {
  INDIVIDUAL: "INDIVIDUAL",
  GROUP: "GROUP",
} as const;
export type ProgrammeType = (typeof ProgrammeType)[keyof typeof ProgrammeType];

export const ScoringSystem = {
  POSITION_BASED: "POSITION_BASED",
  SCORE_BASED: "SCORE_BASED",
} as const;
export type ScoringSystem = (typeof ScoringSystem)[keyof typeof ScoringSystem];

export const ScheduleEntryType = {
  PROGRAMME: "PROGRAMME",
  SESSION: "SESSION",
} as const;
export type ScheduleEntryType = (typeof ScheduleEntryType)[keyof typeof ScheduleEntryType];

export const SessionType = {
  GENERAL: "GENERAL",
  CEREMONY: "CEREMONY",
  TALK: "TALK",
  CONCERT: "CONCERT",
} as const;
export type SessionType = (typeof SessionType)[keyof typeof SessionType];

export const StageType = {
  STAGE: "STAGE",
  NON_STAGE: "NON_STAGE",
} as const;
export type StageType = (typeof StageType)[keyof typeof StageType];

export const TicketPriority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
} as const;
export type TicketPriority = (typeof TicketPriority)[keyof typeof TicketPriority];

export const TicketStatus = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
} as const;
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

export const Tier = {
  BASIC: "BASIC",
  STANDARD: "STANDARD",
  PRO: "PRO",
} as const;
export type Tier = (typeof Tier)[keyof typeof Tier];
