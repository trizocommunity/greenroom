import { addMemberInput } from "@/api/contracts/members";
import { badRequest, createProtectedHandler, ok } from "@/api/lib";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { MemberService } from "@/features/members/services/member.service";

const handler = createProtectedHandler({
  async GET({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    if (!festivalId)
      return badRequest("MISSING_PARAM", "festivalId is required");
    await assertFestivalAccess(user, festivalId);
    const members = await MemberService.getMembers(festivalId);
    return ok(members);
  },

  async POST({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    if (!festivalId)
      return badRequest("MISSING_PARAM", "festivalId is required");
    await assertFestivalAccess(user, festivalId, { requireWritable: true });

    const body = await request.json();
    const data = body.data ?? body;
    const parsed = addMemberInput.safeParse(data);
    if (!parsed.success)
      return badRequest("INVALID_INPUT", parsed.error.message);

    const member = await MemberService.addMember(festivalId, parsed.data);
    return ok(member);
  },

  async DELETE({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    const memberId = url.searchParams.get("memberId");
    if (!festivalId)
      return badRequest("MISSING_PARAM", "festivalId is required");
    if (!memberId) return badRequest("MISSING_PARAM", "memberId is required");
    await assertFestivalAccess(user, festivalId, { requireWritable: true });

    const result = await MemberService.removeMember(festivalId, memberId);
    return ok(result);
  },
});

export const GET = handler;
export const POST = handler;
export const DELETE = handler;
