import { createCronHandler, ok } from "@/api/lib";
import { deleteExpiredExports } from "@/features/exports/repositories/export.repository";
import { FestivalExpiryNotifier } from "@/features/festivals/services/festival-expiry-notifier.service";

const handler = createCronHandler({
  async GET() {
    const notifications = await FestivalExpiryNotifier.runNotificationsCycle();
    const expiringSoon =
      await FestivalExpiryNotifier.runFestivalExpiringSoonEmails();
    const exportsDeleted = await deleteExpiredExports();
    return ok({
      success: true,
      notifications: {
        processed: notifications.processed,
        warned: notifications.warned,
        skipped: notifications.skipped,
      },
      expiringSoonEmails: {
        processed: expiringSoon.processed,
        sent: expiringSoon.sent,
        skipped: expiringSoon.skipped,
      },
      exportsDeleted,
    });
  },
});

export const GET = handler;
