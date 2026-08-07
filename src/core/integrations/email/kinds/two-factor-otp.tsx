import { Heading, Text } from "@react-email/components";
import { EmailFooter } from "../components/Footer";
import { BrandedLayout } from "../components/Layout";
import { EmailWordmark } from "../components/Wordmark";
import type { EmailTheme } from "../tokens";

const SUBJECT = () => "[Greenroom] Your sign-in verification code";

export interface TwoFactorOTPProps {
  otp: string;
  email: string;
  expiresInMinutes?: number;
  theme?: EmailTheme;
}

/**
 * Two-factor email OTP (PR 4 of ISSUE-41).
 *
 * Sent when a user with 2FA enabled completes the first factor
 * (magic link / Google) and Better Auth's `twoFactor` plugin generates
 * an email-OTP fallback. The OTP is short-lived (5 minutes by default
 * — see `otpOptions.period` in `core/auth/better-auth/auth.ts`).
 */
export function TwoFactorOTPEmail({
  otp,
  email,
  expiresInMinutes = 5,
  theme = "dark",
}: TwoFactorOTPProps) {
  return (
    <BrandedLayout
      theme={theme}
      preview={`Your Greenroom sign-in verification code — expires in ${expiresInMinutes} minutes`}
    >
      <EmailWordmark />
      <Heading className="m-0 mb-2 font-sans font-bold text-24 text-fg">
        Verify it&apos;s you
      </Heading>
      <Text className="m-0 mb-6 font-sans text-15 text-fg-2">
        We need a one-time code to finish signing you in to{" "}
        <span className="text-fg font-semibold">{email}</span>. Enter it on the
        verification page to continue. It expires in{" "}
        <span className="text-fg font-semibold">
          {expiresInMinutes} minutes
        </span>
        .
      </Text>
      <Text className="bg-brand text-fg-inverted rounded-md px-4 py-2.5 font-sans font-bold text-20 tracking-[0.25em] inline-block">
        {otp}
      </Text>
      <EmailFooter note="If you didn't request this code, you can ignore this email — your account is still secure." />
    </BrandedLayout>
  );
}

export const twoFactorOTPSubject = SUBJECT;
