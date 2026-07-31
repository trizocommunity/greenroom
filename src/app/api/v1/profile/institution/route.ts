import "server-only";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { badRequest, createProtectedHandler, ok } from "@/api/lib";
import { db } from "@/core/database/client";
import { institution, user as usersTable } from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";

const updateInstitutionSchema = z.object({
  institutionName: z.string().min(2).optional(),
  institutionType: z.string().optional(),
  affiliation: z.string().optional(),
  city: z.string().optional(),
  sizeRange: z.string().optional(),
});

const handler = createProtectedHandler({
  async PUT({ user: sessionUser, request }) {
    if (!sessionUser) {
      return badRequest("UNAUTHORIZED", "Not authenticated");
    }

    const body = await request.json();
    const data = body.data ?? body;
    const parsed = updateInstitutionSchema.safeParse(data);

    if (!parsed.success) {
      return badRequest("INVALID_INPUT", parsed.error.message);
    }

    const user = await db.query.user.findFirst({
      where: eq(usersTable.id, sessionUser.userId),
      with: { institution: true },
    });

    if (!user) {
      return badRequest("NOT_FOUND", "User not found");
    }

    if (!user.institutionId || !user.institution) {
      return badRequest(
        "NOT_INSTITUTIONAL",
        "User does not have an institution",
      );
    }

    const [updated] = await db
      .update(institution)
      .set({
        ...(parsed.data.institutionName !== undefined && {
          name: parsed.data.institutionName,
        }),
        ...(parsed.data.institutionType !== undefined && {
          type: parsed.data.institutionType as any,
        }),
        ...(parsed.data.affiliation !== undefined && {
          affiliation: parsed.data.affiliation,
        }),
        ...(parsed.data.city !== undefined && { city: parsed.data.city }),
        ...(parsed.data.sizeRange !== undefined && {
          sizeRange: parsed.data.sizeRange,
        }),
        updatedAt: serverNowIso(),
      })
      .where(eq(institution.id, user.institutionId))
      .returning();

    const updatedUser = await db.query.user.findFirst({
      where: eq(usersTable.id, sessionUser.userId),
      with: { institution: true },
    });

    return ok(updatedUser);
  },
});

export const PUT = handler;
