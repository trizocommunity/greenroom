/**
 * Festival expiration: snapshot all data for Manual Book, delete live data, set EXPIRED.
 * Festival duration is 90 days from creation. After 90 days + 7 grace = data deleted.
 *
 * Lifecycle:
 *   READY/ONGOING/PAST → pre-archival (7 days before expiresAt)
 *   pre-archival → EXPIRED → data deleted, Manual Book available for download
 */

import { eq, lt, ne } from "drizzle-orm";
import { jsPDF } from "jspdf";
import { db } from "@/core/database/client";
import {
  category as categories,
  expiredFestivalManualBook,
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

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const PRE_ARCHIVAL_DAYS = 7;

export const FestivalExpirationService = {
  /**
   * Find festivals within the pre-archival window (expiring within PRE_ARCHIVAL_DAYS).
   * These are ONGOING/PAST festivals not yet EXPIRED that are approaching expiry.
   */
  async getFestivalsApproachingExpiry(): Promise<
    { id: string; name: string; slug: string; expiresAt: string | null }[]
  > {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + PRE_ARCHIVAL_DAYS * MS_PER_DAY);
    const list = await db
      .select({
        id: festivals.id,
        name: festivals.name,
        slug: festivals.slug,
        expiresAt: festivals.expiresAt,
      })
      .from(festivals)
      .where(ne(festivals.status, "EXPIRED"))
      .orderBy(festivals.expiresAt);

    return list.filter((f) => {
      if (!f.expiresAt || !f.slug) return false;
      const expiryDate = new Date(f.expiresAt);
      return expiryDate > now && expiryDate <= windowEnd;
    });
  },

  /**
   * Pre-archive a festival before it expires.
   * Snapshots results and emits a warning lifecycle event — festival remains active.
   * Called proactively so data is preserved even if the expiry cron fails.
   */
  async preArchiveFestival(festivalId: string): Promise<void> {
    const { randomUUID } = await import("crypto");
    const festival = await db.query.festival.findFirst({
      where: eq(festivals.id, festivalId),
    });
    if (!festival || festival.status === "EXPIRED") return;

    const publishedResults = await getPublicFestivalResults(festivalId);

    await db.transaction(async (tx) => {
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

      await tx.insert(festivalLifecycleEvent).values({
        id: randomUUID(),
        festivalId,
        event: "ACTIVATED",
        metadata: {
          type: "PRE_ARCHIVAL",
          snapshotCount: publishedResults.length,
          archivedAt: new Date().toISOString(),
        },
      } as any);
    });
  },

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
   * Run expiration for one festival: snapshot all data to Manual Book, delete live data, set EXPIRED.
   */
  async expireFestival(festivalId: string): Promise<void> {
    const { randomUUID } = await import("crypto");
    const festival = await db.query.festival.findFirst({
      where: eq(festivals.id, festivalId),
    });
    if (!festival || festival.status === "EXPIRED") return;

    const [
      studentsData,
      programmesData,
      categoriesData,
      groupsData,
      stagesData,
      scheduleData,
      resultsData,
    ] = await Promise.all([
      db.query.student.findMany({ where: eq(student.festivalId, festivalId) }),
      db.query.programme.findMany({
        where: eq(programmes.festivalId, festivalId),
      }),
      db.query.category.findMany({
        where: eq(categories.festivalId, festivalId),
      }),
      db.query.group.findMany({ where: eq(groups.festivalId, festivalId) }),
      db.query.stage.findMany({ where: eq(stages.festivalId, festivalId) }),
      db.query.scheduleEntry.findMany({
        where: eq(scheduleEntry.festivalId, festivalId),
      }),
      db.query.result.findMany({ where: eq(results.festivalId, festivalId) }),
    ]);

    const publishedResults = await getPublicFestivalResults(festivalId);

    const manualBookData = {
      festival: {
        id: festival.id,
        name: festival.name,
        slug: festival.slug,
        tier: festival.tier,
        tierLabel: festival.tierLabel,
        createdAt: festival.createdAt,
        startDate: festival.startDate,
        endDate: festival.endDate,
        status: festival.status,
      },
      students: studentsData.map((s) => ({
        name: s.name,
        email: s.email,
        phone: s.phone,
        gender: s.gender,
        chestNumber: s.chestNumber,
        age: s.age,
        standard: s.standard,
        isTeamLeader: s.isTeamLeader,
      })),
      programmes: programmesData.map((p) => ({
        name: p.name,
        category: p.category,
      })),
      categories: categoriesData.map((c) => ({
        name: c.name,
        type: c.type,
      })),
      groups: groupsData.map((g) => ({
        name: g.name,
        category: g.category,
      })),
      stages: stagesData.map((s) => ({
        name: s.name,
        location: s.location,
      })),
      schedule: scheduleData.map((s) => ({
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        programme: s.programme,
        stage: s.stage,
        event: s.event,
      })),
      results: resultsData.map((r) => ({
        participantName: r.participantName,
        programme: r.programme,
        category: r.category,
        position: r.position,
        grade: r.grade,
        score: r.score,
        points: r.points,
      })),
    };

    await db.transaction(async (tx) => {
      // 1. Store Manual Book data
      await tx.insert(expiredFestivalManualBook).values({
        id: randomUUID(),
        festivalId,
        data: manualBookData as any,
      });

      // 2. Snapshot to ExpiredFestivalResult (for backward compatibility)
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

      // 3. Delete in order (respect FKs)
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

      // 4. Lifecycle event
      await tx.insert(festivalLifecycleEvent).values({
        id: randomUUID(),
        festivalId,
        event: "EXPIRED",
        metadata: {
          snapshotCount: publishedResults.length,
          manualBookArchived: true,
        },
      } as any);

      // 5. Update festival — resultPdfUrl intentionally left null so
      // on-demand PDF generation is used (avoids stale stored PDFs)
      const now = new Date();
      await tx
        .update(festivals)
        .set({
          status: "EXPIRED",
          expiredAt: now.toISOString(),
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
   * Process all festivals that are within the pre-archival window. Idempotent.
   */
  async runPreArchivalCycle(): Promise<{ processed: number }> {
    const approaching = await this.getFestivalsApproachingExpiry();
    for (const f of approaching) {
      try {
        await this.preArchiveFestival(f.id);
      } catch (err) {
        console.error(`[Pre-Archival] Failed for festival ${f.slug}:`, err);
      }
    }
    return { processed: approaching.length };
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
