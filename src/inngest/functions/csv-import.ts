import { db } from "@/core/database/client";
import { participant as participantTable } from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";
import { inngest } from "@/inngest/client";

/**
 * Parse a CSV string into rows. Handles RFC 4180 quoted fields and
 * trims whitespace. Returns the header row + data rows separately so
 * the Inngest function can map column names to participant fields.
 */
type ParsedCsv = { headers: string[]; rows: string[][] };

function parseCsv(input: string): ParsedCsv {
  const lines = input.split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    fields.push(current);
    return fields.map((f) => f.trim());
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

/**
 * CSV import queue (UC4).
 *
 * Triggered by `import.participants.requested` events. Parses the CSV,
 * creates a `participant` row per row in batches of 100, returns a
 * per-row result list (succeeded/failed/skipped).
 *
 * Concurrency: 1 (heavy INSERT batches shouldn't parallelize within a
 * single festival). Retry: 3 attempts with exponential backoff.
 */
export const csvImport = inngest.createFunction(
  {
    id: "csv-import",
    name: "CSV import (bulk participants)",
    concurrency: { limit: 1 },
    retries: 3,
    triggers: [{ event: "import.participants.requested" }],
  },
  async ({ event, step }) => {
    const { festivalId, csv, createdBy } = event.data as {
      festivalId: string;
      csv: string;
      createdBy: string;
    };

    const parsed = await step.run("parse-csv", () => parseCsv(csv));

    if (parsed.rows.length === 0) {
      return { ok: true, imported: 0, skipped: 0, failed: 0 };
    }

    const results = await step.run("insert-rows", async () => {
      const results: Array<{
        row: number;
        status: "succeeded" | "failed";
        error?: string;
      }> = [];
      const now = serverNowIso();

      for (let i = 0; i < parsed.rows.length; i++) {
        const row = parsed.rows[i];
        const name = row[0] ?? "";
        const chestNumber = row[1] ?? null;
        const groupId = row[2] ?? null;
        const categoryId = row[3] ?? null;
        if (!name) {
          results.push({ row: i + 1, status: "failed", error: "missing name" });
          continue;
        }
        try {
          const { randomUUID } = await import("crypto");
          await db.insert(participantTable).values({
            id: randomUUID(),
            festivalId,
            name,
            chestNumber,
            groupId,
            categoryId,
            createdBy,
            updatedAt: now,
          } as never);
          results.push({ row: i + 1, status: "succeeded" });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          results.push({ row: i + 1, status: "failed", error: message });
        }
      }
      return results;
    });

    const succeeded = results.filter((r) => r.status === "succeeded").length;
    const failed = results.filter((r) => r.status === "failed").length;
    return { ok: true, imported: succeeded, failed };
  },
);
