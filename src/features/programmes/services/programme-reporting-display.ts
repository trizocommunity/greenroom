/** Build per-programme latest session + latest CLOSED session (for code letters). */

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
