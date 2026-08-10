/**
 * Pure planning logic for the scratch-to-reveal draw.
 *
 * Kept free of DB access so the two properties that actually matter can be
 * unit tested: every checked-out unit gets exactly one code, and the queue
 * order (checkout scan order) is independent of the code order (shuffled).
 */

export type ProgrammeType = "INDIVIDUAL" | "GROUP";

/** One row of programme_reported_participant, as written during checkout. */
export type CheckoutRow = {
  participantId: string | null;
  groupId: string | null;
  teamNumber: number | null;
  assignmentMemberId: string | null;
  reportedAt: string | null;
};

/** One scratchable tile: a participant (INDIVIDUAL) or a team (GROUP). */
export type CheckoutUnit = {
  key: string;
  participantId: string | null;
  groupId: string | null;
  teamNumber: number | null;
  /** Everyone who receives this tile's code. Multiple members for GROUP. */
  recipients: Array<{
    participantId: string;
    assignmentMemberId: string | null;
  }>;
  /** Earliest checkout timestamp in the unit — drives queue order. */
  checkedOutAt: string | null;
};

export type ScratchCodeAssignment = {
  code: string;
  queuePosition: number;
  participantId: string | null;
  groupId: string | null;
  teamNumber: number | null;
};

export function sequentialAlphabetCode(indexOneBased: number): string {
  let n = Math.max(1, indexOneBased);
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/**
 * Identity of a scratchable unit. The planner and the read side that turns
 * assignments back into DB rows both build this the same way, so a unit can be
 * matched across the event boundary instead of re-joining on loose columns.
 */
export function unitKey(
  target: {
    participantId?: string | null;
    groupId?: string | null;
    teamNumber?: number | null;
  },
  programmeType: ProgrammeType,
): string {
  const isTeam =
    programmeType === "GROUP" &&
    target.groupId != null &&
    target.teamNumber != null;
  return isTeam
    ? `team:${target.groupId} ${target.teamNumber}`
    : `solo:${target.participantId}`;
}

/**
 * Collapses reported-participant rows into scratchable units.
 *
 * GROUP programmes fan out one row per team member, so rows are folded back
 * onto (groupId, teamNumber) and the whole team shares one tile. INDIVIDUAL
 * programmes get one tile per participant.
 */
export function groupIntoUnits(
  rows: CheckoutRow[],
  programmeType: ProgrammeType,
): CheckoutUnit[] {
  const byKey = new Map<string, CheckoutUnit>();

  for (const row of rows) {
    const isTeam =
      programmeType === "GROUP" &&
      row.groupId != null &&
      row.teamNumber != null;

    // A row with no participant carries no code recipient and no identity.
    if (!isTeam && !row.participantId) continue;

    const key = unitKey(row, programmeType);
    let unit = byKey.get(key);
    if (!unit) {
      unit = {
        key,
        participantId: isTeam ? null : row.participantId,
        groupId: isTeam ? row.groupId : null,
        teamNumber: isTeam ? row.teamNumber : null,
        recipients: [],
        checkedOutAt: row.reportedAt,
      };
      byKey.set(key, unit);
    }

    if (row.participantId) {
      const already = unit.recipients.some(
        (r) => r.participantId === row.participantId,
      );
      if (!already) {
        unit.recipients.push({
          participantId: row.participantId,
          assignmentMemberId: row.assignmentMemberId,
        });
      }
    }

    // Queue position follows the FIRST scan of the unit.
    if (
      row.reportedAt &&
      (!unit.checkedOutAt || row.reportedAt < unit.checkedOutAt)
    ) {
      unit.checkedOutAt = row.reportedAt;
    }
  }

  return Array.from(byKey.values()).filter((u) => u.recipients.length > 0);
}

/**
 * Assigns each unit a queue position (checkout scan order) and a code letter
 * (shuffled). The two orders are deliberately independent: knowing you were
 * third to check in must tell you nothing about which letter you will draw.
 *
 * `shuffle` is injected so tests can pin the permutation.
 */
export function planScratchCodes(
  units: CheckoutUnit[],
  shuffle: <T>(arr: T[]) => void,
): ScratchCodeAssignment[] {
  // Checkout scan order. Units with no timestamp sort last but stay stable.
  const queued = [...units].sort((a, b) => {
    if (a.checkedOutAt && b.checkedOutAt) {
      if (a.checkedOutAt !== b.checkedOutAt) {
        return a.checkedOutAt < b.checkedOutAt ? -1 : 1;
      }
      return a.key < b.key ? -1 : 1;
    }
    if (a.checkedOutAt) return -1;
    if (b.checkedOutAt) return 1;
    return a.key < b.key ? -1 : 1;
  });

  const queuePositionByKey = new Map<string, number>();
  queued.forEach((unit, index) => {
    queuePositionByKey.set(unit.key, index + 1);
  });

  const drawOrder = [...queued];
  shuffle(drawOrder);

  return drawOrder.map((unit, index) => ({
    code: sequentialAlphabetCode(index + 1),
    queuePosition: queuePositionByKey.get(unit.key) as number,
    participantId: unit.participantId,
    groupId: unit.groupId,
    teamNumber: unit.teamNumber,
  }));
}
