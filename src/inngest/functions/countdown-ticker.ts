import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/core/database/client";
import { festival as festivalTable } from "@/core/database/schema";
import { MS, msUntil, serverNowIso } from "@/core/datetime";
import { publish } from "@/core/pubsub/redis-pubsub";
import { keys } from "@/core/redis/keys";
import { inngest } from "@/inngest/client";

/**
 * Live festival countdown ticker (UC16). The per-minute cron walks every
 * festival whose public surface is enabled and publishes a snapshot:
 * `{ daysToStart, daysToEnd, daysToExpire, tickedAt }` to the channel
 * `greenroom:festival:{festivalId}:countdown`. The SSE route at
 * `/api/v1/festivals/[festivalId]/countdown/stream` forwards each tick
 * to subscribed clients.
 *
 * Cadence: per-minute. The Issue 46 spec calls for 1s in the final hour
 * and 60s otherwise, but the per-minute cron is the implementation chosen
 * in ISSUE-47's open questions — a 1s cron on Redis Pub/Sub is wasteful,
 * and the client can interpolate the live timer from the snapshot plus
 * a fade-in `setInterval` once the channel signals the final hour.
 */
export const countdownTicker = inngest.createFunction(
  {
    id: "countdown-ticker",
    name: "Festival countdown ticker (per-minute)",
    triggers: [{ cron: "* * * * *" }],
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
