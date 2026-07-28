import crypto from "crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import {
  createRawSessionToken,
  getSessionExpiryDate,
  getTokenHash,
} from "@/core/auth/participant-session";
import { db } from "@/core/database/client";
import { participantOtp, participantSession } from "@/core/database/schema";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import { findGroupsByFestival } from "@/features/groups/repositories/group.repository";

const OTP_TTL_MS = 10 * 60 * 1000;
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
        studentSlug: string;
        festivalName: string;
        expiresAt: Date;
        rawToken: string;
      }
    | {
        status: "OTP_REQUIRED";
        studentSlug: string;
        festivalName: string;
        debugOtp?: string;
      }
  > {
    const festival = await findFestivalBySlug(input.festivalSlug);
    if (!festival) {
      throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);
    }

    const studentData = await db.query.student.findFirst({
      where: (s: any, { eq, and }: any) =>
        and(
          eq(s.festivalId, festival.id),
          eq(s.chestNumber, input.chestNumber),
        ),
      with: {
        group: true,
      },
    });

    if (!studentData) {
      throw new AppError(ERROR_MESSAGES.STUDENT_NOT_FOUND);
    }

    if (!studentData.profileSlug) {
      throw new AppError("Student has no profile slug assigned.");
    }

    if (input.identifierKind === "DOB") {
      if (!studentData.dateOfBirth) {
        throw new AppError(ERROR_MESSAGES.STUDENT_NOT_FOUND);
      }
      const studentDob = new Date(studentData.dateOfBirth)
        .toISOString()
        .split("T")[0];
      const inputDob = new Date(input.identifierValue)
        .toISOString()
        .split("T")[0];
      if (studentDob !== inputDob) {
        throw new AppError(ERROR_MESSAGES.STUDENT_NOT_FOUND);
      }
    } else if (input.identifierKind === "GROUP") {
      if (studentData.groupId !== input.identifierValue) {
        throw new AppError(ERROR_MESSAGES.STUDENT_NOT_FOUND);
      }
      const festivalGroups = await findGroupsByFestival(festival.id);
      if (!festivalGroups.some((g) => g.id === input.identifierValue)) {
        throw new AppError(ERROR_MESSAGES.STUDENT_NOT_FOUND);
      }
    }

    if (!studentData.isTeamLeader) {
      const rawToken = createRawSessionToken();
      const expiresAt = getSessionExpiryDate();
      const tokenHash = getTokenHash(rawToken);

      await db.insert(participantSession).values({
        id: crypto.randomUUID(),
        studentId: studentData.id,
        festivalId: festival.id,
        tokenHash,
        expiresAt: expiresAt.toISOString(),
      });

      return {
        status: "AUTHENTICATED",
        studentSlug: studentData.profileSlug,
        festivalName: festival.name,
        expiresAt,
        rawToken,
      };
    }

    // Team Leader
    if (!studentData.email) {
      throw new AppError(
        "Team leader must have a valid email address to receive OTP.",
      );
    }

    const tenMinsAgo = new Date(Date.now() - OTP_TTL_MS).toISOString();
    const recentRequests = await db.query.participantOtp.findMany({
      where: (otp: any, { eq, and, gt }: any) =>
        and(eq(otp.studentId, studentData.id), gt(otp.createdAt, tenMinsAgo)),
    });

    if (recentRequests.length >= OTP_MAX_REQUESTS_PER_10_MIN) {
      throw new AppError("Too many OTP requests. Please wait 10 minutes.");
    }

    const otpCode = generateOtpCode();
    const codeHash = hashOtp(otpCode);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    const now = new Date().toISOString();

    await db.insert(participantOtp).values({
      id: crypto.randomUUID(),
      studentId: studentData.id,
      codeHash,
      expiresAt: expiresAt.toISOString(),
      updatedAt: now,
    });

    const debugOtp =
      process.env.NODE_ENV === "production" ? undefined : otpCode;

    return {
      status: "OTP_REQUIRED",
      studentSlug: studentData.profileSlug,
      festivalName: festival.name,
      debugOtp,
    };
  },

  async verifyOtp(input: {
    festivalSlug: string;
    studentSlug: string;
    otp: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<{
    rawToken: string;
    expiresAt: Date;
    studentSlug: string;
    isTeamLeader: boolean;
  }> {
    const festival = await findFestivalBySlug(input.festivalSlug);
    if (!festival) {
      throw new AppError(
        "FESTIVAL_NOT_FOUND",
        ERROR_MESSAGES.FESTIVAL_NOT_FOUND,
      );
    }

    const studentData = await db.query.student.findFirst({
      where: (s: any, { eq, and }: any) =>
        and(
          eq(s.festivalId, festival.id),
          eq(s.profileSlug, input.studentSlug),
        ),
    });

    if (!studentData) {
      throw new AppError(ERROR_MESSAGES.STUDENT_NOT_FOUND);
    }

    if (!studentData.profileSlug) {
      throw new AppError("Student has no profile slug assigned.");
    }

    if (!studentData.isTeamLeader) {
      throw new AppError("Not a team leader.");
    }

    const now = new Date().toISOString();
    const latestOtp = await db.query.participantOtp.findFirst({
      where: (otp: any, { eq, and, isNull, gt }: any) =>
        and(
          eq(otp.studentId, studentData.id),
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
      studentId: studentData.id,
      festivalId: festival.id,
      tokenHash,
      expiresAt: expiresAt.toISOString(),
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    return { rawToken, expiresAt, studentSlug: input.studentSlug, isTeamLeader: Boolean(studentData.isTeamLeader) };
  },

  async revokeSessionByRawToken(rawToken: string): Promise<void> {
    const tokenHash = getTokenHash(rawToken);
    await db
      .update(participantSession)
      .set({ revokedAt: new Date().toISOString() })
      .where(
        and(
          eq(participantSession.tokenHash, tokenHash),
          isNull(participantSession.revokedAt),
        ),
      );
  },
};
