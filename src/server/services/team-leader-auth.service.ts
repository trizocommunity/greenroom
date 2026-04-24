import crypto from "crypto";
import { db } from "@/lib/db";
import { 
  teamLeaderOtp as otpTable, 
  teamLeaderSession as sessionTable 
} from "@/server/db/schema";
import { eq, and, isNull, gt, gte, desc, sql } from "drizzle-orm";
import { sendTeamLeaderOtpEmail } from "@/lib/email";
import { AppError, ERROR_MESSAGES } from "@/lib/errors";
import {
  createRawSessionToken,
  getSessionExpiryDate,
  getTokenHash,
} from "@/lib/team-leader-auth/session";
import { findFestivalBySlug } from "@/server/models/festival.model";
import { findStudentByFestivalAndProfileSlug } from "@/server/models/student.model";
import { randomUUID } from "crypto";

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

    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const result = await db.query.teamLeaderOtp.findMany({
      where: and(
        eq(otpTable.studentId, student.id),
        gte(otpTable.createdAt, since)
      ),
      columns: { id: true },
    });
    
    if (result.length >= OTP_MAX_REQUESTS_PER_10_MIN) {
      throw new AppError(
        "Too many OTP requests. Please try again in 10 minutes.",
      );
    }

    const otpCode = generateOtpCode();
    const now = new Date().toISOString();
    await db.insert(otpTable).values({
      id: randomUUID(),
      studentId: student.id,
      codeHash: hashOtp(otpCode),
      expiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString(),
      updatedAt: now,
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

    const nowStr = new Date().toISOString();
    const otpRecord = await db.query.teamLeaderOtp.findFirst({
      where: and(
        eq(otpTable.studentId, student.id),
        isNull(otpTable.consumedAt),
        gt(otpTable.expiresAt, nowStr)
      ),
      orderBy: [desc(otpTable.createdAt)],
    });
    
    if (!otpRecord) {
      throw new AppError("OTP is invalid or expired.");
    }

    if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
      throw new AppError("Too many invalid OTP attempts. Request a new OTP.");
    }

    const ok = hashOtp(input.otp) === otpRecord.codeHash;
    if (!ok) {
      await db.update(otpTable).set({ 
        attempts: sql`${otpTable.attempts} + 1`,
        updatedAt: nowStr,
      }).where(eq(otpTable.id, otpRecord.id));
      throw new AppError("OTP is invalid.");
    }

    await db.update(otpTable).set({ 
      consumedAt: nowStr,
      updatedAt: nowStr,
    }).where(eq(otpTable.id, otpRecord.id));

    const rawToken = createRawSessionToken();
    const expiresAt = getSessionExpiryDate();
    const tokenHash = getTokenHash(rawToken);
    
    await db.insert(sessionTable).values({
      id: randomUUID(),
      studentId: student.id,
      festivalId: festival.id,
      tokenHash,
      expiresAt: expiresAt.toISOString(),
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      updatedAt: nowStr,
    });

    return { rawToken, expiresAt };
  },

  async revokeSessionByRawToken(rawToken: string) {
    const nowStr = new Date().toISOString();
    await db.update(sessionTable).set({ 
      revokedAt: nowStr,
      updatedAt: nowStr,
    }).where(and(
      eq(sessionTable.tokenHash, getTokenHash(rawToken)),
      isNull(sessionTable.revokedAt)
    ));
  },
};
