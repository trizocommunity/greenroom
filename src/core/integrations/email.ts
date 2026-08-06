/**
 * Backwards-compatibility shim for non-server callers that still import
 * the helper-shaped senders (`sendInvitationEmail`, `sendTeamLeaderOtpEmail`)
 * — each is a one-line delegation to `sendEmail({ to, kind })`.
 *
 * `sendMagicLinkEmail` was removed in ISSUE-42 PR C — sign-in is now
 * handled by Better Auth's `emailOTP` plugin; the only server-side caller
 * used to live in `core/auth/better-auth/auth.ts`'s `magicLink` hook
 * (now unmounted). If a future plugin reintroduces the magic-link flow,
 * add the helper back here.
 *
 * `sendPlainFestivalEmail` was also removed earlier — no remaining callers
 * and `festival_announcement` was dropped from the `EmailKind` union.
 *
 * Errors are intentionally swallowed (returning void) to match the
 * legacy contract — callers shouldn't have to start handling a result
 * type just to migrate. The underlying `sendEmail` logs the error in
 * `send.ts` so failures are still observable.
 *
 * Delete this shim in a later PR once all callers move to `sendEmail`.
 */

import { sendEmail } from "./email/index";

export async function sendInvitationEmail(
  to: string,
  token: string,
  festivalName: string,
  role: string,
): Promise<void> {
  await sendEmail({
    to,
    kind: { kind: "festival_invitation", token, festivalName, role },
  });
}

export async function sendTeamLeaderOtpEmail(
  to: string,
  otp: string,
  festivalName: string,
): Promise<void> {
  await sendEmail({
    to,
    kind: { kind: "team_leader_otp", otp, festivalName },
  });
}

export type {
  EmailKind,
  EmailTheme,
  SendEmailOpts,
  SendEmailResult,
} from "./email/index";
