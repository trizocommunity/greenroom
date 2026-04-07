/**
 * Festival expiration: snapshot results, delete non-retained data, set EXPIRED.
 * All plans use fixed 30-day duration; no read-only after expiry.
 */

import { jsPDF } from "jspdf";
import { prisma } from "@/lib/db";
import { getPublicFestivalResults } from "@/server/loader/festivalResults";

export const FestivalExpirationService = {
  /**
   * Find festivals that have passed expiresAt and are not yet EXPIRED.
   */
  async getFestivalsToExpire(): Promise<
    { id: string; name: string; slug: string }[]
  > {
    const now = new Date();
    const list = await prisma.festival.findMany({
      where: {
        expiresAt: { lt: now },
        status: { not: "EXPIRED" },
      },
      select: { id: true, name: true, slug: true },
    });
    return list;
  },

  /**
   * Run expiration for one festival: snapshot results, delete non-retained data, set EXPIRED.
   * resultPdfUrl is left null unless storage is configured (caller can generate on-demand later).
   */
  async expireFestival(festivalId: string): Promise<void> {
    const festival = await prisma.festival.findUnique({
      where: { id: festivalId },
    });
    if (!festival || festival.status === "EXPIRED") return;

    const publishedResults = await getPublicFestivalResults(festivalId);

    await prisma.$transaction(async (tx) => {
      // 1. Snapshot to ExpiredFestivalResult
      for (const r of publishedResults) {
        await tx.expiredFestivalResult.create({
          data: {
            festivalId,
            programmeName: r.programName,
            categoryName: r.category ?? null,
            participantName: r.winner ?? r.team ?? "—",
            position: r.position ?? null,
            grade: r.grade ?? null,
            score: null,
            points: r.points ?? null,
          },
        });
      }

      // 2. Delete in order (respect FKs)
      await tx.result.deleteMany({ where: { festivalId } });
      await tx.programmeAssignment.deleteMany({ where: { festivalId } });
      await tx.scheduleEntry.deleteMany({ where: { festivalId } });
      await tx.student.deleteMany({ where: { festivalId } });
      await tx.programme.deleteMany({ where: { festivalId } });
      await tx.category.deleteMany({ where: { festivalId } });
      await tx.group.deleteMany({ where: { festivalId } });
      await tx.festivalGalleryImage.deleteMany({ where: { festivalId } });
      await tx.festivalNews.deleteMany({ where: { festivalId } });
      await tx.stage.deleteMany({ where: { festivalId } });
      await tx.festivalMember.deleteMany({ where: { festivalId } });
      await tx.supportTicket.updateMany({
        where: { festivalId },
        data: { festivalId: null },
      });

      // 3. Lifecycle event
      await tx.festivalLifecycleEvent.create({
        data: {
          festivalId,
          event: "EXPIRED",
          metadata: { snapshotCount: publishedResults.length },
        },
      });

      // 4. Update festival
      const now = new Date();
      await tx.festival.update({
        where: { id: festivalId },
        data: {
          status: "EXPIRED",
          expiredAt: now,
          resultPdfUrl: null, // Set when storage (e.g. Vercel Blob) is configured
          studentsCount: 0,
          programmesCount: 0,
          stagesCount: 0,
          storageUsedMB: 0,
        },
      });
    });
  },

  /**
   * Generate results PDF buffer for an expired festival (from ExpiredFestivalResult).
   * Used for on-demand download when resultPdfUrl is not set.
   */
  async generateExpiredResultsPdfBuffer(
    festivalId: string,
    festivalName: string,
  ): Promise<Buffer> {
    const rows = await prisma.expiredFestivalResult.findMany({
      where: { festivalId },
      orderBy: [{ programmeName: "asc" }, { position: "asc" }],
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
