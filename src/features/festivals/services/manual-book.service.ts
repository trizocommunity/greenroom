import { eq, inArray } from "drizzle-orm";
import { jsPDF } from "jspdf";
import { db } from "@/core/database/client";
import {
  category as categories,
  festival as festivals,
  group as groups,
  participant as participants,
  programmeAssignment,
  programmeAssignmentMember,
  programme as programmes,
  programmeTeamLead,
  result as results,
  scheduleEntry,
  stage as stages,
} from "@/core/database/schema";
import { formatDate, parseInstant } from "@/core/datetime";
import { serverNow } from "@/core/datetime/server";

export type ManualBookFormat = "pdf" | "json" | "zip";

export type ManualBookData = {
  festival: {
    id: string;
    name: string;
    slug: string | null;
    tier: string;
    tierLabel: string;
    createdAt: string | null;
    startDate: string | null;
    endDate: string | null;
    status: string;
    expiresAt: string | null;
    expiredAt: string | null;
    archivedAt: string | null;
  };
  participants: Array<{
    name: string;
    email: string | null;
    phone: string | null;
    gender: string | null;
    chestNumber: string | null;
    dateOfBirth: string | null;
    standard: string | null;
    isTeamLeader: boolean;
  }>;
  programmes: Array<{
    name: string;
    category: string | null;
  }>;
  categories: Array<{
    name: string;
    type: string | null;
  }>;
  groups: Array<{
    name: string;
  }>;
  stages: Array<{
    name: string;
    description: string | null;
  }>;
  schedule: Array<{
    startTime: string | null;
    endTime: string | null;
    programme: string | null;
    stage: string | null;
    event: string | null;
  }>;
  results: Array<{
    participantName: string;
    programme: string | null;
    category: string | null;
    position: number | null;
    grade: string | null;
    score: number | null;
    points: number | null;
  }>;
};

/**
 * Reads from the **live** kept tables (`programme`, `participant`, `result`,
 * `group`, `category`, `stage`, `scheduleEntry`, `programmeAssignment`),
 * joined to the festival row. No snapshot blob — the EXPIRED festival row
 * is the anchor and the operational data is the source of truth.
 *
 * Returns null if the festival row doesn't exist.
 */
