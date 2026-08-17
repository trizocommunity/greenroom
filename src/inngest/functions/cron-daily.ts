import { deleteExpiredExports } from "@/features/exports/repositories/export.repository";
import { FestivalExpiryNotifier } from "@/features/festivals/services/festival-expiry-notifier.service";
import { inngest } from "@/inngest/client";

/**
 * Daily cron (UC10). Replaces the Vercel cron at `/api/v1/cron` with an
 * Inngest scheduled function. Runs at 00:00 UTC every day.
 *
 * Step breakdown mirrors the previous Vercel cron:
 *   - expiry-warnings: notify festivals expiring in N days
 *   - archive-past: transition PAST festivals to EXPIRED after grace period
 *   - export-gc: delete expired `festivalExport` rows
 *
 * The route handler at `/api/v1/cron` is retained as a manual trigger
 * for ops debugging.
 */
export const cronDaily = inngest.createFunction(
  {
    id: "cron-daily",
    name: "Daily cron (expiry warnings + archival + export GC)",
    triggers: [{ cron: "0 0 * * *" }],
  },
  async ({ step }) => {
    const [notifications, expiringSoon, exportsDeleted] = await Promise.all([
      step.run("expiry-warnings", () =>
        FestivalExpiryNotifier.runNotificationsCycle(),
      ),
      step.run("expiring-soon-emails", () =>
        FestivalExpiryNotifier.runFestivalExpiringSoonEmails(),
      ),
      step.run("export-gc", () => deleteExpiredExports()),
    ]);

    return {
      notifications: {
        processed: notifications.processed,
        warned: notifications.warned,
        skipped: notifications.skipped,
      },
      expiringSoon: {
        processed: expiringSoon.processed,
        sent: expiringSoon.sent,
        skipped: expiringSoon.skipped,
      },
      exportsDeleted,
    };
  },
);
