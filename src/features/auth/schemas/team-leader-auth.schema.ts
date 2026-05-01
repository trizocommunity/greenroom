import { z } from "zod";

export const requestTeamLeaderOtpSchema = z.object({
  festivalSlug: z.string().min(1),
  studentSlug: z.string().min(1),
});

export const verifyTeamLeaderOtpSchema = z.object({
  festivalSlug: z.string().min(1),
  studentSlug: z.string().min(1),
  otp: z.string().regex(/^\d{6}$/, "OTP must be a 6-digit code"),
});
