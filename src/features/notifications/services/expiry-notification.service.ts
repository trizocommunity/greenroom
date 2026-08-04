/**
 * Expiry warning email — `festival_expiring_soon` kind dispatched to the
 * festival owner ~T-7 days before `expiresAt`. Idempotency is handled at the
 * caller (`runNotificationsCycle`) via the `EXPIRATION_WARNING` lifecycle
 * event row, so this function is a thin wrapper around `sendEmail`.
 */

import { sendEmail } from "@/core/integrations/email/index";

export interface ExpiryWarningEmailInput {
  to: string;
  festivalName: string;
  festivalSlug: string;
  daysRemaining: number;
  expiresAt: Date;
}

export type SendExpiryWarningResult =
  | { ok: true }
  | { ok: false; reason: "kindDisabled" | "providerError"; message?: string };

export async function sendExpiryWarningEmail(
  input: ExpiryWarningEmailInput,
): Promise<SendExpiryWarningResult> {
  const result = await sendEmail({
    to: input.to,
    kind: {
      kind: "festival_expiring_soon",
      festivalName: input.festivalName,
      daysRemaining: input.daysRemaining,
      expiresOn: input.expiresAt.toISOString().split("T")[0] ?? "",
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || ""}/dashboard/${input.festivalSlug}`,
    },
  });

  if ("kindDisabled" in result) {
    return { ok: false, reason: "kindDisabled" };
  }
  if ("error" in result) {
    return {
      ok: false,
      reason: "providerError",
      message: String(result.error),
    };
  }
  return { ok: true };
}
