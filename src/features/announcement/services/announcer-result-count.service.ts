import { and, eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  festival as festivalTable,
  result as resultTable,
} from "@/core/database/schema";

type ResultRow = {
  id: string;
  isPublished: boolean;
  isAnnounced: boolean;
  programmeId: string;
  programme?: { id: string; type: "INDIVIDUAL" | "GROUP" } | null;
  programmeAssignment?: {
    group?: { id: string } | null;
    teamNumber?: number | null;
  } | null;
};

/** Unique result slot key (GROUP programmes: one slot per team). */
export function resultSlotKey(r: ResultRow): string {
  const programmeId = r.programmeId;
  const type = r.programme?.type ?? "INDIVIDUAL";
  if (type === "GROUP") {
    const groupId = r.programmeAssignment?.group?.id ?? "no-group";
    const teamNumber = r.programmeAssignment?.teamNumber ?? 1;
    return `${programmeId}:${groupId}:${teamNumber}`;
  }
  return `${programmeId}:${r.id}`;
}

export function countResultSlots(
  rows: ResultRow[],
  mode: "published" | "announced" | "pendingAnnounce",
): number {
  const keys = new Set<string>();
  for (const r of rows) {
    const published = r.isPublished;
    const announced = r.isAnnounced;
    if (mode === "published" && !published) continue;
    if (mode === "announced" && !announced) continue;
    if (mode === "pendingAnnounce" && (!published || announced)) continue;
    keys.add(resultSlotKey(r));
  }
  return keys.size;
}

export async function loadFestivalResultRows(festivalId: string) {
  return db.query.result.findMany({
    where: eq(resultTable.festivalId, festivalId),
    columns: {
      id: true,
      isPublished: true,
      isAnnounced: true,
      programmeId: true,
    },
    with: {
      programme: { columns: { id: true, type: true } },
      programmeAssignment: {
        columns: { teamNumber: true },
        with: { group: { columns: { id: true } } },
      },
    },
  });
}

export async function countPendingAnnounceSlotsForProgramme(
  festivalId: string,
  programmeId: string,
): Promise<number> {
  const rows = await loadFestivalResultRows(festivalId);
  return countResultSlots(
    rows.filter((r) => r.programmeId === programmeId),
    "pendingAnnounce",
  );
}

export type AnnouncerBlockProgress = {
  /** Configured "Number of results" before group standings. */
  resultsPerBlock: number;
  /** Announced result slots since last standings publish. */
  announcedResultsSinceStandings: number;
  resultsUntilStandings: number;
  standingsDue: boolean;
  canPublishStandings: boolean;
  totalAnnouncedSlots: number;
  totalOnDeskSlots: number;
  totalPendingAnnounceSlots: number;
  publicDisplayMode: "programme_results" | "team_standings";
};

export async function getAnnouncerBlockProgress(
  festivalId: string,
): Promise<AnnouncerBlockProgress> {
  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, festivalId),
    columns: {
      announcerResultsPerStandings: true,
      announcedProgrammesSinceStandings: true,
      publicDisplayMode: true,
    },
  });

  const perBlock = Math.max(1, festival?.announcerResultsPerStandings ?? 10);
  const since = festival?.announcedProgrammesSinceStandings ?? 0;
  const mod = since % perBlock;
  const resultsUntilStandings =
    since > 0 && mod === 0 ? 0 : mod === 0 ? perBlock : perBlock - mod;

  const rows = await loadFestivalResultRows(festivalId);
  const totalAnnouncedSlots = countResultSlots(rows, "announced");
  const totalOnDeskSlots = countResultSlots(rows, "published");
  const totalPendingAnnounceSlots = countResultSlots(rows, "pendingAnnounce");

  return {
    resultsPerBlock: perBlock,
    announcedResultsSinceStandings: since,
    resultsUntilStandings,
    standingsDue: since > 0 && mod === 0,
    canPublishStandings: since >= perBlock,
    totalAnnouncedSlots,
    totalOnDeskSlots,
    totalPendingAnnounceSlots,
    publicDisplayMode:
      (festival?.publicDisplayMode as "programme_results" | "team_standings") ??
      "programme_results",
  };
}
