import { createProgrammeInput } from "@/api/contracts/programmes";
import { badRequest, createProtectedHandler, ok } from "@/api/lib";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { ProgrammeService } from "@/features/programmes/services/programme.service";

const handler = createProtectedHandler({
  async GET({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    if (!festivalId)
      return badRequest("MISSING_PARAM", "festivalId is required");
    await assertFestivalAccess(user, festivalId);
    const categoryId = url.searchParams.get("categoryId") ?? undefined;
    const data = await ProgrammeService.getAll(festivalId, categoryId);
    return ok(data, "public, max-age=60, stale-while-revalidate=300");
  },

  async POST({ user, request }) {
    const body = await request.json();
    const data = body.data ?? body;
    const parsed = createProgrammeInput.safeParse(data);
    if (!parsed.success)
      return badRequest("INVALID_INPUT", parsed.error.message);
    const festivalId = body.festivalId;
    if (!festivalId)
      return badRequest("MISSING_PARAM", "festivalId is required");
    await assertFestivalAccess(user, festivalId);
    const result = await ProgrammeService.create(festivalId, parsed.data);
    return ok(result);
  },
});

export { handler as GET, handler as POST };
