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
  type DisplayInfo,
  formatParticipantLabel,
  type ProgrammeResultRow,
  type ResultDisplayRow,
  resolveAssignmentDisplays,
} from "@/features/announcement/services/result-display.resolver";

export {
  type AnnouncerQueueProgramme,
  getAnnouncerQueue,
  getResultsConsoleProgrammes,
} from "@/features/announcement/services/announcer-queue.read-model";

export {
  type PublishedResultProgramme,
  getPublishedResults,
} from "@/features/announcement/services/published-results.read-model";

export {
  type TeamStandingRow,
  computeStandings,
  getNextResultNumber,
  getProgrammeStatusCounts,
  getStandingsContext,
} from "@/features/announcement/services/team-standings.read-model";

export {
  type ParticipantTopScorerRow,
  getParticipantTopScorers,
} from "@/features/announcement/services/participant-top-scorers.read-model";

export {
  getPenOfTheFest,
  getVocalOfTheFest,
} from "@/features/announcement/services/awards.read-model";