async function loadKeepTablesForFestival(
  festivalId: string,
): Promise<ManualBookData | null> {
  const festival = await db.query.festival.findFirst({
    where: eq(festivals.id, festivalId),
    columns: {
      id: true,
      name: true,
      slug: true,
      tier: true,
      tierLabel: true,
      createdAt: true,
      startDate: true,
      endDate: true,
      status: true,
      expiresAt: true,
      expiredAt: true,
      archivedAt: true,
    },
  });
  if (!festival) return null;

  const [
    participantsData,
    programmesData,
    categoriesData,
    groupsData,
    stagesData,
    scheduleData,
    resultsData,
    assignmentsData,
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
    db.query.programmeAssignment.findMany({
      where: eq(programmeAssignment.festivalId, festivalId),
    }),
  ]);

  // Resolve foreign keys for the printable sections.
  const categoryNameById = new Map(categoriesData.map((c) => [c.id, c.name]));
  const participantNameById = new Map(
    participantsData.map((p) => [p.id, p.name]),
  );
  const stageNameById = new Map(stagesData.map((s) => [s.id, s.name]));
  const programmeMetaById = new Map(
    programmesData.map((p) => [
      p.id,
      { name: p.name, category: categoryNameById.get(p.categoryId) ?? null },
    ]),
  );
  const programmeIdByAssignmentId = new Map(
    assignmentsData.map((a) => [a.id, a.programmeId]),
  );
  const programmeTypeByAssignmentId = new Map<string, "INDIVIDUAL" | "GROUP">(
    assignmentsData
      .map((a) => {
        const p = programmeMetaById.get(a.programmeId);
        const t = (programmesData.find((pp) => pp.id === a.programmeId)?.type ??
          null) as "INDIVIDUAL" | "GROUP" | null;
        return t ? [a.id, t] : null;
      })
      .filter(
        (entry): entry is [string, "INDIVIDUAL" | "GROUP"] => entry !== null,
      ),
  );

  const memberRows = await db
    .select({
      assignmentId: programmeAssignmentMember.assignmentId,
      participantId: programmeAssignmentMember.participantId,
      assignedAt: programmeAssignmentMember.assignedAt,
    })
    .from(programmeAssignmentMember)
    .where(
      inArray(
        programmeAssignmentMember.assignmentId,
        assignmentsData.map((a) => a.id),
      ),
    );
  const memberByAssignment = new Map<
    string,
    Array<{ participantId: string; assignedAt: string | Date }>
  >();
  for (const m of memberRows) {
    const list = memberByAssignment.get(m.assignmentId) ?? [];
    list.push({ participantId: m.participantId, assignedAt: m.assignedAt });
    memberByAssignment.set(m.assignmentId, list);
  }
  const firstMemberByAssignment = new Map<string, string>();
  for (const [aid, members] of memberByAssignment.entries()) {
    if (members.length > 0) {
      const sorted = members.slice().sort((a, b) => {
        const at = new Date(a.assignedAt).getTime();
        const bt = new Date(b.assignedAt).getTime();
        return at - bt;
      });
      firstMemberByAssignment.set(aid, sorted[0].participantId);
    }
  }

  const leadRows = await db
    .select({
      programmeId: programmeTeamLead.programmeId,
      groupId: programmeTeamLead.groupId,
      teamNumber: programmeTeamLead.teamNumber,
      participantId: programmeTeamLead.participantId,
    })
    .from(programmeTeamLead);
  const leadByTeam = new Map<string, string>();
  for (const l of leadRows) {
    leadByTeam.set(
      `${l.programmeId}:${l.groupId}:${l.teamNumber}`,
      l.participantId,
    );
  }

  const participantNameByAssignmentId = new Map<string, string>();
  for (const a of assignmentsData) {
    const type = programmeTypeByAssignmentId.get(a.id);
    if (type === "INDIVIDUAL") {
      if (a.participantId) {
        participantNameByAssignmentId.set(
          a.id,
          participantNameById.get(a.participantId) ?? "—",
        );
      } else {
        participantNameByAssignmentId.set(a.id, "—");
      }
    } else if (type === "GROUP") {
      let leadPid: string | undefined;
      if (a.groupId) {
        leadPid = leadByTeam.get(
          `${a.programmeId}:${a.groupId}:${a.teamNumber ?? 1}`,
        );
      }
      const pid = leadPid ?? firstMemberByAssignment.get(a.id);
      participantNameByAssignmentId.set(
        a.id,
        pid ? (participantNameById.get(pid) ?? "—") : "Party",
      );
    } else {
      participantNameByAssignmentId.set(a.id, "—");
    }
  }

  return {
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
      expiresAt: festival.expiresAt,
      expiredAt: festival.expiredAt,
      archivedAt: festival.archivedAt,
    },
    participants: participantsData
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => ({
        name: p.name,
        email: p.email,
        phone: p.phone,
        gender: p.gender,
        chestNumber: p.chestNumber,
        dateOfBirth: p.dateOfBirth,
        standard: p.standard,
        isTeamLeader: p.isTeamLeader,
      })),
    programmes: programmesData
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => ({
        name: p.name,
        category: categoryNameById.get(p.categoryId) ?? null,
      })),
    categories: categoriesData.map((c) => ({ name: c.name, type: c.type })),
    groups: groupsData.map((g) => ({ name: g.name })),
    stages: stagesData.map((s) => ({
      name: s.name,
      description: s.description,
    })),
    schedule: scheduleData
      .slice()
      .sort((a, b) => {
        const aT = a.startTime ? new Date(a.startTime).getTime() : 0;
        const bT = b.startTime ? new Date(b.startTime).getTime() : 0;
        return aT - bT;
      })
      .map((s) => ({
        startTime: s.startTime,
        endTime: s.endTime,
        programme: s.programmeId
          ? (programmeMetaById.get(s.programmeId)?.name ?? null)
          : null,
        stage: s.stageId ? (stageNameById.get(s.stageId) ?? null) : null,
        event: s.type,
      })),
    results: resultsData
      .slice()
      .sort((a, b) => {
        const ap = a.position ?? Number.MAX_SAFE_INTEGER;
        const bp = b.position ?? Number.MAX_SAFE_INTEGER;
        if (ap !== bp) return ap - bp;
        return (programmeMetaById.get(a.programmeId)?.name ?? "").localeCompare(
          programmeMetaById.get(b.programmeId)?.name ?? "",
        );
      })
      .map((r) => ({
        participantName:
          participantNameByAssignmentId.get(r.assignmentId) ?? "—",
        programme: programmeMetaById.get(r.programmeId)?.name ?? null,
        category: null,
        position: r.position ?? null,
        grade: r.grade ?? null,
        score: r.score ?? null,
        points: r.points ?? null,
      })),
  };
}

