import "server-only";

import { eq } from "drizzle-orm";
import { createFestivalInput } from "@/api/contracts/festivals";
import { badRequest, createProtectedHandler, ok } from "@/api/lib";
import { festival as festivalsTable } from "@/core/database/schema";
import {
  createFestival,
  findAllFestivals,
} from "@/features/festivals/repositories/festival.repository";

const handler = createProtectedHandler({
  async GET({ user }) {
    const where =
      user!.role === "SUPER_ADMIN"
        ? undefined
        : eq(festivalsTable.ownerId, user!.userId);

    const festivals = await findAllFestivals(where);
    return ok(festivals, "public, max-age=60, stale-while-revalidate=300");
  },

  async POST({ user, request }) {
    const body = await request.json();
    const parsed = createFestivalInput.safeParse(body.data ?? body);

    if (!parsed.success) {
      return badRequest("INVALID_INPUT", parsed.error.message);
    }

    const { institutionType, ...rest } = parsed.data;
    const festival = await createFestival({
      ...rest,
      institutionType: institutionType as
        | (typeof festivalsTable.institutionType.enumValues)[number]
        | undefined,
      ownerId: user!.userId,
    });

    return ok(festival);
  },
});

export const GET = handler;
export const POST = handler;
