import crypto from "crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import {
  createRawSessionToken,
  getSessionExpiryDate,
  getTokenHash,
} from "@/core/auth/participant-session";
import { db } from "@/core/database/client";
import { participantOtp, participantSession } from "@/core/database/schema";
import {
  dateKeyLocal,
  wallClockToInstant,
} from "@/core/datetime";
import { fromNow, MS, serverNowIso } from "@/core/datetime/server";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import { findGroupsByFestival } from "@/features/groups/repositories/group.repository";

const OTP_TTL_MS = 10 * MS.minute;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_REQUESTS_PER_10_MIN = 5;

function hashOtp(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function generateOtpCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

export const ParticipantLoginService = {
  async requestAccess(input: {
    festivalSlug: string;
    chestNumber: string;
    identifierKind: "DOB" | "GROUP";
    identifierValue: string;
  }): Promise<
    | {
        status: "AUTHENTICATED";
        participantSlug: string;
        festivalName: string;
        expiresAt: Date;
        rawToken: string;
      }
    | {
        status: "OTP_REQUIRED";
        participantSlug: string;
        festivalName: string;
        debugOtp?: string;
      }
  > {
    const festival = await findFestivalBySlug(input.festivalSlug);
    if (!festival) {
      throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);
    }

    const participantData = await db.query.participant.findFirst({
      where: (s: any, { eq, and }: any) =>
        and(
          eq(s.festivalId, festival.id),
          eq(s.chestNumber, input.chestNumber),
        ),
      with: {
        group: true,
      },
    });

    if (!participantData) {
      throw new AppError(ERROR_MESSAGES.PARTICIPANT_NOT_FOUND);
    }

    if (!participantData.profileSlug) {
      throw new AppError("Participant has no profile slug assigned.");
    }

    if (input.identifierKind === "DOB") {
      if (!participantData.dateOfBirth) {
        throw new AppError(ERROR_MESSAGES.PARTICIPANT_NOT_FOUND);
      }
      const festivalTz = festival.timezone ?? "UTC";

      const storedDayKey = dateKeyLocal(
        wallClockToInstant(
          dateKeyLocal(participantData.dateOfBirth, festivalTz),
          "00:00",
          festivalTz,
        ),
        festivalTz,
      );
      const submittedDayKey = dateKeyLocal(input.identifierValue, festivalTz);

      if (!storedDayKey || !submittedDayKey) {
        throw new AppError(ERROR_MESSAGES.PARTICIPANT_NOT_FOUND);
      }
      if (storedDayKey !== submittedDayKey) {
        console.warn(
          `[participant-login] DOB day mismatch chestNumber=${input.chestNumber} festival=${input.festivalSlug} stored=${storedDayKey} submitted=${submittedDayKey} storedRaw=${participantData.dateOfBirth}`,
        );
        throw new AppError(
          `${ERROR_MESSAGES.PARTICIPANT_INVALID_DOB} (expected ${storedDayKey}).`,
        );
      }
    } else if (input.identifierKind === "GROUP") {
      if (participantData.groupId !== input.identifierValue) {
        throw new AppError(ERROR_MESSAGES.PARTICIPANT_NOT_FOUND);
      }
      const festivalGroups = await findGroupsByFestival(festival.id);
      if (!festivalGroups.some((g) => g.id === input.identifierValue)) {
        throw new AppError(ERROR_MESSAGES.PARTICIPANT_NOT_FOUND);
      }
    }

    if (!participantData.isTeamLeader) {
      const rawToken = createRawSessionToken();
      const expiresAt = getSessionExpiryDate();
      const tokenHash = getTokenHash(rawToken);

      await db.insert(participantSession).values({
        id: crypto.randomUUID(),
        participantId: participantData.id,
        festivalId: festival.id,
        tokenHash,
        expiresAt: expiresAt.toISOString(),
      });

      return {
        status: "AUTHENTICATED",
        participantSlug: participantData.profileSlug,
        festivalName: festival.name,
        expiresAt,
        rawToken,
      };
    }

    // Team Leader
    if (!participantData.email) {
      throw new AppError(
        "Team leader must have a valid email address to receive OTP.",
      );
    }

    const tenMinsAgo = fromNow(-OTP_TTL_MS);
    const recentRequests = await db.query.participantOtp.findMany({
      where: (otp: any, { eq, and, gt }: any) =>
        and(
          eq(otp.participantId, participantData.id),
          gt(otp.createdAt, tenMinsAgo),
        ),
    });

    if (recentRequests.length >= OTP_MAX_REQUESTS_PER_10_MIN) {
      throw new AppError("Too many OTP requests. Please wait 10 minutes.");
    }

    const otpCode = generateOtpCode();
    const codeHash = hashOtp(otpCode);
    const expiresAt = fromNow(OTP_TTL_MS);
    const now = serverNowIso();

    await db.insert(participantOtp).values({
      id: crypto.randomUUID(),
      participantId: participantData.id,
      codeHash,
      expiresAt,
      updatedAt: now,
    });

    const debugOtp =
      process.env.NODE_ENV === "production" ? undefined : otpCode;

    return {
      status: "OTP_REQUIRED",
      participantSlug: participantData.profileSlug,
      festivalName: festival.name,
      debugOtp,
    };
  },

  async verifyOtp(input: {
    festivalSlug: string;
    participantSlug: string;
    otp: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<{
    rawToken: string;
    expiresAt: Date;
    participantSlug: string;
    isTeamLeader: boolean;
  }> {
    const festival = await findFestivalBySlug(input.festivalSlug);
    if (!festival) {
      throw new AppError(
        "FESTIVAL_NOT_FOUND",
        ERROR_MESSAGES.FESTIVAL_NOT_FOUND,
      );
    }

    const participantData = await db.query.participant.findFirst({
      where: (s: any, { eq, and }: any) =>
        and(
          eq(s.festivalId, festival.id),
          eq(s.profileSlug, input.participantSlug),
        ),
    });

    if (!participantData) {
      throw new AppError(ERROR_MESSAGES.PARTICIPANT_NOT_FOUND);
    }

    if (!participantData.profileSlug) {
      throw new AppError("Participant has no profile slug assigned.");
    }

    if (!participantData.isTeamLeader) {
      throw new AppError("Not a team leader.");
    }

    const now = serverNowIso();
    const latestOtp = await db.query.participantOtp.findFirst({
      where: (otp: any, { eq, and, isNull, gt }: any) =>
        and(
          eq(otp.participantId, participantData.id),
          isNull(otp.consumedAt),
          gt(otp.expiresAt, now),
        ),
      orderBy: (otp: any, { desc }: any) => [desc(otp.createdAt)],
    });

    if (!latestOtp) {
      throw new AppError("OTP is invalid or expired.");
    }

    if (latestOtp.attempts >= OTP_MAX_ATTEMPTS) {
      await db
        .update(participantOtp)
        .set({ consumedAt: now })
        .where(eq(participantOtp.id, latestOtp.id));
      throw new AppError("OTP is invalid or expired.");
    }

    const inputHash = hashOtp(input.otp);
    if (inputHash !== latestOtp.codeHash) {
      await db
        .update(participantOtp)
        .set({ attempts: latestOtp.attempts + 1 })
        .where(eq(participantOtp.id, latestOtp.id));
      throw new AppError("OTP is invalid or expired.");
    }

    await db
      .update(participantOtp)
      .set({ consumedAt: now })
      .where(eq(participantOtp.id, latestOtp.id));

    const rawToken = createRawSessionToken();
    const expiresAt = getSessionExpiryDate();
    const tokenHash = getTokenHash(rawToken);

    await db.insert(participantSession).values({
      id: crypto.randomUUID(),
      participantId: participantData.id,
      festivalId: festival.id,
      tokenHash,
      expiresAt: expiresAt.toISOString(),
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    return {
      rawToken,
      expiresAt,
      participantSlug: input.participantSlug,
      isTeamLeader: Boolean(participantData.isTeamLeader),
    };
  },

  async revokeSessionByRawToken(rawToken: string): Promise<void> {
    const tokenHash = getTokenHash(rawToken);
    await db
      .update(participantSession)
      .set({ revokedAt: serverNowIso() })
      .where(
        and(
          eq(participantSession.tokenHash, tokenHash),
          isNull(participantSession.revokedAt),
        ),
      );
  },
};
