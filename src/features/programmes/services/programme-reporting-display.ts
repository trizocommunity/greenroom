/** Build per-programme latest session + latest CLOSED session (for code letters). */

import { sql } from "drizzle-orm";

/**
 * Row filter for every participant-facing code letter query.
 *
 * Code letters are written at checkout, well before anyone scratches them, so
 * an unfiltered read would hand participants the answer to the draw. Only
 * scratched tiles are theirs to see.
 */
export const revealedCodeLettersOnly = sql`revealed_at is not null`;

export type ReportingSessionLike = {
  programmeId: string;
  status: string;
  updatedAt?: string | null;
};

export function indexReportingSessionsByProgramme<
  T extends ReportingSessionLike,
>(
  sessions: T[],
): {
  latestByProgrammeId: Map<string, T>;
  latestClosedByProgrammeId: Map<string, T>;
} {
  const latestByProgrammeId = new Map<string, T>();
  const latestClosedByProgrammeId = new Map<string, T>();

  for (const session of sessions) {
    if (!latestByProgrammeId.has(session.programmeId)) {
      latestByProgrammeId.set(session.programmeId, session);
    }
    if (
      session.status === "CLOSED" &&
      !latestClosedByProgrammeId.has(session.programmeId)
    ) {
      latestClosedByProgrammeId.set(session.programmeId, session);
    }
  }

  return { latestByProgrammeId, latestClosedByProgrammeId };
}
