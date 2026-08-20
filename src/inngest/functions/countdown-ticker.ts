import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/core/database/client";
import { festival as festivalTable } from "@/core/database/schema";
import { MS, msUntil } from "@/core/datetime";
import { serverNowIso } from "@/core/datetime/server";
import { publish } from "@/core/pubsub/redis-pubsub";
import { keys } from "@/core/redis/keys";
import { inngest } from "@/inngest/client";

/**
 * Live festival countdown ticker (UC16). The daily cron walks every
 * festival whose public surface is enabled and publishes a snapshot:
 * `{ daysToStart, daysToEnd, daysToExpire, tickedAt }` to the channel
 * `greenroom:festival:{festivalId}:countdown`. The SSE route at
 * `/api/v1/festivals/[festivalId]/countdown/stream` forwards each tick
 * to subscribed clients.
 *
 * Cadence: daily at 00:00 UTC (`0 0 * * *`). The Issue 46 spec called for
 * 1s in the final hour and 60s otherwise, but the public landing only
 * surfaces standings on publish and the day-count numbers do not need
 * sub-day resolution, so the function runs once per day. Inngest also
 * lets you pause this from the dashboard without code changes.
 */
export const countdownTicker = inngest.createFunction(
  {
    id: "countdown-ticker",
    name: "Festival countdown ticker (per-minute)",
    triggers: [{ cron: "0 0 * * *" }],
  },
  async ({ step }) => {
    const festivals = await step.run("load-public-festivals", async () =>
      db
        .select({
          id: festivalTable.id,
          startDate: festivalTable.startDate,
          endDate: festivalTable.endDate,
          expiresAt: festivalTable.expiresAt,
        })
        .from(festivalTable)
        .where(
          and(
            eq(festivalTable.publicSiteEnabled, true),
            isNotNull(festivalTable.startDate),
          ),
        ),
    );

    const tickedAt = serverNowIso();

    const published = await Promise.all(
      festivals.map((festival) =>
        publish(keys.festivalCountdown(festival.id), {
          daysToStart: Math.floor(msUntil(festival.startDate) / MS.day),
          daysToEnd: Math.floor(msUntil(festival.endDate) / MS.day),
          daysToExpire: Math.floor(msUntil(festival.expiresAt) / MS.day),
          tickedAt,
        }),
      ),
    );

    return {
      festivals: festivals.length,
      published,
    };
  },
);
