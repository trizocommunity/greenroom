/**
 * Public types for the Greenroom branded email layer.
 *
 * `EmailKind` is a discriminated union over every email kind the app can
 * send. The list is intentionally short — Tier 1 (auth-critical) plus
 * `festival_expiring_soon`. The super-admin email-settings page controls
 * the global on/off toggle per kind (see
 * `email-preferences.service.ts`).
 */

export type EmailTheme = "dark" | "light";

export type EmailContext = {
  recipientName?: string;
  festivalName?: string;
  programmeName?: string;
};

export type EmailKind =
  | {
      kind: "magic_link";
      token: string;
      expiresInMinutes?: number;
      callbackURL?: string;
    }
  | {
      kind: "festival_invitation";
      token: string;
      festivalName: string;
      role: string;
      expiresInHours?: number;
    }
  | {
      kind: "team_leader_otp";
      otp: string;
      festivalName: string;
      expiresInMinutes?: number;
    }
  | {
      kind: "two_factor_otp";
      otp: string;
      email: string;
      expiresInMinutes?: number;
    }
  | {
      kind: "festival_expiring_soon";
      festivalName: string;
      daysRemaining: number;
      expiresOn: string;
      dashboardUrl: string;
    };

export type SendEmailOpts = {
  to: string | string[];
  kind: EmailKind;
  context?: EmailContext;
  theme?: EmailTheme;
};

export type SendEmailResult =
  | { id: string }
  | { id: string; kindDisabled: true }
  | { error: { message: string; statusCode?: number } };

/**
 * Every EmailKind discriminant, used by the admin settings page to render
 * one toggle per kind and by the send path to look up its current setting.
 */
export const EMAIL_KINDS = [
  "magic_link",
  "festival_invitation",
  "team_leader_otp",
  "two_factor_otp",
  "festival_expiring_soon",
] as const;

export type EmailKindName = (typeof EMAIL_KINDS)[number];

/**
 * Human-readable label + short description for each kind. Surfaced in the
 * super-admin email-settings page and used in the `notification-mapping`
 * layer when richer info is needed.
 */
export const EMAIL_KIND_META: Record<
  EmailKindName,
  { label: string; description: string }
> = {
  magic_link: {
    label: "Magic-link sign-in",
    description: "One-time sign-in link sent when a user requests email login.",
  },
  festival_invitation: {
    label: "Festival invitation",
    description: "Invite email sent when a member is added to a festival team.",
  },
  team_leader_otp: {
    label: "Team-leader OTP",
    description:
      "One-time code sent to a team leader signing in to the stage portal.",
  },
  two_factor_otp: {
    label: "Two-factor verification code",
    description:
      "One-time code sent to a user with 2FA enabled after they pass the first sign-in factor.",
  },
  festival_expiring_soon: {
    label: "Festival expiring soon",
    description:
      "Reminder sent to the festival owner 7 days before the 90-day window ends.",
  },
};
