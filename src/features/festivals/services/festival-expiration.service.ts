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
import { sendEmail } from "@/core/integrations/email/index";
import { db } from "@/core/database/client";
import {
  category as categories,
  expiredFestivalManualBook,
  expiredFestivalResult,
  festivalLifecycleEvent,
  festivalMediaImage,
  festivalMember,
  festivalNews,
  festival as festivals,
  group as groups,
  participant as participants,
  programmeAssignment,
  programme as programmes,
  result as results,
  scheduleEntry,
  stage as stages,
  user as users,
} from "@/core/database/schema";
import { isAfter, parseInstant } from "@/core/datetime";
import {
  MS,
  nowPlus,
  serverNow,
  serverNowIso,
} from "@/core/datetime/server";
import { getPublicFestivalResults } from "@/features/festivals/loaders/festival-results.loader";

const PRE_ARCHIVAL_DAYS = 7;

export const FestivalExpirationService = {
  /**
   * Find festivals within the pre-archival window (expiring within PRE_ARCHIVAL_DAYS).
   * These are ONGOING/PAST festivals not yet EXPIRED that are approaching expiry.
   */
  async getFestivalsApproachingExpiry(): Promise<
    { id: string; name: string; slug: string; expiresAt: string | null }[]
  > {
    const now = serverNow();
    const windowEnd = nowPlus(PRE_ARCHIVAL_DAYS * MS.day);
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
      const expiryDate = parseInstant(f.expiresAt);
      if (!expiryDate) return false;
      return isAfter(expiryDate, now) && !isAfter(expiryDate, windowEnd);
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
          archivedAt: serverNowIso(),
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
    const now = serverNowIso();
    const list = await db
      .select({ id: festivals.id, name: festivals.name, slug: festivals.slug })
      .from(festivals)
      .where(lt(festivals.expiresAt, now));
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
      participantsData,
      programmesData,
      categoriesData,
      groupsData,
      stagesData,
      scheduleData,
      resultsData,
    ] = await Promise.all([
      db.query.participant.findMany({
        where: eq(participants.festivalId, festivalId),
      }),
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
      festival,
      participants: participantsData,
      programmes: programmesData,
      categories: categoriesData,
      groups: groupsData,
      stages: stagesData,
      schedule: scheduleData,
      results: resultsData,
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
      await tx
        .delete(participants)
        .where(eq(participants.festivalId, festivalId));
      await tx.delete(programmes).where(eq(programmes.festivalId, festivalId));
      await tx.delete(categories).where(eq(categories.festivalId, festivalId));
      await tx.delete(groups).where(eq(groups.festivalId, festivalId));
      await tx
        .delete(festivalMediaImage)
        .where(eq(festivalMediaImage.festivalId, festivalId));
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
      const now = serverNowIso();
      await tx
        .update(festivals)
        .set({
          status: "EXPIRED",
          expiredAt: now,
          participantsCount: 0,
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

  /**
   * Send the "festival expiring soon" email to the owner of every
   * festival in the 7-day pre-archival window, once per festival.
   *
   * Idempotent — `festivalExpiringSoonEmailSentAt` is set after a
   * successful send so a cron retry (or a second cron tick in the
   * window) doesn't spam the owner.
   */
  async runFestivalExpiringSoonEmails(): Promise<{
    processed: number;
    sent: number;
    skipped: number;
  }> {
    const approaching = await this.getFestivalsApproachingExpiry();
    let sent = 0;
    let skipped = 0;

    for (const f of approaching) {
      try {
        const fresh = await db.query.festival.findFirst({
          where: eq(festivals.id, f.id),
        });
        if (!fresh || fresh.festivalExpiringSoonEmailSentAt) {
          skipped++;
          continue;
        }

        const owner = await db.query.user.findFirst({
          where: eq(users.id, fresh.ownerId),
        });
        if (!owner?.email) {
          console.warn(
            `[FestivalExpiringSoon] No owner email for festival ${f.slug}; skipping.`,
          );
          skipped++;
          continue;
        }

        if (!f.expiresAt) continue;
        const daysRemaining = Math.max(
         	1,
          Math.ceil(
            (parseInstant(f.expiresAt)!.getTime() - serverNow().getTime()) /
              MS.day,
          ),
        );

        const result = await sendEmail({
          to: owner.email,
          kind: {
            kind: "festival_expiring_soon",
            festivalName: fresh.name,
            daysRemaining,
            expiresOn: parseInstant(f.expiresAt)!.toISOString().split("T")[0] ?? "",
            dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || ""}/dashboard/${fresh.slug}`,
          },
        });

        if ("kindDisabled" in result) {
          console.info(
            `[FestivalExpiringSoon] Kind disabled; not marking festival ${f.slug}.`,
          );
          skipped++;
          continue;
        }
        if ("error" in result) {
          console.error(
            `[FestivalExpiringSoon] Email error for festival ${f.slug}:`,
            result.error,
          );
          continue;
        }

        await db
          .update(festivals)
          .set({ festivalExpiringSoonEmailSentAt: serverNowIso() })
          .where(eq(festivals.id, f.id));

        sent++;
      } catch (err) {
        console.error(
          `[FestivalExpiringSoon] Failed for festival ${f.slug}:`,
          err,
        );
      }
    }

    return { processed: approaching.length, sent, skipped };
  },
};
