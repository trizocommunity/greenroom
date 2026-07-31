import { createCronHandler, ok } from "@/api/lib";
import { FestivalExpirationService } from "@/features/festivals/services/festival-expiration.service";

const handler = createCronHandler({
  async GET() {
    const preArchival = await FestivalExpirationService.runPreArchivalCycle();
    const expiration = await FestivalExpirationService.runExpirationCycle();
    return ok({
      success: true,
      preArchived: preArchival.processed,
      expired: expiration.processed,
    });
  },
});

export const GET = handler;
