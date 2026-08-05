import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  festivalUsage,
  programme as programmeTable,
} from "@/core/database/schema";
// Note: Issue B requires implementing a bulkCreateProgrammesAction which we assume exists or will exist.
// If it doesn't exist yet, we will import it and it will fail to compile (or we can stub it if needed).
// We'll assume the action is exported from `@/features/programmes/actions/programme.actions` or similar.
import { bulkCreateProgrammesAction } from "@/features/programmes/actions/programme.actions";
import { buildFestivalWithBothShapes } from "./fixtures/festival";
import { getDb } from "./setup";
import { withTransaction } from "./with-transaction";

describe("bulkCreateProgrammesAction Integration", () => {
  it("Bulk of 50 succeeds, all 50 inserted", () =>
    withTransaction(async (tx) => {
      const fixture = await buildFestivalWithBothShapes(tx);
      const categoryId = fixture.categories[0].id;

      const candidates = Array.from({ length: 50 }, (_, i) => ({
        name: `Bulk Programme ${i}`,
        categoryId,
        type: "INDIVIDUAL" as const,
        stageType: "STAGE" as const,
      }));

      const result = await bulkCreateProgrammesAction(
        fixture.festival.id,
        candidates,
      );

      expect(result.success).toBe(true);

      const inserted = await tx
        .select()
        .from(programmeTable)
        .where(eq(programmeTable.festivalId, fixture.festival.id));

      // 2 from fixture + 50 new
      expect(inserted).toHaveLength(52);
    }));

  it(">1000 -> rejected by zod cap before any insert", () =>
    withTransaction(async (tx) => {
      const fixture = await buildFestivalWithBothShapes(tx);
      const categoryId = fixture.categories[0].id;

      const candidates = Array.from({ length: 1001 }, (_, i) => ({
        name: `Bulk Programme ${i}`,
        categoryId,
        type: "INDIVIDUAL" as const,
        stageType: "STAGE" as const,
      }));

      await expect(
        bulkCreateProgrammesAction(fixture.festival.id, candidates),
      ).rejects.toThrow();
    }));

  it("Empty array -> rejected (zod .min(1))", () =>
    withTransaction(async (tx) => {
      const fixture = await buildFestivalWithBothShapes(tx);

      await expect(
        bulkCreateProgrammesAction(fixture.festival.id, []),
      ).rejects.toThrow();
    }));

  it("Duplicate within batch (name + categoryId + type repeats) -> all-or-nothing rejects entire batch", () =>
    withTransaction(async (tx) => {
      const fixture = await buildFestivalWithBothShapes(tx);
      const categoryId = fixture.categories[0].id;

      const candidates = [
        {
          name: "Unique A",
          categoryId,
          type: "INDIVIDUAL" as const,
          stageType: "STAGE" as const,
        },
        {
          name: "Duplicate",
          categoryId,
          type: "INDIVIDUAL" as const,
          stageType: "STAGE" as const,
        },
        {
          name: "Duplicate",
          categoryId,
          type: "INDIVIDUAL" as const,
          stageType: "STAGE" as const,
        },
      ];

      // Assuming all-or-nothing implementation throws an error or returns success: false
      const result = await bulkCreateProgrammesAction(
        fixture.festival.id,
        candidates,
      ).catch((e) => e);

      // Either it threw an error, or returned { success: false }
      if (result instanceof Error) {
        expect(result).toBeInstanceOf(Error);
      } else {
        expect(result.success).toBe(false);
      }

      const inserted = await tx
        .select()
        .from(programmeTable)
        .where(eq(programmeTable.festivalId, fixture.festival.id));

      // Should be unchanged (2 from fixture)
      expect(inserted).toHaveLength(2);
    }));

  it("Usage counter consistent after success", () =>
    withTransaction(async (tx) => {
      const fixture = await buildFestivalWithBothShapes(tx);
      const categoryId = fixture.categories[0].id;

      const candidates = Array.from({ length: 10 }, (_, i) => ({
        name: `Counter Check ${i}`,
        categoryId,
        type: "INDIVIDUAL" as const,
        stageType: "STAGE" as const,
      }));

      await bulkCreateProgrammesAction(fixture.festival.id, candidates);

      const [usage] = await tx
        .select()
        .from(festivalUsage)
        .where(eq(festivalUsage.festivalId, fixture.festival.id));

      const inserted = await tx
        .select()
        .from(programmeTable)
        .where(eq(programmeTable.festivalId, fixture.festival.id));

      expect(usage.programmesCount).toBe(inserted.length);
    }));

  it("Usage counter rolled back on insert failure", () =>
    withTransaction(async (tx) => {
      const fixture = await buildFestivalWithBothShapes(tx);
      const categoryId = fixture.categories[0].id;

      const [initialUsage] = await tx
        .select()
        .from(festivalUsage)
        .where(eq(festivalUsage.festivalId, fixture.festival.id));

      const candidates = [
        {
          name: "Unique A",
          categoryId,
          type: "INDIVIDUAL" as const,
          stageType: "STAGE" as const,
        },
        {
          name: "Duplicate",
          categoryId,
          type: "INDIVIDUAL" as const,
          stageType: "STAGE" as const,
        },
        {
          name: "Duplicate",
          categoryId,
          type: "INDIVIDUAL" as const,
          stageType: "STAGE" as const,
        },
      ];

      await bulkCreateProgrammesAction(fixture.festival.id, candidates).catch(
        () => {},
      );

      const [finalUsage] = await tx
        .select()
        .from(festivalUsage)
        .where(eq(festivalUsage.festivalId, fixture.festival.id));

      expect(finalUsage.programmesCount).toBe(initialUsage.programmesCount);
    }));
});
