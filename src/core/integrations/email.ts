/**
 * Backwards-compatibility shim.
 *
 * The old `email.ts` exported four hand-rolled HTML senders. The new
 * `src/core/integrations/email/` module exports a single typed
 * `sendEmail({ to, kind })` API. This file re-exports the three
 * function signatures that still have callers; each one is a one-line
 * delegation to `sendEmail`.
 *
 * `sendPlainFestivalEmail` was removed — there were no remaining callers,
 * and `festival_announcement` is no longer in the public `EmailKind`
 * union (see `core/integrations/email/types.ts`). If a generic
 * announcement kind is reintroduced later, add it back here.
 *
 * Errors are intentionally swallowed (returning void) to match the
 * legacy contract — callers shouldn't have to start handling a result
 * type just to migrate. The underlying `sendEmail` logs the error in
 * `send.ts` so failures are still observable.
 *
 * Delete this shim in a later PR once all callers move to `sendEmail`.
 */

import { sendEmail } from "./email/index";

export async function sendMagicLinkEmail(
  to: string,
  token: string,
): Promise<void> {
  await sendEmail({
    to,
    kind: { kind: "magic_link", token },
  });
}

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
