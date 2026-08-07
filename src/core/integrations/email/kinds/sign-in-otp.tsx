import { Heading, Text } from "@react-email/components";
import { EmailFooter } from "../components/Footer";
import { BrandedLayout } from "../components/Layout";
import { EmailWordmark } from "../components/Wordmark";
import type { EmailTheme } from "../tokens";

const SUBJECT = () => "[Greenroom] Your sign-in code";

export interface SignInOtpProps {
  otp: string;
  email: string;
  expiresInMinutes?: number;
  theme?: EmailTheme;
}

/**
 * Sign-in email OTP (ISSUE-42 PR A).
 *
 * Sent by Better Auth's `emailOTP` plugin when a user enters their email
 * on the `/login` page. The 4-digit code is paste-friendly
 * (`autocomplete="one-time-code"` on the input); 5-minute validity matches
 * the existing `two_factor_otp` template so the two email-OTP flows share
 * a mental model.
 *
 * Distinct subject + body copy (`sign-in code` vs `verification code`) so
 * users with 2FA enabled don't confuse the two emails when they arrive
 * in quick succession.
 */
export function SignInOtpEmail({
  otp,
  email,
  expiresInMinutes = 5,
  theme = "dark",
}: SignInOtpProps) {
  return (
    <BrandedLayout
      theme={theme}
      preview={`Your Greenroom sign-in code — expires in ${expiresInMinutes} minutes`}
    >
      <EmailWordmark />
      <Heading className="m-0 mb-2 font-sans font-bold text-24 text-fg">
        Your sign-in code
      </Heading>
      <Text className="m-0 mb-6 font-sans text-15 text-fg-2">
        Enter this code on the sign-in page to continue as{" "}
        <span className="text-fg font-semibold">{email}</span>. It expires in{" "}
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

export const signInOtpSubject = SUBJECT;
