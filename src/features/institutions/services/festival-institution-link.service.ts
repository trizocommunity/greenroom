import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  festival as festivalTable,
  user as userTable,
} from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";

/**
 * The single rule that links a festival to the institution branding it:
 * a festival belongs to its **owner's** institution.
 *
 * Three call sites need it and must not drift apart:
 *   1. festival creation  — link at insert time (`resolveInstitutionIdForOwner`)
 *   2. personal → institutional upgrade — link what the owner already has
 *   3. migration 0049     — the same statement, applied retroactively
 *
 * Why it matters: `festival.institutionId` is what resolves a branded host to a
 * festival (`findFestivalBySlugForPublic`) and what gates the custom-domain UI
 * and API. A NULL here makes a PRO institutional festival look non-institutional
 * everywhere — the domain section never renders and the save endpoint 403s.
 *
 * Membership is deliberately not consulted: an admin added to someone else's
 * festival must not drag it under their own institution.
 */

/** The institution a new festival by this owner should belong to, if any. */
export async function resolveInstitutionIdForOwner(
  ownerId: string,
  tx: Pick<typeof db, "query"> = db,
): Promise<string | null> {
  const owner = await tx.query.user.findFirst({
    where: eq(userTable.id, ownerId),
    columns: { institutionId: true },
  });

  return owner?.institutionId ?? null;
}

/**
 * Link every festival this owner has that is not already linked.
 *
 * Scoped by `institutionId IS NULL` so it is idempotent and never re-homes a
 * festival that already belongs somewhere. Expired festivals are included
 * deliberately: they are not served publicly, and leaving them NULL would
 * recreate the half-linked rows this exists to eliminate.
 *
 * Returns the number of rows linked, for logging at the call site.
 */
export async function linkOwnedFestivalsToInstitution(
  opts: {
    ownerId: string;
    institutionId: string;
  },
  tx: Pick<typeof db, "update"> = db,
): Promise<number> {
  const linked = await tx
    .update(festivalTable)
    .set({
      institutionId: opts.institutionId,
      updatedAt: serverNowIso(),
    })
    .where(
      and(
        eq(festivalTable.ownerId, opts.ownerId),
        isNull(festivalTable.institutionId),
      ),
    )
    .returning({ id: festivalTable.id });

  return linked.length;
}
