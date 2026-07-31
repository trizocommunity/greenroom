import { createCronHandler, ok } from "@/api/lib";
import { deleteExpiredExports } from "@/features/exports/repositories/export.repository";
import { FestivalExpirationService } from "@/features/festivals/services/festival-expiration.service";

const handler = createCronHandler({
  async GET() {
    const preArchival = await FestivalExpirationService.runPreArchivalCycle();
    const expiration = await FestivalExpirationService.runExpirationCycle();
    const prunedExports = await deleteExpiredExports();
    return ok({
      success: true,
      preArchived: preArchival.processed,
      expired: expiration.processed,
      prunedExports,
    });
  },
});

export const GET = handler;
