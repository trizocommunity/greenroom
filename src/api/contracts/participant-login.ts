import { z } from "zod";

export const requestAccessInput = z.object({
  festivalSlug: z.string().min(1),
  chestNumber: z.string().min(1),
  identifierKind: z.enum(["DOB", "GROUP"]),
  identifierValue: z.string().min(1),
});

export const requestAccessResponse = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("AUTHENTICATED"),
    studentSlug: z.string(),
    festivalName: z.string(),
    expiresAt: z.string(),
  }),
  z.object({
    status: z.literal("OTP_REQUIRED"),
    studentSlug: z.string(),
    festivalName: z.string(),
    debugOtp: z.string().optional(),
  }),
]);

export const verifyOtpInput = z.object({
  festivalSlug: z.string().min(1),
  studentSlug: z.string().min(1),
  otp: z.string().regex(/^\d{6}$/, "OTP must be a 6-digit code"),
});

export const verifyOtpResponse = z.object({
  success: z.literal(true),
  expiresAt: z.string(),
});

export const participantLogoutResponse = z.object({ success: z.literal(true) });

export type RequestAccessInput = z.infer<typeof requestAccessInput>;
export type RequestAccessResponse = z.infer<typeof requestAccessResponse>;
export type VerifyOtpInput = z.infer<typeof verifyOtpInput>;
export type VerifyOtpResponse = z.infer<typeof verifyOtpResponse>;
export type ParticipantLogoutResponse = z.infer<
  typeof participantLogoutResponse
>;
