import "server-only";

import { createProtectedHandler, ok } from "@/api/lib";
import { findFestivalByOwnerId } from "@/features/festivals/repositories/festival.repository";

const handler = createProtectedHandler({
  async GET({ user }) {
    const festival = await findFestivalByOwnerId(user!.userId);
    return ok({ festival });
  },
});

export const GET = handler;
