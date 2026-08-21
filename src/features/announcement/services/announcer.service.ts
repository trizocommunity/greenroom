/**
 * Announcer Service — compatibility barrel
 *
 * The implementation has been split into focused read-model modules:
 *   - result-display.resolver.ts
 *   - announcer-queue.read-model.ts
 *   - published-results.read-model.ts
 *   - team-standings.read-model.ts
 *   - participant-top-scorers.read-model.ts
 *   - awards.read-model.ts
 *
 * This file re-exports the previous public API so existing pages, actions,
 * and components keep compiling. New callers should import directly from the
 * focused module that owns the data they need.
 */

export {
  type ActiveReportingProgramme,
  type AnnouncerQueueProgramme,
  getActiveReportingSessions,
  getAnnouncerQueue,
  getCallListProgrammes,
  getResultsConsoleProgrammes,
} from "@/features/announcement/services/announcer-queue.read-model";
export {
  getPenOfTheFest,
  getVocalOfTheFest,
} from "@/features/announcement/services/awards.read-model";
export {
  getParticipantTopScorers,
  type ParticipantTopScorerRow,
} from "@/features/announcement/services/participant-top-scorers.read-model";
export {
  getPublishedResults,
  type PublishedResultProgramme,
} from "@/features/announcement/services/published-results.read-model";
export {
  type DisplayInfo,
  formatParticipantLabel,
  type ProgrammeResultRow,
  type ResultDisplayRow,
  resolveAssignmentDisplays,
} from "@/features/announcement/services/result-display.resolver";
export {
  computeStandings,
  getNextResultNumber,
  getProgrammeStatusCounts,
  getStandingsContext,
  type TeamStandingRow,
} from "@/features/announcement/services/team-standings.read-model";