export const ManualBookService = {
  async getManualBookData(festivalId: string): Promise<ManualBookData | null> {
    return loadKeepTablesForFestival(festivalId);
  },

  async generateJson(data: ManualBookData): Promise<Buffer> {
    return Buffer.from(JSON.stringify(data, null, 2));
  },

  async generateZip(data: ManualBookData): Promise<Buffer> {
    const files: Record<string, string> = {
      "festival.json": JSON.stringify(data.festival, null, 2),
      "participants.json": JSON.stringify(data.participants, null, 2),
      "programmes.json": JSON.stringify(data.programmes, null, 2),
      "categories.json": JSON.stringify(data.categories, null, 2),
      "groups.json": JSON.stringify(data.groups, null, 2),
      "stages.json": JSON.stringify(data.stages, null, 2),
      "schedule.json": JSON.stringify(data.schedule, null, 2),
      "results.json": JSON.stringify(data.results, null, 2),
    };

    const content = Object.entries(files)
      .map(([filename, fileContent]) => {
        const encoder = new TextEncoder();
        const nameBytes = encoder.encode(filename);
        const contentBytes = encoder.encode(fileContent);
        const nameLen = nameBytes.length;
        const contentLen = contentBytes.length;
        const header =
          String(nameLen).padStart(4, "0") +
          String(contentLen).padStart(8, "0");
        return header + filename + "\n" + fileContent;
      })
      .join("\n---\n");

    return Buffer.from(content);
  },

  async generatePdf(data: ManualBookData): Promise<Buffer> {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 20;

    doc.setFontSize(22);
    doc.text(data.festival.name, pageW / 2, y, { align: "center" });
    y += 12;

    doc.setFontSize(10);
    const fmt = (s: string | null) =>
      s && parseInstant(s)
        ? formatDate(s, { tz: "UTC", style: "medium" })
        : "N/A";
    doc.text(
      `${data.festival.tierLabel} Plan | ${fmt(data.festival.startDate)} - ${fmt(data.festival.endDate)}`,
      pageW / 2,
      y,
      { align: "center" },
    );
    y += 8;
    doc.text("Manual Book - Festival Archive", pageW / 2, y, {
      align: "center",
    });
    y += 15;

    y = this.addSection(
      doc,
      "Participants",
      data.participants.length,
      y,
      margin,
      pageW,
    );
    if (data.programmes.length) {
      y = this.addSection(
        doc,
        "Programmes",
        data.programmes.length,
        y,
        margin,
        pageW,
      );
    }
    if (data.categories.length) {
      y = this.addSection(
        doc,
        "Categories",
        data.categories.length,
        y,
        margin,
        pageW,
      );
    }
    if (data.groups.length) {
      y = this.addSection(doc, "Groups", data.groups.length, y, margin, pageW);
    }
    if (data.stages.length) {
      y = this.addSection(doc, "Stages", data.stages.length, y, margin, pageW);
    }
    if (data.schedule.length) {
      y = this.addSection(
        doc,
        "Schedule",
        data.schedule.length,
        y,
        margin,
        pageW,
      );
    }

    if (data.results.length) {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(14);
      doc.text("Results", margin, y);
      y += 8;

      const resultsByProgramme = data.results.reduce(
        (acc, r) => {
          const key = r.programme || "Unknown";
          if (!acc[key]) acc[key] = [];
          acc[key].push(r);
          return acc;
        },
        {} as Record<string, typeof data.results>,
      );

      for (const [progName, items] of Object.entries(resultsByProgramme)) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(11);
        doc.text(progName, margin, y);
        y += 6;
        doc.setFontSize(9);
        for (const row of items.slice(0, 50)) {
          if (y > 275) {
            doc.addPage();
            y = 20;
          }
          const pos = row.position != null ? `${row.position}.` : "—";
          const name = row.participantName || "—";
          const grade = row.grade ?? "";
          const pts = row.points != null ? `${row.points} pts` : "";
          doc.text(`${pos} ${name}  ${grade}  ${pts}`, margin + 5, y);
          y += 5;
        }
        y += 4;
      }
    }

    doc.setFontSize(8);
    doc.text(
      `Generated on ${formatDate(serverNow(), { tz: "UTC", style: "medium" })}`,
      pageW / 2,
      290,
      { align: "center" },
    );

    return Buffer.from(doc.output("arraybuffer"));
  },

  addSection(
    doc: jsPDF,
    title: string,
    count: number,
    y: number,
    margin: number,
    pageW: number,
  ): number {
    if (y > 265) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(12);
    doc.text(title, margin, y);
    doc.setFontSize(9);
    doc.text(`${count} total`, pageW - margin - 20, y);
    y += 8;
    return y;
  },

  async export(
    festivalId: string,
    format: ManualBookFormat,
  ): Promise<Buffer | null> {
    const data = await this.getManualBookData(festivalId);
    if (!data) {
      return null;
    }

    switch (format) {
      case "json":
        return this.generateJson(data);
      case "zip":
        return this.generateZip(data);
      case "pdf":
        return this.generatePdf(data);
      default:
        return null;
    }
  },
};
