/**
 * Festival expiration: strip descriptive data, clean orphan tables, keep
 * operational tables on the festival row for the on-demand Manual Book.
 * Festival duration is 90 days from creation (see getFestivalDurationDays()).
 * After 90 days the festival is hard-expired — no read-only window.
 *
 * Lifecycle:
 *   READY/ONGOING/PAST → pre-archival (T-7 days before expiresAt)
 *   pre-archival → EXPIRED → descriptive fields nulled, orphans deleted,
 *                       operational tables retained for Manual Book regen.
 */

import { eq, inArray, lt, ne, sql } from "drizzle-orm";
import { jsPDF } from "jspdf";
import { db } from "@/core/database/client";
import {
  festivalLifecycleEvent,
  festivalPosterTemplate,
  festivalScoringAwardRule,
  festivalScoringPolicy,
  festival as festivals,
  judge,
  judgementConfig,
  judgeStageAssignment,
  participant as participants,
  pendingInvitation,
  programmeAssignment,
  programmeCodeLetter,
  programmeCodeLetterRecipient,
  programmeNotification,
  programmeReportedParticipant,
  programmeReportingSession,
  programme as programmes,
  programmeTeamLead,
  result as results,
  stageManagerAssignment,
  stagePortalCredential,
  stagePortalSession,
  user as users,
} from "@/core/database/schema";
import { isAfter, parseInstant } from "@/core/datetime";
import { MS, nowPlus, serverNow, serverNowIso } from "@/core/datetime/server";
import { sendEmail } from "@/core/integrations/email/index";
import { createAuditLog } from "@/features/auth/services/audit-log.service";
import { sendExpiryWarningEmail } from "@/features/notifications/services/expiry-notification.service";

const PRE_ARCHIVAL_DAYS = 7;

/**
 * Columns to clear on expiry. Keeps the festival row as an anchor
 * (id, ownerId, name, slug, tier, createdAt, expiresAt) plus operational
 * tables. Anything in here is non-essential for the EXPIRED view + Manual
 * Book regen, and is removed so a Relaunch can start from a clean slate.
 */
const DESCRIPTIVE_FIELDS_TO_CLEAR = {
  category: null,
  description: null,
  orgName: null,
  orgDescription: null,
  orgWebsite: null,
  orgLocation: null,
  establishedYear: null,
  founderName: null,
  founderMessage: null,
  branding: null,
  rules: null,
  structure: null,
  institutionName: null,
  institutionId: null,
  location: null,
  programmeAssignmentStartDate: null,
  programmeAssignmentDeadline: null,
  participantCreationStartDate: null,
  participantCreationDeadline: null,
  chestNumberSettings: null,
  teamStandings: null,
  publicSiteEnabled: false,
  publicDisplayMode: "programme_results",
  announcerResultsPerStandings: 10,
  announcedProgrammesSinceStandings: 0,
  scoringSystem: "SCORE_BASED",
  resultPdfUrl: null,
  startDate: null,
  endDate: null,
  festivalExpiringSoonEmailSentAt: null,
  maxResultScore: null,
  isLocked: true,
} as const;

const SYSTEM_CRON_ACTOR = {
  actorId: "system:cron",
  actorRole: "SYSTEM",
} as const;

