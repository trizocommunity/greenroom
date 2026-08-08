/**
 * Festival expiry notifier — warning emails and in-app banner lifecycle events.
 *
 * This module owns the T-7 notification cycle. It deliberately does NOT handle
 * archiving, destructive cleanup, or PDF rendering; those live in their own
 * services (or are out of scope for the current festivals work).
 */

import { eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  festivalLifecycleEvent,
  festival as festivals,
  user as users,
} from "@/core/database/schema";
import { parseInstant } from "@/core/datetime";
import { MS, serverNow, serverNowIso } from "@/core/datetime/server";
import { sendEmail } from "@/core/integrations/email/index";
import {
  getFestivalsApproachingExpiry,
  PRE_ARCHIVAL_DAYS,
} from "@/features/festivals/services/festival-lifecycle-policy.service";
import { sendExpiryWarningEmail } from "@/features/notifications/services/expiry-notification.service";

export const FestivalExpiryNotifier = {
  /**
   * T-7 notification cycle: idempotently emit a warning email + a lifecycle
   * event row that the in-app banner reads. Idempotency is enforced by
   * checking for an `EXPIRATION_WARNING` lifecycle event row first.
   *
   * Returns `{processed, warned, skipped}`.
   */
  async runNotificationsCycle(): Promise<{
    processed: number;
    warned: number;
    skipped: number;
  }> {
    const { randomUUID } = await import("crypto");
    const approaching = await getFestivalsApproachingExpiry(PRE_ARCHIVAL_DAYS);
    let warned = 0;
    let skipped = 0;

    for (const f of approaching) {
      try {
        const existing = await db.query.festivalLifecycleEvent.findFirst({
          where: (t, { and, eq }) =>
            and(eq(t.festivalId, f.id), eq(t.event, "EXPIRATION_WARNING")),
        });
        if (existing) {
          skipped++;
          continue;
        }

        const fresh = await db.query.festival.findFirst({
          where: eq(festivals.id, f.id),
        });
        if (!fresh || !f.expiresAt) {
          skipped++;
          continue;
        }

        const daysRemaining = Math.max(
          1,
          Math.ceil(
            (parseInstant(f.expiresAt)!.getTime() - serverNow().getTime()) /
              MS.day,
          ),
        );

        const owner = await db.query.user.findFirst({
          where: eq(users.id, fresh.ownerId),
        });

        if (owner?.email) {
          const expiresAtDate = parseInstant(f.expiresAt);
          if (expiresAtDate) {
            const emailResult = await sendExpiryWarningEmail({
              to: owner.email,
              festivalName: fresh.name,
              festivalSlug: fresh.slug ?? "",
              daysRemaining,
              expiresAt: expiresAtDate,
            });
            if (!emailResult.ok) {
              console.info(
                `[ExpirationWarning] Email not sent for festival ${f.slug} (${emailResult.reason}); still recording lifecycle event.`,
              );
            }
          }
        }

        await db.transaction(async (tx) => {
          await tx.insert(festivalLifecycleEvent).values({
            id: randomUUID(),
            festivalId: f.id,
            event: "EXPIRATION_WARNING",
            metadata: {
              daysRemaining,
              expiresAt: f.expiresAt,
              sentAt: serverNowIso(),
            },
          });
        });

        warned++;
      } catch (err) {
        console.error(
          `[ExpirationWarning] Failed for festival ${f.slug}:`,
          err,
        );
        skipped++;
      }
    }

    return { processed: approaching.length, warned, skipped };
  },

  /**
   * Send the "festival expiring soon" email to the owner of every
   * festival in the 7-day pre-archival window, once per festival.
   *
   * Idempotent — `festivalExpiringSoonEmailSentAt` is set after a
   * successful send so a cron retry (or a second cron tick in the
   * window) doesn't spam the owner.
   */
  async runFestivalExpiringSoonEmails(): Promise<{
    processed: number;
    sent: number;
    skipped: number;
  }> {
    const approaching = await getFestivalsApproachingExpiry(PRE_ARCHIVAL_DAYS);
    let sent = 0;
    let skipped = 0;

    for (const f of approaching) {
      try {
        const fresh = await db.query.festival.findFirst({
          where: eq(festivals.id, f.id),
        });
        if (!fresh || fresh.festivalExpiringSoonEmailSentAt) {
          skipped++;
          continue;
        }

        const owner = await db.query.user.findFirst({
          where: eq(users.id, fresh.ownerId),
        });
        if (!owner?.email) {
          console.warn(
            `[FestivalExpiringSoon] No owner email for festival ${f.slug}; skipping.`,
          );
          skipped++;
          continue;
        }

        if (!f.expiresAt) continue;
        const daysRemaining = Math.max(
          1,
          Math.ceil(
            (parseInstant(f.expiresAt)!.getTime() - serverNow().getTime()) /
              MS.day,
          ),
        );

        const result = await sendEmail({
          to: owner.email,
          kind: {
            kind: "festival_expiring_soon",
            festivalName: fresh.name,
            daysRemaining,
            expiresOn:
              parseInstant(f.expiresAt)!.toISOString().split("T")[0] ?? "",
            dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || ""}/dashboard/${fresh.slug}`,
          },
        });

        if ("kindDisabled" in result) {
          console.info(
            `[FestivalExpiringSoon] Kind disabled; not marking festival ${f.slug}.`,
          );
          skipped++;
          continue;
        }
        if ("error" in result) {
          console.error(
            `[FestivalExpiringSoon] Email error for festival ${f.slug}:`,
            result.error,
          );
          continue;
        }

        await db
          .update(festivals)
          .set({ festivalExpiringSoonEmailSentAt: serverNowIso() })
          .where(eq(festivals.id, f.id));

        sent++;
      } catch (err) {
        console.error(
          `[FestivalExpiringSoon] Failed for festival ${f.slug}:`,
          err,
        );
      }
    }

    return { processed: approaching.length, sent, skipped };
  },
};
