import { createCronHandler, ok } from "@/api/lib";
import { deleteExpiredExports } from "@/features/exports/repositories/export.repository";
import { FestivalExpirationService } from "@/features/festivals/services/festival-expiration.service";

const handler = createCronHandler({
  async GET() {
    // Notification cycle first — needs to run before expiry cycle to emit
    // EXPIRATION_WARNING before the festival row is flipped to EXPIRED.
    const notifications =
      await FestivalExpirationService.runNotificationsCycle();
    const preArchival = await FestivalExpirationService.runPreArchivalCycle();
    const expiration = await FestivalExpirationService.runExpirationCycle();
    const expiringSoon =
      await FestivalExpirationService.runFestivalExpiringSoonEmails();
    const exportsDeleted = await deleteExpiredExports();
    return ok({
      success: true,
      notifications: {
        processed: notifications.processed,
        warned: notifications.warned,
        skipped: notifications.skipped,
      },
      preArchived: preArchival.processed,
      expired: expiration.processed,
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
