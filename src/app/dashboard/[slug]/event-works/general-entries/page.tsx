import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  generalEntry,
  generalEntryAward,
  generalEntryCategory,
  group as groupTable,
} from "@/core/database/schema";
import { findFestivalBySlugOrId } from "@/features/festivals/repositories/festival.repository";
import { getFestivalContext } from "@/features/festivals/services/festival-context.service";
import { GeneralEntriesClient } from "./GeneralEntriesClient";

export const metadata: Metadata = {
  title: "General Entries",
  description: "Manage general entries and points",
};

export default async function GeneralEntriesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSession();
  const context = await getFestivalContext({
    slugOrId: slug,
    userId: session?.userId ?? null,
    globalRole: session?.role ?? null,
  });

  if (!context || !["ADMIN", "OWNER", "SUPER_ADMIN"].includes(context.role)) {
    notFound();
  }

  const festival = await findFestivalBySlugOrId(slug);
  if (!festival) notFound();

  const [categories, entries, groups] = await Promise.all([
    db.query.generalEntryCategory.findMany({
      where: eq(generalEntryCategory.festivalId, festival.id),
      orderBy: [desc(generalEntryCategory.createdAt)],
    }),
    db.query.generalEntry.findMany({
      where: eq(generalEntry.festivalId, festival.id),
      with: {
        awards: true,
      },
      orderBy: [desc(generalEntry.createdAt)],
    }),
    db.query.group.findMany({
      where: eq(groupTable.festivalId, festival.id),
      columns: {
        id: true,
        name: true,
      },
    }),
  ]);

  return (
    <div className="pt-4 sm:pt-6 space-y-6">
      <GeneralEntriesClient
        festivalId={festival.id}
        categories={categories}
        entries={entries}
        groups={groups}
      />
    </div>
  );
}
