/**
 * Festival expiration: snapshot results, delete non-retained data, set EXPIRED.
 * All plans use fixed 30-day duration; no read-only after expiry.
 */

import { eq, lt, ne } from "drizzle-orm";
import { jsPDF } from "jspdf";
import { db } from "@/core/database/client";
import {
  category as categories,
  expiredFestivalResult,
  festivalGalleryImage,
  festivalLifecycleEvent,
  festivalMember,
  festivalNews,
  festival as festivals,
  group as groups,
  programmeAssignment,
  programme as programmes,
  result as results,
  scheduleEntry,
  stage as stages,
  student as students,
} from "@/core/database/schema";
import { getPublicFestivalResults } from "@/features/festivals/loaders/festival-results.loader";

export const FestivalExpirationService = {
  /**
   * Find festivals that have passed expiresAt and are not yet EXPIRED.
   */
  async getFestivalsToExpire(): Promise<
    { id: string; name: string; slug: string }[]
  > {
    const now = new Date();
    const list = await db
      .select({ id: festivals.id, name: festivals.name, slug: festivals.slug })
      .from(festivals)
      .where(lt(festivals.expiresAt, now.toISOString()));
    return list.filter((f) => f.slug !== null) as {
      id: string;
      name: string;
      slug: string;
    }[];
  },

  /**
   * Run expiration for one festival: snapshot results, delete non-retained data, set EXPIRED.
   */
  async expireFestival(festivalId: string): Promise<void> {
    const { randomUUID } = await import("crypto");
    const festival = await db.query.festival.findFirst({
      where: eq(festivals.id, festivalId),
    });
    if (!festival || festival.status === "EXPIRED") return;

    const publishedResults = await getPublicFestivalResults(festivalId);

    await db.transaction(async (tx) => {
      // 1. Snapshot to ExpiredFestivalResult
      for (const r of publishedResults) {
        await tx.insert(expiredFestivalResult).values({
          id: randomUUID(),
          festivalId,
          programmeName: r.programName,
          categoryName: r.category ?? null,
          participantName: r.winner ?? r.team ?? "—",
          position: r.position ?? null,
          grade: r.grade ?? null,
          score: null,
          points: r.points ?? null,
        } as any);
      }

      // 2. Delete in order (respect FKs)
      await tx.delete(results).where(eq(results.festivalId, festivalId));
      await tx
        .delete(programmeAssignment)
        .where(eq(programmeAssignment.festivalId, festivalId));
      await tx
        .delete(scheduleEntry)
        .where(eq(scheduleEntry.festivalId, festivalId));
      await tx.delete(students).where(eq(students.festivalId, festivalId));
      await tx.delete(programmes).where(eq(programmes.festivalId, festivalId));
      await tx.delete(categories).where(eq(categories.festivalId, festivalId));
      await tx.delete(groups).where(eq(groups.festivalId, festivalId));
      await tx
        .delete(festivalGalleryImage)
        .where(eq(festivalGalleryImage.festivalId, festivalId));
      await tx
        .delete(festivalNews)
        .where(eq(festivalNews.festivalId, festivalId));
      await tx.delete(stages).where(eq(stages.festivalId, festivalId));
      await tx
        .delete(festivalMember)
        .where(eq(festivalMember.festivalId, festivalId));

      // 3. Lifecycle event
      await tx.insert(festivalLifecycleEvent).values({
        id: randomUUID(),
        festivalId,
        event: "EXPIRED",
        metadata: { snapshotCount: publishedResults.length },
      } as any);

      // 4. Update festival
      const now = new Date();
      await tx
        .update(festivals)
        .set({
          status: "EXPIRED",
          expiredAt: now.toISOString(),
          resultPdfUrl: null,
          studentsCount: 0,
          programmesCount: 0,
          stagesCount: 0,
          storageUsedMb: 0,
        })
        .where(eq(festivals.id, festivalId));
    });
  },

  /**
   * Generate results PDF buffer for an expired festival (from ExpiredFestivalResult).
   */
  async generateExpiredResultsPdfBuffer(
    festivalId: string,
    festivalName: string,
  ): Promise<Buffer> {
    const rows = await db.query.expiredFestivalResult.findMany({
      where: eq(expiredFestivalResult.festivalId, festivalId),
      orderBy: (t, { asc }) => [asc(t.programmeName), asc(t.position)],
    });

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 20;

    doc.setFontSize(18);
    doc.text(festivalName, margin, y);
    y += 10;
    doc.setFontSize(10);
    doc.text("Final Results (Archived)", margin, y);
    y += 12;

    const programmeGroups = rows.reduce(
      (acc, r) => {
        if (!acc[r.programmeName]) acc[r.programmeName] = [];
        acc[r.programmeName].push(r);
        return acc;
      },
      {} as Record<string, typeof rows>,
    );

    for (const [progName, items] of Object.entries(programmeGroups)) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(12);
      doc.text(progName, margin, y);
      y += 8;
      doc.setFontSize(9);
      for (const row of items) {
        const pos = row.position != null ? `${row.position}.` : "—";
        const name = row.participantName || "—";
        const grade = row.grade ?? "";
        const pts = row.points != null ? String(row.points) : "";
        doc.text(`${pos} ${name}  ${grade}  ${pts} pts`, margin + 5, y);
        y += 6;
      }
      y += 4;
    }

    return Buffer.from(doc.output("arraybuffer"));
  },

  /**
   * Process all festivals that are past expiresAt. Idempotent.
   */
  async runExpirationCycle(): Promise<{ processed: number }> {
    const toExpire = await this.getFestivalsToExpire();
    for (const f of toExpire) {
      try {
        await this.expireFestival(f.id);
      } catch (err) {
        console.error(`[Expiration] Failed for festival ${f.slug}:`, err);
      }
    }
    return { processed: toExpire.length };
  },
};
