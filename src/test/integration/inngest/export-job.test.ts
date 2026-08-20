/**
 * Issue 47 sub-slice C — export-job Inngest function test.
 *
 * Confirms the load → generate → complete pipeline writes the
 * `completeExport` row with the expected fields.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockFestivalFindFirst = vi.fn();
const mockCompleteExport = vi.fn();

vi.mock("@/core/database/client", () => ({
  db: {
    query: {
      festival: {
        findFirst: (...args: unknown[]) => mockFestivalFindFirst(...args),
      },
    },
  },
}));

vi.mock("@/features/exports/repositories/export.repository", () => ({
  completeExport: (...args: unknown[]) => mockCompleteExport(...args),
}));

vi.mock("@/features/exports/services/generators/call-list.generator", () => ({
  generateCallList: vi.fn(),
}));
vi.mock("@/features/exports/services/generators/judge-list.generator", () => ({
  generateJudgeList: vi.fn(),
}));
vi.mock("@/features/exports/services/generators/results.generator", () => ({
  generateResults: vi.fn(),
}));
vi.mock("@/features/exports/services/generators/schedule.generator", () => ({
  generateSchedule: vi.fn(),
}));
vi.mock("@/features/exports/services/generators/team-result.generator", () => ({
  generateTeamResult: vi.fn(),
}));
vi.mock(
  "@/features/exports/services/generators/valuation-sheet.generator",
  () => ({
    generateValuationSheet: vi.fn(),
  }),
);

import { generateCallList } from "@/features/exports/services/generators/call-list.generator";
import { exportJob } from "@/inngest/functions/export-job";

function makeStep() {
  return {
    run: async (_name: string, fn: () => Promise<unknown>) => fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFestivalFindFirst.mockResolvedValue({
    name: "Fest-1",
  });
  (generateCallList as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    bytes: Buffer.from("pdf-bytes"),
    fileName: "call-list.pdf",
    mimeType: "application/pdf",
    itemCount: 7,
  });
  mockCompleteExport.mockResolvedValue({ id: "exp-1" });
});

describe("exportJob", () => {
  it("loads festival, runs the generator, and writes the export row", async () => {
    const fn = exportJob as unknown as (ctx: unknown) => Promise<unknown>;
    const result = await fn({
      event: {
        data: {
          exportId: "exp-1",
          festivalId: "fest-1",
          config: { type: "CALL_LIST" },
          format: "PDF",
        },
      },
      step: makeStep(),
    });

    expect(mockFestivalFindFirst).toHaveBeenCalledTimes(1);
    expect(generateCallList).toHaveBeenCalledTimes(1);
    expect(mockCompleteExport).toHaveBeenCalledTimes(1);

    const written = mockCompleteExport.mock.calls[0]?.[0] as {
      id: string;
      fileName: string;
      mimeType: string;
      fileSizeBytes: number;
      itemCount: number;
    };
    expect(written.id).toBe("exp-1");
    expect(written.fileName).toBe("call-list.pdf");
    expect(written.mimeType).toBe("application/pdf");
    expect(written.itemCount).toBe(7);
    expect(typeof written.fileSizeBytes).toBe("number");

    expect(result).toEqual({ ok: true, exportId: "exp-1" });
  });
});
