import { formatInTimeZone } from "date-fns-tz";
import { and, eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import { participant } from "@/core/database/schema";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import { publish } from "@/core/pubsub/redis-pubsub";
import { keys } from "@/core/redis/keys";
import * as repo from "../repositories/food-entry.repository";

export async function getFoodHallDashboardData(
  festivalId: string,
  timezone: string,
) {
  const slots = await repo.getFoodSlots(festivalId);
  const today = new Date();
  const todayString = formatInTimeZone(today, timezone, "yyyy-MM-dd");
  let sessions = await repo.getFoodSessionsWithStats(
    festivalId,
    todayString,
    todayString,
  );

  const sessionSlotIds = new Set(sessions.map((session) => session.slotId));
  const missingSessions = slots
    .filter((slot) => !sessionSlotIds.has(slot.id))
    .map((slot) => ({
      id: crypto.randomUUID(),
      festivalId,
      slotId: slot.id,
      sessionDate: todayString,
      status: "OPEN" as const,
    }));

  if (missingSessions.length > 0) {
    await repo.insertSessions(missingSessions);
    sessions = await repo.getFoodSessionsWithStats(
      festivalId,
      todayString,
      todayString,
    );
  }

  const todaySessionsBySlotId = Object.fromEntries(
    sessions.map((session) => [
      session.slotId,
      {
        sessionId: session.id,
        status: session.status,
        scannedCount: session.scannedCount,
      },
    ]),
  );
  return {
    slots,
    todaySessionsBySlotId,
    todayString,
    timezone,
  };
}

export async function recordFoodEntry(
  festivalId: string,
  sessionId: string,
  chestNumber: string,
  scannedByUserId?: string,
  scannedByName?: string,
  scannedByEmail?: string,
) {
  // 1. Verify session exists and is OPEN
  const session = await repo.getSessionById(sessionId);
  if (!session) {
    throw new AppError("Session not found.", "NOT_FOUND");
  }
  if (session.status !== "OPEN") {
    throw new AppError("Session is closed.", "PRECONDITION_FAILED");
  }

  // 2. Find participant by chest number
  const p = await db.query.participant.findFirst({
    where: and(
      eq(participant.festivalId, festivalId),
      eq(participant.chestNumber, chestNumber), // assuming chestNumber exists on participant
    ),
  });

  if (!p) {
    throw new AppError(
      `No participant found with chest number ${chestNumber}.`,
      "NOT_FOUND",
    );
  }

  // 3. Prevent duplicate entry for this session
  // Done via database unique constraint (sessionId, participantId)
  try {
    const entry = await repo.insertFoodEntry({
      id: crypto.randomUUID(),
      sessionId,
      participantId: p.id,
      chestNumber: chestNumber,
      scannedByUserId,
      scannedByName: scannedByName || "Unknown",
      scannedByEmail,
    });

    await publish(keys.foodHallEvents(session.slotId), {
      participantId: p.id,
      chestNumber,
      scannedAt: entry.scannedAt,
    });

    return {
      ...entry,
      participantName: p.name,
    };
  } catch (error: any) {
    // Catch unique constraint violation (code 23505 in Postgres)
    if (error.code === "23505") {
      throw new AppError(
        "Participant has already checked into this session.",
        "CONFLICT",
      );
    }
    throw error;
  }
}

export async function toggleSessionStatus(
  sessionId: string,
  newStatus: "OPEN" | "CLOSED",
) {
  return await repo.updateSessionStatus(sessionId, newStatus);
}
