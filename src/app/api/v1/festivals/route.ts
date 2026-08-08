import "server-only";

import { eq } from "drizzle-orm";
import { createFestivalInput } from "@/api/contracts/festivals";
import { badRequest, createProtectedHandler, ok } from "@/api/lib";
import { festival as festivalsTable } from "@/core/database/schema";
import { createFestival as createFestivalAction } from "@/features/festivals/actions/festival-crud.actions";
import { findAllFestivals } from "@/features/festivals/repositories/festival.repository";

const handler = createProtectedHandler({
  async GET({ user }) {
    const where =
      user!.role === "SUPER_ADMIN"
        ? undefined
        : eq(festivalsTable.ownerId, user!.userId);

    const festivals = await findAllFestivals(where);
    return ok(festivals);
  },

  async POST({ request }) {
    const body = await request.json();
    const parsed = createFestivalInput.safeParse(body.data ?? body);

    if (!parsed.success) {
      return badRequest("INVALID_INPUT", parsed.error.message);
    }

    // paymentId travels in the URL (FestivalSetupForm is mounted at
    // `/festival-setup?paymentId=...`), not the body. The body contract
    // `createFestivalInput` predates the payment flow; the server action
    // requires paymentId, so we read it from the query here.
    const paymentId = new URL(request.url).searchParams.get("paymentId");
    if (!paymentId) {
      return badRequest("INVALID_INPUT", "paymentId query param required");
    }

    const {
      institutionType,
      name,
      slug,
      location,
      institutionName,
      timezone,
      startDate,
      endDate,
    } = parsed.data;

    if (!startDate || !endDate) {
      return badRequest("INVALID_INPUT", "startDate and endDate required");
    }

    const result = await createFestivalAction({
      paymentId,
      festivalName: name,
      festivalSlug: slug || undefined,
      institutionType:
        institutionType as (typeof festivalsTable.institutionType.enumValues)[number],
      institutionName,
      location,
      timezone,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    if (!result.success) {
      return badRequest("INVALID_INPUT", result.error ?? "create failed");
    }

    return ok(result.data);
  },
});

export const GET = handler;
export const POST = handler;
