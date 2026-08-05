import { createCategoryInput } from "@/api/contracts/categories";
import { badRequest, createProtectedHandler, ok } from "@/api/lib";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { CategoryService } from "@/features/categories/services/category.service";

const handler = createProtectedHandler({
  async GET({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    if (!festivalId)
      return badRequest("MISSING_PARAM", "festivalId is required");
    await assertFestivalAccess(user, festivalId);
    const data = await CategoryService.getAll(festivalId);
    return ok(data);
  },

  async POST({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    if (!festivalId)
      return badRequest("MISSING_PARAM", "festivalId is required");
    await assertFestivalAccess(user, festivalId);
    const body = await request.json();
    const data = body.data ?? body;
    const parsed = createCategoryInput.safeParse(data);
    if (!parsed.success)
      return badRequest("INVALID_INPUT", parsed.error.message);
    const result = await CategoryService.create(festivalId, parsed.data);
    try { const { revalidatePath } = await import("next/cache"); revalidatePath("/", "layout"); } catch(e){}
    return ok(result);
  },
});

export const GET = handler;
export const POST = handler;
