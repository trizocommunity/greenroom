import { render } from "@react-email/render";
import type { ReactElement } from "react";
import { FestivalExpiringSoonEmail } from "./kinds/festival-expiring-soon";
import {
  FestivalInvitationEmail,
  festivalInvitationSubject,
} from "./kinds/festival-invitation";
import { MagicLinkEmail } from "./kinds/magic-link";
import {
  TeamLeaderOtpEmail,
  teamLeaderOtpSubject,
} from "./kinds/team-leader-otp";
import type { EmailKind, EmailTheme } from "./types";

/**
 * Resolved render payload — the string triples a kind produces before
 * being handed to Resend (or the dev-fallback logger).
 */
export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

const DEFAULT_MAGIC_LINK_EXPIRY_MINUTES = 30;
const DEFAULT_INVITATION_EXPIRY_HOURS = 48;
const DEFAULT_OTP_EXPIRY_MINUTES = 10;

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://greenroomm.vercel.app"
    : "http://localhost:3000");

function magicLinkUrl(token: string) {
  return `${BASE_URL}/login/verify/${token}`;
}

function inviteUrl(token: string) {
  return `${BASE_URL}/invite/${token}`;
}

export function resolveTheme(
  kind: EmailKind,
  override?: EmailTheme,
): EmailTheme {
  if (override) return override;
  switch (kind.kind) {
    case "festival_invitation":
      return "light";
    case "magic_link":
    case "team_leader_otp":
    case "festival_expiring_soon":
      return "dark";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

/**
 * Render an `EmailKind` (plus an optional theme override) into the
 * `subject`/`html`/`text` triple the sender needs. Pure function — no
 * network, no env reads beyond the public app URL, safe to call in tests.
 */
export async function renderEmail(
  kind: EmailKind,
  theme?: EmailTheme,
): Promise<RenderedEmail> {
  const effectiveTheme = resolveTheme(kind, theme);
  let element: ReactElement;
  let subject: string;

  switch (kind.kind) {
    case "magic_link": {
      element = (
        <MagicLinkEmail
          url={magicLinkUrl(kind.token)}
          expiresInMinutes={
            kind.expiresInMinutes ?? DEFAULT_MAGIC_LINK_EXPIRY_MINUTES
          }
          theme={effectiveTheme}
        />
      );
      subject = "[Greenroom] Your sign-in link";
      break;
    }
    case "festival_invitation": {
      element = (
        <FestivalInvitationEmail
          url={inviteUrl(kind.token)}
          festivalName={kind.festivalName}
          role={kind.role}
          expiresInHours={
            kind.expiresInHours ?? DEFAULT_INVITATION_EXPIRY_HOURS
          }
          theme={effectiveTheme}
        />
      );
      subject = festivalInvitationSubject(kind.festivalName);
      break;
    }
    case "team_leader_otp": {
      element = (
        <TeamLeaderOtpEmail
          otp={kind.otp}
          festivalName={kind.festivalName}
          expiresInMinutes={kind.expiresInMinutes ?? DEFAULT_OTP_EXPIRY_MINUTES}
          theme={effectiveTheme}
        />
      );
      subject = teamLeaderOtpSubject(kind.festivalName);
      break;
    }
    case "festival_expiring_soon": {
      element = (
        <FestivalExpiringSoonEmail
          festivalName={kind.festivalName}
          daysRemaining={kind.daysRemaining}
          expiresOn={kind.expiresOn}
          dashboardUrl={kind.dashboardUrl}
          theme={effectiveTheme}
        />
      );
      subject = `[Greenroom] ${kind.festivalName} expires in ${kind.daysRemaining} day${kind.daysRemaining === 1 ? "" : "s"}`;
      break;
    }
    default: {
      const _exhaustive: never = kind;
      throw new Error(`Unhandled email kind: ${JSON.stringify(_exhaustive)}`);
    }
  }

  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ]);

  return { subject, html, text };
}
