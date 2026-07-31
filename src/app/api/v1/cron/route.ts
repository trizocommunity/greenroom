import { createCronHandler, ok } from "@/api/lib";
import { FestivalExpirationService } from "@/features/festivals/services/festival-expiration.service";

const handler = createCronHandler({
  async GET() {
    const preArchival = await FestivalExpirationService.runPreArchivalCycle();
    const expiration = await FestivalExpirationService.runExpirationCycle();
    const expiringSoon =
      await FestivalExpirationService.runFestivalExpiringSoonEmails();
    return ok({
      success: true,
      preArchived: preArchival.processed,
      expired: expiration.processed,
      expiringSoonEmails: {
        processed: expiringSoon.processed,
        sent: expiringSoon.sent,
        skipped: expiringSoon.skipped,
      },
    });
  },
});

export const GET = handler;
