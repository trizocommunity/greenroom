import { eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import { festival as festivalTable } from "@/core/database/schema";
import { serverNowMs } from "@/core/datetime/server";
import * as ExportRepo from "@/features/exports/repositories/export.repository";
import type { ExportConfig } from "@/features/exports/schemas/export-config.schema";
import { generateCallList } from "@/features/exports/services/generators/call-list.generator";
import { generateJudgeList } from "@/features/exports/services/generators/judge-list.generator";
import { generateResults } from "@/features/exports/services/generators/results.generator";
import { generateSchedule } from "@/features/exports/services/generators/schedule.generator";
import { generateTeamResult } from "@/features/exports/services/generators/team-result.generator";
import { generateValuationSheet } from "@/features/exports/services/generators/valuation-sheet.generator";
import type {
  ExportFormat,
  GeneratedExport,
} from "@/features/exports/types/export.types";
import { inngest } from "@/inngest/client";

type SerializedExport = Omit<GeneratedExport, "bytes"> & { bytes: number[] };

async function runGenerator(
  festivalId: string,
  festivalName: string,
  config: ExportConfig,
  format: ExportFormat,
): Promise<GeneratedExport> {
  switch (config.type) {
    case "TEAM_RESULT":
      return generateTeamResult(festivalId, config, format);
    case "CALL_LIST":
      return generateCallList(festivalId, config, format, festivalName);
    case "RESULTS":
      return generateResults(festivalId, config, format, festivalName);
    case "JUDGE_LIST":
      return generateJudgeList(festivalId, config, format, festivalName);
    case "VALUATION_SHEET":
      return generateValuationSheet(festivalId, config, format, festivalName);
    case "SCHEDULE":
      return generateSchedule(festivalId, config, format, festivalName);
    default:
      throw new Error(`Export type "${config.type}" is not implemented yet.`);
  }
}

/**
 * Export job queue (UC1).
 *
 * Triggered by `export.requested` events from `createAndRunExport()`.
 * Steps:
 *   1. load-festival: fetch festival name
 *   2. generate: run the generator; serialise Buffer as number[] for the
 *      step boundary (Inngest JSON-encodes step outputs)
 *   3. complete: write fileData/fileName/mimeType back to the export row
 *
 * Concurrency: 2 (avoids hammering Postgres + Cloudinary during
 * CERTIFICATE bursts). Retry: 3 attempts with exponential backoff.
 */
export const exportJob = inngest.createFunction(
  {
    id: "export-job",
    name: "Export job (PDF / CSV)",
    concurrency: { limit: 2 },
    retries: 3,
    triggers: [{ event: "export.requested" }],
  },
  async ({ event, step }) => {
    const { exportId, festivalId, config, format } = event.data as {
      exportId: string;
      festivalId: string;
      config: ExportConfig;
      format: ExportFormat;
    };

    const { festivalName } = await step.run("load-festival", async () => {
      const festivalRow = await db.query.festival.findFirst({
        where: eq(festivalTable.id, festivalId),
        columns: { name: true },
      });
      return {
        festivalName: festivalRow?.name ?? "",
      };
    });

    const startedAt = serverNowMs();
    const generatedRaw = await step.run(
      "generate",
      async (): Promise<SerializedExport> => {
        const result = await runGenerator(
          festivalId,
          festivalName,
          config,
          format,
        );
        return {
          bytes: Array.from(result.bytes),
          fileName: result.fileName,
          mimeType: result.mimeType,
          itemCount: result.itemCount,
        };
      },
    );

    // Rehydrate Buffer from the JSON-encoded step output.
    const generated: GeneratedExport = {
      bytes: Buffer.from(generatedRaw.bytes),
      fileName: generatedRaw.fileName,
      mimeType: generatedRaw.mimeType,
      itemCount: generatedRaw.itemCount,
    };

    await step.run("complete", async () => {
      await ExportRepo.completeExport({
        id: exportId,
        fileData: generated.bytes.toString("base64"),
        fileName: generated.fileName,
        mimeType: generated.mimeType,
        fileSizeBytes: generated.bytes.byteLength,
        itemCount: generated.itemCount,
        completedInMs: serverNowMs() - startedAt,
      });
    });

    return { ok: true, exportId };
  },
);
