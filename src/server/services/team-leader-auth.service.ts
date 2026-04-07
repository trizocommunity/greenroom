import crypto from "crypto";
import { prisma } from "@/lib/db";
import { sendTeamLeaderOtpEmail } from "@/lib/email";
import { AppError, ERROR_MESSAGES } from "@/lib/errors";
import {
  createRawSessionToken,
  getSessionExpiryDate,
  getTokenHash,
} from "@/lib/team-leader-auth/session";
import { findFestivalBySlug } from "@/server/models/festival.model";
import { findStudentByFestivalAndProfileSlug } from "@/server/models/student.model";

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_REQUESTS_PER_10_MIN = 5;

async function resolveFestivalAndStudent(
  festivalSlug: string,
  studentSlug: string,
) {
  const festival = await findFestivalBySlug(festivalSlug);
  if (!festival) throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);

  const student = await findStudentByFestivalAndProfileSlug(
    festival.id,
    studentSlug,
  );

  if (!student) throw new AppError(ERROR_MESSAGES.STUDENT_NOT_FOUND);
  if (!student.isTeamLeader) throw new AppError(ERROR_MESSAGES.FORBIDDEN);

  return { festival, student };
}

function hashOtp(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function generateOtpCode(): string {
  const n = crypto.randomInt(100000, 1000000);
  return String(n);
}

export const TeamLeaderAuthService = {
  async requestOtp(input: { festivalSlug: string; studentSlug: string }) {
    const { festival, student } = await resolveFestivalAndStudent(
      input.festivalSlug,
      input.studentSlug,
    );

    const hasEmail = Boolean(student.email && student.email.trim().length > 0);
    if (!hasEmail) {
      throw new AppError(
        "Team leader must have a valid email address to receive OTP.",
      );
    }

    const since = new Date(Date.now() - 10 * 60 * 1000);
    const recentCount = await prisma.teamLeaderOtp.count({
      where: {
        studentId: student.id,
        createdAt: { gte: since },
      },
    });
    if (recentCount >= OTP_MAX_REQUESTS_PER_10_MIN) {
      throw new AppError(
        "Too many OTP requests. Please try again in 10 minutes.",
      );
    }

    const otpCode = generateOtpCode();
    await prisma.teamLeaderOtp.create({
      data: {
        studentId: student.id,
        codeHash: hashOtp(otpCode),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });

    await sendTeamLeaderOtpEmail(String(student.email), otpCode, festival.name);
    return {
      success: true,
      debugOtp: process.env.NODE_ENV === "production" ? undefined : otpCode,
    };
  },

  async verifyOtp(input: {
    festivalSlug: string;
    studentSlug: string;
    otp: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    const { festival, student } = await resolveFestivalAndStudent(
      input.festivalSlug,
      input.studentSlug,
    );

    const otpRecord = await prisma.teamLeaderOtp.findFirst({
      where: {
        studentId: student.id,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!otpRecord) {
      throw new AppError("OTP is invalid or expired.");
    }

    if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
      throw new AppError("Too many invalid OTP attempts. Request a new OTP.");
    }

    const ok = hashOtp(input.otp) === otpRecord.codeHash;
    if (!ok) {
      await prisma.teamLeaderOtp.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      throw new AppError("OTP is invalid.");
    }

    await prisma.teamLeaderOtp.update({
      where: { id: otpRecord.id },
      data: { consumedAt: new Date() },
    });

    const rawToken = createRawSessionToken();
    const expiresAt = getSessionExpiryDate();
    const tokenHash = getTokenHash(rawToken);
    await prisma.teamLeaderSession.create({
      data: {
        studentId: student.id,
        festivalId: festival.id,
        tokenHash,
        expiresAt,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });

    return { rawToken, expiresAt };
  },

  async revokeSessionByRawToken(rawToken: string) {
    await prisma.teamLeaderSession.updateMany({
      where: {
        tokenHash: getTokenHash(rawToken),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  },
};
