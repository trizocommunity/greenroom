import "server-only";

import { eq } from "drizzle-orm";

import { validateParticipantsInput } from "@/api/contracts/participants";
import { badRequest, createProtectedHandler, ok } from "@/api/lib";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { db } from "@/core/database/client";
import { participant as participantTable } from "@/core/database/schema";

const CONFLICT_MESSAGE =
  "A participant with this name already exists in the festival.";

const handler = createProtectedHandler({
  async POST({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    if (!festivalId)
      return badRequest("MISSING_PARAM", "festivalId is required");

    const body = await request.json();
    const data = body.data ?? body;
    const parsed = validateParticipantsInput.safeParse(data);
    if (!parsed.success)
      return badRequest("INVALID_INPUT", parsed.error.message);

    await assertFestivalAccess(user, festivalId);

    const desiredNames = new Set(
      parsed.data.candidates.map((c) => c.name.trim().toLowerCase()),
    );

    const existing = await db
      .select({ name: participantTable.name })
      .from(participantTable)
      .where(eq(participantTable.festivalId, festivalId));

    const conflicts: Record<string, string> = {};
    for (const row of existing) {
      const normalized = row.name.trim().toLowerCase();
      if (!desiredNames.has(normalized)) continue;
      conflicts[`name:${normalized}`] = CONFLICT_MESSAGE;
    }

    return ok(conflicts);
  },
});

export { handler as POST };