export const FestivalExpirationService = {
  /**
   * Find festivals within the pre-archival window (expiring within PRE_ARCHIVAL_DAYS).
   */
  async getFestivalsApproachingExpiry(
    withinDays: number = PRE_ARCHIVAL_DAYS,
  ): Promise<
    { id: string; name: string; slug: string; expiresAt: string | null }[]
  > {
    const now = serverNow();
    const windowEnd = nowPlus(withinDays * MS.day);
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
   * Emits an ACTIVATED lifecycle event so the audit trail reflects that we
   * were aware of the upcoming expiry. No data is mutated at this stage.
   * (The new model keeps the live tables, so there is no snapshot to take.)
   */
  async preArchiveFestival(festivalId: string): Promise<void> {
    const { randomUUID } = await import("crypto");
    const festival = await db.query.festival.findFirst({
      where: eq(festivals.id, festivalId),
    });
    if (!festival || festival.status === "EXPIRED") return;

    await db.transaction(async (tx) => {
      await tx.insert(festivalLifecycleEvent).values({
        id: randomUUID(),
        festivalId,
        event: "ACTIVATED",
        metadata: {
          type: "PRE_ARCHIVAL",
          archivedAt: serverNowIso(),
          note: "T-7 window entered; live tables retained for Manual Book regen.",
        },
      });
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
   * Run the expiry transition for one festival:
   *   1. Idempotency guard — no-op if already EXPIRED.
   *   2. Delete every `festivalId`-keyed table NOT in the keep list
   *      (FK cascades cover child rows).
   *   3. Strip the descriptive fields on the festival row.
   *   4. Stamp `status=EXPIRED`, `expiredAt`, `archivedAt`.
   *   5. Record an EXPIRED lifecycle event + EXPIRE_FESTIVAL audit log.
   *
   * Operational tables (`programme`, `participant`, `result`, `group`,
   * `category`, `stage`, `scheduleEntry`, `programmeAssignment`,
   * `festivalMember`, `festivalNews`, `festivalMediaImage`) are kept so the
   * owner can download the Manual Book PDF on demand (regenerated from the
   * live kept tables — no snapshot blob).
   */
  async expireFestival(festivalId: string): Promise<void> {
    const { randomUUID } = await import("crypto");
    const festival = await db.query.festival.findFirst({
      where: eq(festivals.id, festivalId),
    });
    if (!festival) return;
    if (festival.status === "EXPIRED") return;

    const nowIso = serverNowIso();

    const { keptCounts } = await db.transaction(async (tx) => {
      // 1. Orphan cleanup. Delete top-level festivalId-keyed tables first;
      //    FK CASCADE deletes child rows of the parents (judgementScore,
      //    programmeCodeLetterRecipient, programmeReportedParticipant,
      //    judgementConfigJudge). programmeTeamLead is kept-table-leaved
      //    (FK → programme.id) so it is purged by subquery on programmeId.
      await tx
        .delete(judgeStageAssignment)
        .where(eq(judgeStageAssignment.festivalId, festivalId));
      await tx
        .delete(stageManagerAssignment)
        .where(eq(stageManagerAssignment.festivalId, festivalId));
      await tx
        .delete(stagePortalSession)
        .where(eq(stagePortalSession.festivalId, festivalId));
      await tx
        .delete(stagePortalCredential)
        .where(eq(stagePortalCredential.festivalId, festivalId));
      await tx
        .delete(pendingInvitation)
        .where(eq(pendingInvitation.festivalId, festivalId));
      await tx
        .delete(programmeNotification)
        .where(eq(programmeNotification.festivalId, festivalId));
      await tx
        .delete(festivalPosterTemplate)
        .where(eq(festivalPosterTemplate.festivalId, festivalId));
      await tx
        .delete(programmeCodeLetter)
        .where(eq(programmeCodeLetter.festivalId, festivalId));
      await tx
        .delete(programmeReportingSession)
        .where(eq(programmeReportingSession.festivalId, festivalId));
      await tx
        .delete(judgementConfig)
        .where(eq(judgementConfig.festivalId, festivalId));
      await tx.delete(judge).where(eq(judge.festivalId, festivalId));
      await tx
        .delete(festivalScoringAwardRule)
        .where(eq(festivalScoringAwardRule.festivalId, festivalId));
      await tx
        .delete(festivalScoringPolicy)
        .where(eq(festivalScoringPolicy.festivalId, festivalId));

      // programme_team_lead.programmeId → programme.id (cascade SET NULL is
      // configured, but we want a hard purge since the team-lead table is
      // an "orphan" per the new lifecycle policy). Delete by subquery on
      // the kept programme rows under this festival.
      const programmeIdsForFestival = tx
        .select({ id: programmes.id })
        .from(programmes)
        .where(eq(programmes.festivalId, festivalId));
      await tx
        .delete(programmeTeamLead)
        .where(inArray(programmeTeamLead.programmeId, programmeIdsForFestival));

      // Snapshot kept-table row counts for the lifecycle event.
      const [programmesCount] = await tx
        .select({ c: sql<number>`count(*)::int` })
        .from(programmes)
        .where(eq(programmes.festivalId, festivalId));
      const [participantsCount] = await tx
        .select({ c: sql<number>`count(*)::int` })
        .from(participants)
        .where(eq(participants.festivalId, festivalId));
      const [resultsCount] = await tx
        .select({ c: sql<number>`count(*)::int` })
        .from(results)
        .where(eq(results.festivalId, festivalId));
      const keptCounts = {
        programmes: programmesCount?.c ?? 0,
        participants: participantsCount?.c ?? 0,
        results: resultsCount?.c ?? 0,
      };

      // 2. Strip descriptive fields + stamp EXPIRED + archivedAt.
      await tx
        .update(festivals)
        .set({
          ...DESCRIPTIVE_FIELDS_TO_CLEAR,
          status: "EXPIRED",
          expiredAt: nowIso,
          archivedAt: nowIso,
          updatedAt: nowIso,
        })
        .where(eq(festivals.id, festivalId));

      // 3. Record the lifecycle event.
      await tx.insert(festivalLifecycleEvent).values({
        id: randomUUID(),
        festivalId,
        event: "EXPIRED",
        metadata: {
          expiredAt: nowIso,
          archivedAt: nowIso,
          keptCounts,
          policy: "ISSUE-15 §1.4",
        },
      });

      return { keptCounts };
    });

    // 4. Audit log (outside the transaction — uses its own connection).
    try {
      await createAuditLog({
        action: "EXPIRE_FESTIVAL",
        targetType: "FESTIVAL",
        targetId: festivalId,
        actor: SYSTEM_CRON_ACTOR,
        metadata: { ...keptCounts, expiredAt: nowIso },
      });
    } catch (err) {
      console.error(
        `[Expiration] Audit log insert failed for festival ${festival.slug}:`,
        err,
      );
    }
  },

  /**
   * Generate results PDF buffer for an expired festival by reading the
   * live kept `result` table (no snapshot blob). Falls back to the legacy
   * `expired_festival_result` rows if the kept table is empty and that
   * table still exists (back-compat with the pre-§1.4 model).
   */
  async generateExpiredResultsPdfBuffer(
    festivalId: string,
    festivalName: string,
  ): Promise<Buffer> {
    const liveRows = await db.query.result.findMany({
      where: eq(results.festivalId, festivalId),
    });

    const programmeIds = Array.from(
      new Set(liveRows.map((r) => r.programmeId)),
    );
    const programmeRows =
      programmeIds.length > 0
        ? await db.query.programme.findMany({
            where: (p, { inArray }) => inArray(p.id, programmeIds),
          })
        : [];
    const assignmentIds = Array.from(
      new Set(liveRows.map((r) => r.assignmentId)),
    );
    const assignmentRows =
      assignmentIds.length > 0
        ? await db.query.programmeAssignment.findMany({
            where: (a, { inArray }) => inArray(a.id, assignmentIds),
          })
        : [];
    const participantIds = Array.from(
      new Set(
        assignmentRows
          .map((a) => a.participantId)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const participantRows =
      participantIds.length > 0
        ? await db.query.participant.findMany({
            where: (p, { inArray }) => inArray(p.id, participantIds),
          })
        : [];

    const progName = new Map(programmeRows.map((p) => [p.id, p.name]));
    const partName = new Map(participantRows.map((p) => [p.id, p.name]));

    const rows = liveRows
      .slice()
      .sort((a, b) => {
        const ap = a.position ?? Number.MAX_SAFE_INTEGER;
        const bp = b.position ?? Number.MAX_SAFE_INTEGER;
        if (ap !== bp) return ap - bp;
        return (progName.get(a.programmeId) ?? "").localeCompare(
          progName.get(b.programmeId) ?? "",
        );
      })
      .map((r) => ({
        programmeName: progName.get(r.programmeId) ?? "Unknown",
        participantName:
          partName.get(
            assignmentRows.find((a) => a.id === r.assignmentId)
              ?.participantId ?? "",
          ) ?? "—",
        position: r.position ?? null,
        grade: r.grade ?? null,
        points: r.points ?? null,
      }));

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
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
   * T-7 notification cycle: idempotently emit a warning email + a lifecycle
   * event row that the in-app banner reads. Idempotency is enforced by
   * checking for an `EXPIRATION_WARNING` lifecycle event row first.
   *
   * Returns `{processed, warned, skipped}`.
   */
  async runNotificationsCycle(): Promise<{
    processed: number;
    warned: number;
    skipped: number;
  }> {
    const { randomUUID } = await import("crypto");
    const approaching = await this.getFestivalsApproachingExpiry();
    let warned = 0;
    let skipped = 0;

    for (const f of approaching) {
      try {
        const existing = await db.query.festivalLifecycleEvent.findFirst({
          where: (t, { and, eq }) =>
            and(eq(t.festivalId, f.id), eq(t.event, "EXPIRATION_WARNING")),
        });
        if (existing) {
          skipped++;
          continue;
        }

        const fresh = await db.query.festival.findFirst({
          where: eq(festivals.id, f.id),
        });
        if (!fresh || !f.expiresAt) {
          skipped++;
          continue;
        }

        const daysRemaining = Math.max(
          1,
          Math.ceil(
            (parseInstant(f.expiresAt)!.getTime() - serverNow().getTime()) /
              MS.day,
          ),
        );

        const owner = await db.query.user.findFirst({
          where: eq(users.id, fresh.ownerId),
        });

        if (owner?.email) {
          const expiresAtDate = parseInstant(f.expiresAt);
          if (expiresAtDate) {
            const emailResult = await sendExpiryWarningEmail({
              to: owner.email,
              festivalName: fresh.name,
              festivalSlug: fresh.slug ?? "",
              daysRemaining,
              expiresAt: expiresAtDate,
            });
            if (!emailResult.ok) {
              console.info(
                `[ExpirationWarning] Email not sent for festival ${f.slug} (${emailResult.reason}); still recording lifecycle event.`,
              );
            }
          }
        }

        await db.transaction(async (tx) => {
          await tx.insert(festivalLifecycleEvent).values({
            id: randomUUID(),
            festivalId: f.id,
            event: "EXPIRATION_WARNING",
            metadata: {
              daysRemaining,
              expiresAt: f.expiresAt,
              sentAt: serverNowIso(),
            },
          });
        });

        warned++;
      } catch (err) {
        console.error(
          `[ExpirationWarning] Failed for festival ${f.slug}:`,
          err,
        );
        skipped++;
      }
    }

    return { processed: approaching.length, warned, skipped };
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
            expiresOn:
              parseInstant(f.expiresAt)!.toISOString().split("T")[0] ?? "",
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
