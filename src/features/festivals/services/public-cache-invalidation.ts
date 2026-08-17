import "server-only";
import { cache } from "@/core/cache/instance";
import { keys } from "@/core/redis/keys";

/**
 * Wipe every public read cache for a festival. Call after any write that
 * can change what the public site shows: settings/branding, news, media,
 * team standings, etc. The slug → profile cache lives at `keys.slugFestival`
 * and the slug → id helper lives at `keys.slugFestival:<slug>:id`.
 */
export async function invalidatePublicFestivalCaches(opts: {
  festivalId: string;
  slug: string;
}): Promise<void> {
  const { festivalId, slug } = opts;
  await Promise.all([
    cache.del(keys.slugFestival(slug)),
    cache.del(`${keys.slugFestival(slug)}:id`),
    cache.del(keys.newsList(festivalId)),
    cache.del(keys.mediaList(festivalId)),
    cache.del(keys.trialCountdown(festivalId)),
  ]);
}
