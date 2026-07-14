import { z } from "zod";

export const requestOtpInput = z.object({
  festivalSlug: z.string().min(1),
  studentSlug: z.string().min(1),
});

export const verifyOtpInput = z.object({
  festivalSlug: z.string().min(1),
  studentSlug: z.string().min(1),
  otp: z.string().regex(/^\d{6}$/, "OTP must be a 6-digit code"),
});

export const requestOtpResponse = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

export const verifyOtpResponse = z.object({ success: z.literal(true) });

export const teamLeaderLogoutResponse = z.object({ success: z.literal(true) });

export type RequestOtpInput = z.infer<typeof requestOtpInput>;
export type VerifyOtpInput = z.infer<typeof verifyOtpInput>;
export type RequestOtpResponse = z.infer<typeof requestOtpResponse>;
export type VerifyOtpResponse = z.infer<typeof verifyOtpResponse>;
export type TeamLeaderLogoutResponse = z.infer<typeof teamLeaderLogoutResponse>;
