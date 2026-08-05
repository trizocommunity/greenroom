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
    const errors: Array<{ name: string; error: string }> = [];
    for (const p of parsed.data.participants) {
      try {
        const c = await ParticipantService.create(festivalId, {
          name: p.name,
          groupId: p.groupId,
          categoryId: p.categoryId,
          gender: p.gender,
          dateOfBirth: today,
        });
        created.push(c);
      } catch (e) {
        errors.push({ name: p.name, error: e instanceof Error ? e.message : String(e) });
      }
    }

    const { db } = await import("@/core/database/client");
    const { festival: festivalTable } = await import("@/core/database/schema");
    const { eq } = await import("drizzle-orm");
    const festival = await db.query.festival.findFirst({
      where: eq(festivalTable.id, festivalId),
      columns: { slug: true },
    });
    if (festival) {
      try {
        const { revalidatePath } = await import("next/cache");
        revalidatePath(`/dashboard/${festival.slug}/pre-event-works/participants`);
      } catch (error) {
        console.error("[revalidatePath] participants page", error);
      }
    }

    return ok({ created, errors });
  },
});

export { handler as POST };
