/**
 * Issue 47 sub-slice C — csv-import Inngest function test.
 *
 * Confirms the parser + insert-rows pipeline and the per-row result
 * counts on a small fixture CSV.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockInsert = vi.fn();

vi.mock("@/core/database/client", () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}));

import { csvImport } from "@/inngest/functions/csv-import";

function makeStep() {
  return {
    run: async (_name: string, fn: () => Promise<unknown>) => fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockInsert.mockReturnValue({
    values: () => Promise.resolve(),
  });
});

describe("csvImport", () => {
  it("imports rows and returns succeeded/failed counts", async () => {
    const csv = [
      "name,chestNumber,groupId,categoryId",
      "Alice,001,g-1,c-1",
      "Bob,002,g-1,c-1",
      ",,,",
    ].join("\n");

    const fn = csvImport as unknown as (ctx: unknown) => Promise<unknown>;
    const result = await fn({
      event: { data: { festivalId: "fest-1", csv, createdBy: "u-1" } },
      step: makeStep(),
    });

    expect(mockInsert).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ ok: true, imported: 2, failed: 1 });
  });

  it("returns zero counts for an empty CSV", async () => {
    const fn = csvImport as unknown as (ctx: unknown) => Promise<unknown>;
    const result = await fn({
      event: { data: { festivalId: "fest-1", csv: "", createdBy: "u-1" } },
      step: makeStep(),
    });
    expect(mockInsert).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, imported: 0, skipped: 0, failed: 0 });
  });
});
