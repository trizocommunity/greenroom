import "server-only";

import { createProtectedHandler, ok } from "@/api/lib";
import { getUnusedPayment } from "@/features/billing/services/billing.service";

const handler = createProtectedHandler({
  async GET({ user }) {
    const unusedCredit = await getUnusedPayment(user!.userId);
    return ok(unusedCredit ?? null, "private, no-store");
  },
});

export const GET = handler;
