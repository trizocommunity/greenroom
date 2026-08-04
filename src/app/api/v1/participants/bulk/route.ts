import "server-only";

import { badRequest, createProtectedHandler, ok } from "@/api/lib";
import { bulkCreateParticipantInput } from "@/api/contracts/participants";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { ParticipantService } from "@/features/participants/services/participant.service";

const handler = createProtectedHandler({
  async POST({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    if (!festivalId)
      return badRequest("MISSING_PARAM", "festivalId is required");

    const body = await request.json();
    const data = body.data ?? body;
    const parsed = bulkCreateParticipantInput.safeParse(data);
    if (!parsed.success)
      return badRequest("INVALID_INPUT", parsed.error.message);

    await assertFestivalAccess(user, festivalId);

    // The bulk contract intentionally omits `dateOfBirth` to keep the
    // spreadsheet template simple. Default to today; users can fix it later
    // from the participant edit screen.
    const today = new Date().toISOString().slice(0, 10);

    const created = [];
    for (const p of parsed.data.participants) {
      created.push(
        await ParticipantService.create(festivalId, {
          name: p.name,
          groupId: p.groupId,
          categoryId: p.categoryId,
          gender: p.gender,
          dateOfBirth: today,
        }),
      );
    }

    return ok(created);
  },
});

export { handler as POST };
