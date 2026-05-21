import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/core/database/client";
import {
  festival as festivalTable,
  judgmentLink as judgmentLinkTable,
} from "@/core/database/schema";

export default async function JudgeTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const link = await db.query.judgmentLink.findFirst({
    where: and(
      eq(judgmentLinkTable.tokenHash, tokenHash),
      eq(judgmentLinkTable.isActive, true),
    ),
    with: {
      judgmentConfig: {
        columns: { festivalId: true },
      },
    },
  });
  if (!link) return notFound();
  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, link.judgmentConfig.festivalId),
    columns: { slug: true },
  });
  if (!festival) return notFound();
  return redirect(`/${festival.slug}/judge/${token}`);
}
