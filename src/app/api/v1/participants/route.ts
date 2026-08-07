import { paginationSchema, sortingSchema } from "@/api/contracts/_shared";
import { createParticipantInput } from "@/api/contracts/participants";
import { badRequest, createProtectedHandler, ok } from "@/api/lib";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { db } from "@/core/database/client";
import { participant as participantTable } from "@/core/database/schema";
import { assignChestNumberForNewParticipant } from "@/features/participants/actions/chest-number.actions";
import { ParticipantService } from "@/features/participants/services/participant.service";

const handler = createProtectedHandler({
  async GET({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    if (!festivalId)
      return badRequest("MISSING_PARAM", "festivalId is required");
    await assertFestivalAccess(user, festivalId);

    const pageParam = url.searchParams.get("page");
    if (pageParam) {
      const { page, pageSize } = paginationSchema.parse({
        page: pageParam,
        pageSize: url.searchParams.get("pageSize") ?? undefined,
      });

      const { sort, order } = sortingSchema.parse({
        sort: url.searchParams.get("sort") ?? undefined,
        order: url.searchParams.get("order") ?? undefined,
      });

      const result = await ParticipantService.getAllPaginated(festivalId, {
        page,
        pageSize,
        sort,
        order,
        groupId: url.searchParams.get("groupId") ?? undefined,
        categoryId: url.searchParams.get("categoryId") ?? undefined,
        search: url.searchParams.get("search") ?? undefined,
        isTeamLeader: url.searchParams.has("isTeamLeader")
          ? url.searchParams.get("isTeamLeader") === "true"
          : undefined,
      });
      return ok(result);
    }

    const data = await ParticipantService.getAll(festivalId);
    return ok(data);
  },

  async POST({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    if (!festivalId)
      return badRequest("MISSING_PARAM", "festivalId is required");
    const body = await request.json();
    const data = body.data ?? body;
    const parsed = createParticipantInput.safeParse(data);
    if (!parsed.success)
      return badRequest("INVALID_INPUT", parsed.error.message);
    await assertFestivalAccess(user, festivalId);
    const result = await ParticipantService.create(festivalId, parsed.data);
    await assignChestNumberForNewParticipant(festivalId, result.id);
    const updated = await db.query.participant.findFirst({
      where: (s, { eq }) => eq(s.id, result.id),
      with: { category: true, group: true },
    });
    try {
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/", "layout");
    } catch (e) {}
    return ok(updated);
  },
});

export { handler as GET, handler as POST };
