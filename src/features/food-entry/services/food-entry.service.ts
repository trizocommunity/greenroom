import { eq, and } from "drizzle-orm";
import { db } from "@/core/database/client";
import { participant } from "@/core/database/schema";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import { formatInTimeZone } from "date-fns-tz";
import * as repo from "../repositories/food-entry.repository";
import {
  determineActiveSession,
  FoodSlot,
  FoodSessionRow,
} from "./food-entry.active";

export async function getFoodHallDashboardData(
  festivalId: string,
  timezone: string,
) {
  // Get all slots for this festival
  const slots = await repo.getFoodSlots(festivalId);
  // Get today's date in festival timezone
  const today = new Date();
  const todayString = formatInTimeZone(today, timezone, "yyyy-MM-dd");

  // Get today's sessions
  const sessions = await repo.getFoodSessionsWithStats(
    festivalId,
    todayString,
    todayString,
  );

  // Ensure sessions exist for today's slots
  const sessionRows = sessions.map((s) => ({
    id: s.id,
    slotId: s.slotId,
    sessionDate: s.sessionDate,
    status: s.status,
  }));

  const activeSession = determineActiveSession(
    today,
    timezone,
    slots as FoodSlot[],
    sessionRows,
  );

  return {
    slots,
    sessions,
    activeSessionId: activeSession?.id || null,
    todayString,
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
