/**
 * Browser-safe re-export of Prisma enums only.
 * Use this in code that is bundled for the client (e.g. validations, client components)
 * so we don't pull in the full Prisma client (Node-only).
 */
export {
  CategoryType,
  EventType,
  FestivalRole,
  FestivalStatus,
  Gender,
  GlobalRole,
  GroupType,
  InstitutionType,
  PaymentPurpose,
  PaymentStatus,
  ProgrammeType,
  ScoringSystem,
  StageType,
  TicketPriority,
  TicketStatus,
  Tier,
} from "@/app/generated/prisma/enums";
