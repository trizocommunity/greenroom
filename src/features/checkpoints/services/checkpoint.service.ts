import { format } from "date-fns";
import { and, eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import { category, group, participant } from "@/core/database/schema";
import { AppError } from "@/core/errors/errors";
import { publish } from "@/core/pubsub/redis-pubsub";
import { keys } from "@/core/redis/keys";
import * as repo from "../repositories/checkpoint.repository";
import type {
  StartSessionInput,
  UpdateCheckpointInput,
} from "../schemas/checkpoint.schema";

type Actor = { name?: string | null; email?: string | null };

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function formatMinuteLabel(min: number) {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

function defaultSessionName(
  windowStartMin: number | null,
  windowEndMin: number | null,
) {
  if (windowStartMin == null) return format(new Date(), "HH:mm");
  if (windowEndMin == null) return formatMinuteLabel(windowStartMin);
  return `${formatMinuteLabel(windowStartMin)} – ${formatMinuteLabel(windowEndMin)}`;
}

/**
 * Ensure the two built-in checkpoints exist for a festival. Idempotent — a
 * unique (festivalId, name) index makes re-seeding a no-op.
 */
export async function seedBuiltInCheckpoints(
  festivalId: string,
  actor?: Actor,
) {
  await repo.insertCheckpoints([
    {
      id: crypto.randomUUID(),
      festivalId,
      name: "Attendance",
      requiresWindow: false,
      isBuiltIn: true,
      sortOrder: 0,
      createdByName: actor?.name ?? null,
      createdByEmail: actor?.email ?? null,
    },
    {
      id: crypto.randomUUID(),
      festivalId,
      name: "Food",
      requiresWindow: true,
      isBuiltIn: true,
      sortOrder: 1,
      createdByName: actor?.name ?? null,
      createdByEmail: actor?.email ?? null,
    },
  ]);
}

export async function getCheckpointsPageData(
  festivalId: string,
  actor?: Actor,
) {
  await seedBuiltInCheckpoints(festivalId, actor);
  const checkpoints = await repo.getCheckpoints(festivalId);
  const todayString = format(new Date(), "yyyy-MM-dd");
  const [todaySessions, sessionCounts] = await Promise.all([
    repo.getSessionsWithStats(festivalId, {
      fromDate: todayString,
      toDate: todayString,
    }),
    repo.getSessionCountsByCheckpoint(festivalId),
  ]);

  const statsByCheckpoint = new Map<
    string,
    { openSessions: number; scannedToday: number }
  >();
  for (const s of todaySessions) {
    const stat = statsByCheckpoint.get(s.checkpointId) ?? {
      openSessions: 0,
      scannedToday: 0,
    };
    if (s.status === "OPEN") stat.openSessions += 1;
    stat.scannedToday += s.scannedCount;
    statsByCheckpoint.set(s.checkpointId, stat);
  }

  return {
    checkpoints: checkpoints.map((c) => ({
      id: c.id,
      name: c.name,
      requiresWindow: c.requiresWindow,
      isBuiltIn: c.isBuiltIn,
      openSessions: statsByCheckpoint.get(c.id)?.openSessions ?? 0,
      scannedToday: statsByCheckpoint.get(c.id)?.scannedToday ?? 0,
      sessionCount: sessionCounts.get(c.id) ?? 0,
    })),
    todayString,
  };
}

export async function getCheckpointDetailData(
  festivalId: string,
  checkpointId: string,
  opts: { fromDate?: string; toDate?: string } = {},
) {
  const cp = await repo.getCheckpointById(checkpointId);
  if (!cp || cp.festivalId !== festivalId) return null;

  const [sessions, dates, filters] = await Promise.all([
    repo.getSessionsWithStats(festivalId, { checkpointId, ...opts }),
    repo.getDistinctSessionDates(festivalId, checkpointId),
    repo.getGroupsAndCategoriesForFestival(festivalId),
  ]);

  return {
    checkpoint: {
      id: cp.id,
      name: cp.name,
      requiresWindow: cp.requiresWindow,
      isBuiltIn: cp.isBuiltIn,
    },
    sessions,
    dates,
    filters,
    todayString: format(new Date(), "yyyy-MM-dd"),
  };
}

export async function startCheckpointSession(
  input: StartSessionInput,
  actor?: Actor,
) {
  const cp = await repo.getCheckpointById(input.checkpointId);
  if (!cp || cp.festivalId !== input.festivalId) {
    throw new AppError("Checkpoint not found.", "NOT_FOUND");
  }
  if (cp.requiresWindow && input.windowStartMin == null) {
    throw new AppError(
      "Start time is required for this checkpoint.",
      "PRECONDITION_FAILED",
    );
  }

  const windowStartMin = input.windowStartMin ?? null;
  const windowEndMin = input.windowEndMin ?? null;

  return await repo.insertCheckpointSession({
    id: crypto.randomUUID(),
    festivalId: input.festivalId,
    checkpointId: cp.id,
    name:
      input.name?.trim() || defaultSessionName(windowStartMin, windowEndMin),
    sessionDate: input.date,
    windowStartMin,
    windowEndMin,
    status: "OPEN",
    createdByName: actor?.name ?? null,
    createdByEmail: actor?.email ?? null,
  });
}

export async function recordCheckpointScan(
  festivalId: string,
  sessionId: string,
  chestNumber: string,
  actor?: { userId?: string; name?: string | null; email?: string | null },
) {
  const session = await repo.getCheckpointSessionById(sessionId);
  if (!session) throw new AppError("Session not found.", "NOT_FOUND");
  if (session.status !== "OPEN") {
    throw new AppError("Session is closed.", "PRECONDITION_FAILED");
  }

  const [p] = await db
    .select({
      id: participant.id,
      name: participant.name,
      chestNumber: participant.chestNumber,
      groupName: group.name,
      categoryName: category.name,
    })
    .from(participant)
    .leftJoin(group, eq(participant.groupId, group.id))
    .leftJoin(category, eq(participant.categoryId, category.id))
    .where(
      and(
        eq(participant.festivalId, festivalId),
        eq(participant.chestNumber, chestNumber),
      ),
    )
    .limit(1);

  if (!p) {
    throw new AppError(
      `No participant found with chest number ${chestNumber}.`,
      "NOT_FOUND",
    );
  }

  try {
    const scan = await repo.insertScan({
      id: crypto.randomUUID(),
      sessionId,
      participantId: p.id,
      chestNumber,
      scannedByUserId: actor?.userId,
      scannedByName: actor?.name || "Unknown",
      scannedByEmail: actor?.email ?? undefined,
    });

    await publish(keys.checkpointEvents(sessionId), {
      participantId: p.id,
      chestNumber,
      scannedAt: scan.scannedAt,
    });

    return {
      scannedAt: scan.scannedAt,
      participant: {
        id: p.id,
        name: p.name,
        chestNumber: p.chestNumber,
        groupName: p.groupName ?? undefined,
        categoryName: p.categoryName ?? undefined,
      },
    };
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      throw new AppError(
        "Participant has already been scanned at this session.",
        "CONFLICT",
      );
    }
    throw error;
  }
}

export async function toggleSessionStatus(
  sessionId: string,
  status: "OPEN" | "CLOSED",
) {
  return await repo.updateSessionStatus(sessionId, status);
}

/** Rename / retype a custom checkpoint. Built-ins are locked. */
export async function updateCheckpoint(input: UpdateCheckpointInput) {
  const cp = await repo.getCheckpointById(input.checkpointId);
  if (!cp || cp.festivalId !== input.festivalId) {
    throw new AppError("Checkpoint not found.", "NOT_FOUND");
  }
  if (cp.isBuiltIn) {
    throw new AppError(
      "Built-in checkpoints can't be edited.",
      "PRECONDITION_FAILED",
    );
  }
  return await repo.updateCheckpoint(input.checkpointId, {
    name: input.name,
    requiresWindow: input.requiresWindow,
  });
}

/** Delete a custom checkpoint; cascades to its sessions + scans. Built-ins locked. */
export async function deleteCheckpoint(
  festivalId: string,
  checkpointId: string,
) {
  const cp = await repo.getCheckpointById(checkpointId);
  if (!cp || cp.festivalId !== festivalId) {
    throw new AppError("Checkpoint not found.", "NOT_FOUND");
  }
  if (cp.isBuiltIn) {
    throw new AppError(
      "Built-in checkpoints can't be deleted.",
      "PRECONDITION_FAILED",
    );
  }
  await repo.deleteCheckpoint(checkpointId);
}

/** Delete a single session; cascades to its scans. */
export async function deleteSession(festivalId: string, sessionId: string) {
  const session = await repo.getCheckpointSessionById(sessionId);
  if (!session || session.festivalId !== festivalId) {
    throw new AppError("Session not found.", "NOT_FOUND");
  }
  await repo.deleteSession(sessionId);
}

/** Cron entry point — close sessions idle for `idleMinutes`. */
export async function closeIdleCheckpointSessions(idleMinutes = 10) {
  const closed = await repo.closeIdleCheckpointSessions(idleMinutes);
  return { closed: closed.length, ids: closed };
}
