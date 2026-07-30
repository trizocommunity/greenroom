import { and, asc, eq } from "drizzle-orm";
import { saveResultInput } from "@/api/contracts/results";
import { badRequest, createProtectedHandler, ok } from "@/api/lib";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { db } from "@/core/database/client";
import { result as resultTable } from "@/core/database/schema";
import { ResultModel } from "@/features/results/repositories/result.repository";

const handler = createProtectedHandler({
  async GET({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    if (!festivalId)
      return badRequest("MISSING_PARAM", "festivalId is required");

    await assertFestivalAccess(user, festivalId);

    const programmeId = url.searchParams.get("programmeId");
    const results = programmeId
      ? await db.query.result.findMany({
          where: and(
            eq(resultTable.festivalId, festivalId),
            eq(resultTable.programmeId, programmeId),
          ),
          with: {
            programmeAssignment: {
              with: {
                participant: true,
                group: true,
              },
            },
            programme: {
              with: {
                category: true,
              },
            },
          },
          orderBy: [asc(resultTable.position)],
        })
      : await ResultModel.findByFestival(festivalId);

    return ok(results, "public, max-age=30");
  },

  async POST({ user, request }) {
    const body = await request.json();
    const data = body.data ?? body;
    const parsed = saveResultInput.safeParse(data);
    if (!parsed.success)
      return badRequest("INVALID_INPUT", parsed.error.message);

    await assertFestivalAccess(user, parsed.data.festivalId, {
      requireWritable: true,
    });

    const result = await ResultModel.upsert(parsed.data.assignmentId, {
      ...parsed.data,
    });

    return ok(result);
  },
});

export const GET = handler;
export const POST = handler;
