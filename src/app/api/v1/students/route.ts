import { createStudentInput } from "@/api/contracts/students";
import { badRequest, createProtectedHandler, ok } from "@/api/lib";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { StudentService } from "@/features/students/services/student.service";

const handler = createProtectedHandler({
  async GET({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    if (!festivalId)
      return badRequest("MISSING_PARAM", "festivalId is required");
    await assertFestivalAccess(user, festivalId);
    const data = await StudentService.getAll(festivalId);
    return ok(data, "public, max-age=30, stale-while-revalidate=60");
  },

  async POST({ user, request }) {
    const body = await request.json();
    const data = body.data ?? body;
    const parsed = createStudentInput.safeParse(data);
    if (!parsed.success)
      return badRequest("INVALID_INPUT", parsed.error.message);
    const festivalId = body.festivalId;
    if (!festivalId)
      return badRequest("MISSING_PARAM", "festivalId is required");
    await assertFestivalAccess(user, festivalId);
    const result = await StudentService.create(festivalId, parsed.data);
    return ok(result);
  },
});

export { handler as GET, handler as POST };
