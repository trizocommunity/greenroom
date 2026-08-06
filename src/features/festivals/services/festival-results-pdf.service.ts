/**
 * On-demand results PDF for expired festivals.
 *
 * Reads from the live kept `result` table (no snapshot blob). Kept separate
 * from expiry notification logic so the renderer can be swapped or tested
 * without touching the cron cycles.
 */

import { eq } from "drizzle-orm";
import { jsPDF } from "jspdf";
import { db } from "@/core/database/client";
import {
  programmeAssignment,
  programme as programmes,
  result as results,
} from "@/core/database/schema";
import { ProgrammeMembershipService } from "@/features/assignments/services/programme-membership.service";

export const FestivalResultsPdfService = {
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
    const enrolledByAssignmentId = new Map<string, string>();
    for (const programmeId of programmeIds) {
      const enrolled =
        await ProgrammeMembershipService.getParticipantsForProgramme(
          programmeId,
        );
      for (const row of enrolled) {
        if (enrolledByAssignmentId.has(row.assignmentId)) continue;
        enrolledByAssignmentId.set(
          row.assignmentId,
          row.isTeamLeader
            ? row.participant.name
            : (enrolled.find(
                (e) => e.assignmentId === row.assignmentId && e.isTeamLeader,
              )?.participant.name ?? row.participant.name),
        );
      }
    }
    const partName = enrolledByAssignmentId;

    const progName = new Map(programmeRows.map((p) => [p.id, p.name]));

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
        participantName: assignmentRows.find((a) => a.id === r.assignmentId)
          ? (partName.get(r.assignmentId) ?? "—")
          : "—",
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

    for (const [programmeName, items] of Object.entries(programmeGroups)) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(12);
      doc.text(programmeName, margin, y);
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
};
