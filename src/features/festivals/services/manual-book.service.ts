import { eq } from "drizzle-orm";
import { jsPDF } from "jspdf";
import { db } from "@/core/database/client";
import {
  expiredFestivalManualBook,
  festival as festivals,
} from "@/core/database/schema";
import { formatDate, parseInstant } from "@/core/datetime";
import { serverNow } from "@/core/datetime/server";

export type ManualBookFormat = "pdf" | "json" | "zip";

type ManualBookData = {
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
    category: string | null;
  }>;
  stages: Array<{
    name: string;
    location: string | null;
  }>;
  schedule: Array<{
    date: string | null;
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

export const ManualBookService = {
  async getManualBookData(festivalId: string): Promise<ManualBookData | null> {
    const manualBook = await db.query.expiredFestivalManualBook.findFirst({
      where: eq(expiredFestivalManualBook.festivalId, festivalId),
    });

    if (!manualBook) {
      return null;
    }

    return manualBook.data as ManualBookData;
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
    doc.text(
      `${data.festival.tierLabel} Plan | ${data.festival.startDate ? (parseInstant(data.festival.startDate) ? formatDate(data.festival.startDate, { tz: "UTC", style: "medium" }) : "N/A") : "N/A"} - ${data.festival.endDate ? (parseInstant(data.festival.endDate) ? formatDate(data.festival.endDate, { tz: "UTC", style: "medium" }) : "N/A") : "N/A"}`,
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
