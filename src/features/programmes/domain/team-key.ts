/**
 * Composite key for "a team in a programme".
 *
 * Two variants:
 * - `teamKey({ programmeId, groupId, teamNumber })` — used anywhere we need a
 *   globally-unique key (cross-programme lookups, action-layer joins).
 * - `teamKey.partial({ groupId, teamNumber })` — used when the caller is
 *   already iterating within a single programme's data (e.g. bucketing the
 *   reporting roster). `programmeId` is intentionally omitted so the resulting
 *   string stays short, but the helper enforces the invariant that this
 *   shape is only safe inside a programme-scoped loop.
 *
 * `groupId` and `teamNumber` may be null/undefined; both are normalized.
 */
export type TeamKeyParts = {
  programmeId: string;
  groupId: string | null | undefined;
  teamNumber: number | null | undefined;
};

export type TeamKeyPartialParts = {
  groupId: string | null | undefined;
  teamNumber: number | null | undefined;
};

const SEP = "::";

export function teamKey({
  programmeId,
  groupId,
  teamNumber,
}: TeamKeyParts): string {
  return `${programmeId}${SEP}${normalizeGroup(groupId)}${SEP}${normalizeTeam(teamNumber)}`;
}

teamKey.partial = function teamKeyPartial({
  groupId,
  teamNumber,
}: TeamKeyPartialParts): string {
  return `${normalizeGroup(groupId)}${SEP}${normalizeTeam(teamNumber)}`;
};

function normalizeGroup(groupId: string | null | undefined): string {
  return groupId ?? "no-group";
}

function normalizeTeam(teamNumber: number | null | undefined): number {
  return teamNumber ?? 0;
}
