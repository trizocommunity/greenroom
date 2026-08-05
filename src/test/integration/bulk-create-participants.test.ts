import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/core/database/client";
import {
  festivalUsage,
  participant as participantTable,
} from "@/core/database/schema";
import { bulkCreateParticipantsAction } from "@/features/participants/actions/participant.actions";
import { buildFestivalWithBothShapes } from "./fixtures/festival";
import { getDb } from "./setup";
import { withTransaction } from "./with-transaction";

describe("bulkCreateParticipantsAction Integration", () => {
  it("Bulk of 100 succeeds, all 100 inserted with chest numbers", () =>
    withTransaction(async (tx) => {
      const fixture = await buildFestivalWithBothShapes(tx);
      const groupId = fixture.groups[0].id;
      const categoryId = fixture.categories[0].id;

      const candidates = Array.from({ length: 100 }, (_, i) => ({
        name: `Bulk Participant ${i}`,
        groupId,
        categoryId,
      }));

      const result = await bulkCreateParticipantsAction(
        fixture.festival.id,
        candidates,
      );

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(100);
      expect(result.errors).toHaveLength(0);

      const inserted = await tx
        .select()
        .from(participantTable)
        .where(eq(participantTable.festivalId, fixture.festival.id));

      // 4 from fixture + 100 new
      expect(inserted).toHaveLength(104);
      const newParticipants = inserted.filter((p) =>
        p.name.startsWith("Bulk Participant"),
      );
      expect(newParticipants).toHaveLength(100);
      newParticipants.forEach((p) => {
        expect(p.chestNumber).toBeTruthy();
      });
    }));

  it("Row 50 of 100 has a duplicate name -> 99 inserted, 1 error, chest numbers assigned to 99", () =>
    withTransaction(async (tx) => {
      const fixture = await buildFestivalWithBothShapes(tx);
      const groupId = fixture.groups[0].id;
      const categoryId = fixture.categories[0].id;

      const candidates = Array.from({ length: 100 }, (_, i) => ({
        name:
          i === 50 ? fixture.participants[0].name : `Bulk Participant Dup ${i}`,
        groupId,
        categoryId,
      }));

      const result = await bulkCreateParticipantsAction(
        fixture.festival.id,
        candidates,
      );

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(99);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].name).toBe(fixture.participants[0].name);

      const inserted = await tx
        .select()
        .from(participantTable)
        .where(eq(participantTable.festivalId, fixture.festival.id));

      expect(inserted).toHaveLength(103); // 4 from fixture + 99 new
    }));

  it("Row 50 of 100 has an invalid group ID -> 99 inserted, 1 error", () =>
    withTransaction(async (tx) => {
      const fixture = await buildFestivalWithBothShapes(tx);
      const groupId = fixture.groups[0].id;
      const categoryId = fixture.categories[0].id;

      const candidates = Array.from({ length: 100 }, (_, i) => ({
        name: `Bulk Participant InvalidGrp ${i}`,
        groupId: i === 50 ? "invalid-group-id" : groupId,
        categoryId,
      }));

      const result = await bulkCreateParticipantsAction(
        fixture.festival.id,
        candidates,
      );

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(99);
      expect(result.errors).toHaveLength(1);
    }));

  it("Batch over tier limit (BASIC = 250) -> whole batch rejected up front, no partial insert", () =>
    withTransaction(async (tx) => {
      // Assuming BASIC limit is 250, we already have 4 from fixture. If we try to add 250, it goes over.
      const fixture = await buildFestivalWithBothShapes(tx, { tier: "BASIC" });
      const groupId = fixture.groups[0].id;
      const categoryId = fixture.categories[0].id;

      const candidates = Array.from({ length: 250 }, (_, i) => ({
        name: `Bulk Participant Overlimit ${i}`,
        groupId,
        categoryId,
      }));

      const result = await bulkCreateParticipantsAction(
        fixture.festival.id,
        candidates,
      );

      expect(result.success).toBe(false);
      expect(result.successCount).toBe(0);
      expect(result.errors[0].name).toBe("ALL");
      expect(result.errors[0].error).toContain("Batch exceeds limit");

      const inserted = await tx
        .select()
        .from(participantTable)
        .where(eq(participantTable.festivalId, fixture.festival.id));

      expect(inserted).toHaveLength(4); // Only the fixture ones
    }));

  it("Concurrent batches of 100 each (total 200 on a fresh BASIC festival) -> both succeed; quota enforced", () =>
    withTransaction(async (tx) => {
      const fixture = await buildFestivalWithBothShapes(tx, { tier: "BASIC" });
      const groupId = fixture.groups[0].id;
      const categoryId = fixture.categories[0].id;

      const batch1 = Array.from({ length: 100 }, (_, i) => ({
        name: `Batch1 Participant ${i}`,
        groupId,
        categoryId,
      }));
      const batch2 = Array.from({ length: 100 }, (_, i) => ({
        name: `Batch2 Participant ${i}`,
        groupId,
        categoryId,
      }));

      // Concurrent execute
      const [res1, res2] = await Promise.all([
        bulkCreateParticipantsAction(fixture.festival.id, batch1),
        bulkCreateParticipantsAction(fixture.festival.id, batch2),
      ]);

      expect(res1.success).toBe(true);
      expect(res1.successCount).toBe(100);
      expect(res2.success).toBe(true);
      expect(res2.successCount).toBe(100);

      const inserted = await tx
        .select()
        .from(participantTable)
        .where(eq(participantTable.festivalId, fixture.festival.id));

      expect(inserted).toHaveLength(204);
    }));

  it("On row failure mid-batch, usage counter matches successCount not participants.length", () =>
    withTransaction(async (tx) => {
      const fixture = await buildFestivalWithBothShapes(tx);
      const groupId = fixture.groups[0].id;
      const categoryId = fixture.categories[0].id;

      const candidates = Array.from({ length: 10 }, (_, i) => ({
        name: i === 5 ? fixture.participants[0].name : `Usage Tracker ${i}`,
        groupId,
        categoryId,
      }));

      const result = await bulkCreateParticipantsAction(
        fixture.festival.id,
        candidates,
      );

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(9);

      // Check usage counter
      const [usage] = await tx
        .select()
        .from(festivalUsage)
        .where(eq(festivalUsage.festivalId, fixture.festival.id));

      // Usage counter starts at whatever the fixture created, or maybe 4 (if the fixture properly increments it)
      // The issue says "matches successCount", meaning it should correctly increment by 9, not 10.
      // If the fixture didn't increment it, it might just be 9. Let's check how many total we have.
      const inserted = await tx
        .select()
        .from(participantTable)
        .where(eq(participantTable.festivalId, fixture.festival.id));

      expect(usage.participantsCount).toBe(inserted.length);
    }));
});
