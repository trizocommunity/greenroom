import "server-only";

import { desc } from "drizzle-orm";
import { createAdminHandler, ok } from "@/api/lib";
import { db } from "@/core/database/client";
import { payment } from "@/core/database/schema";

const handler = createAdminHandler({
  async GET() {
    const payments = await db.query.payment.findMany({
      orderBy: [desc(payment.createdAt)],
      with: { user: true },
    });

    return ok(payments, "private, max-age=10");
  },
});

export const GET = handler;
